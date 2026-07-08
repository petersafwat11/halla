const test = require("node:test");
const assert = require("node:assert/strict");
const {
  personalHostFilter,
  businessHostFilter,
  allCustomerHostsFilter,
} = require("../src/shared/utils/accountScope");

test("personalHostFilter requires accountType personal (fail-closed)", () => {
  const f = personalHostFilter();
  assert.equal(f.role, "host");
  assert.equal(f.accountType, "personal");
});

test("businessHostFilter requires accountType business", () => {
  const f = businessHostFilter({ status: "active" });
  assert.equal(f.role, "host");
  assert.equal(f.accountType, "business");
  assert.equal(f.status, "active");
});

test("allCustomerHostsFilter spans both (no accountType clause)", () => {
  const f = allCustomerHostsFilter();
  assert.equal(f.role, "host");
  assert.equal(f.accountType, undefined, "must NOT constrain accountType");
});

test("null accountType is excluded by both segregated filters", () => {
  // A {role:host, accountType:null} doc matches neither personal nor business
  // filter — the fail-closed guarantee.
  assert.notEqual(personalHostFilter().accountType, null);
  assert.notEqual(businessHostFilter().accountType, null);
});
