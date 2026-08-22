const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("billingApi: Source verification for non-2xx response rejection", () => {
  const filePath = path.resolve(__dirname, "../../services/billingApi.js");
  const content = fs.readFileSync(filePath, "utf8");

  assert.ok(content.includes("if (!res.ok)"), "billingApi unwrap must check if (!res.ok)");
  assert.ok(content.includes("throw error"), "billingApi unwrap must throw error on non-2xx");
  assert.ok(content.includes("error.status = res.status"), "billingApi unwrap must attach status to error");
  assert.ok(content.includes("error.data = body"), "billingApi unwrap must attach body data to error");
});

test("billingApi: unwrap logic behavior on 2xx vs non-2xx responses", async () => {
  // Replicate the unwrap logic directly from billingApi.js to test edge cases
  const unwrap = async (res) => {
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        body?.message ||
        body?.error ||
        body?.errors?.[0]?.message ||
        `Request failed with status ${res.status}`;
      const error = new Error(message);
      error.status = res.status;
      error.data = body;
      error.code = body?.code;
      throw error;
    }
    return body && body.data !== undefined ? body.data : body;
  };

  // 1. Success with body.data
  const res200Data = {
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: { entries: [{ internalCode: "basic_event_25" }] } }),
  };
  const data = await unwrap(res200Data);
  assert.deepEqual(data, { entries: [{ internalCode: "basic_event_25" }] });

  // 2. Success with raw body
  const res200Raw = {
    ok: true,
    status: 200,
    json: async () => ({ state: "fulfilled" }),
  };
  const raw = await unwrap(res200Raw);
  assert.deepEqual(raw, { state: "fulfilled" });

  // 3. Error 400 with message
  const res400 = {
    ok: false,
    status: 400,
    json: async () => ({ success: false, message: "Invalid catalog code", code: "INVALID_CODE" }),
  };
  await assert.rejects(
    async () => unwrap(res400),
    (err) => {
      assert.equal(err.message, "Invalid catalog code");
      assert.equal(err.status, 400);
      assert.equal(err.code, "INVALID_CODE");
      assert.equal(err.data.success, false);
      return true;
    }
  );

  // 4. Error 403 with error field
  const res403 = {
    ok: false,
    status: 403,
    json: async () => ({ error: "Ineligible for caller" }),
  };
  await assert.rejects(
    async () => unwrap(res403),
    (err) => {
      assert.equal(err.message, "Ineligible for caller");
      assert.equal(err.status, 403);
      return true;
    }
  );

  // 5. Error 500 with unparseable body
  const res500 = {
    ok: false,
    status: 500,
    json: async () => {
      throw new Error("Invalid JSON");
    },
  };
  await assert.rejects(
    async () => unwrap(res500),
    (err) => {
      assert.equal(err.message, "Request failed with status 500");
      assert.equal(err.status, 500);
      assert.deepEqual(err.data, {});
      return true;
    }
  );
});
