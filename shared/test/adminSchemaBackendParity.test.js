import { test } from "node:test";
import assert from "node:assert/strict";

/**
 * Client/backend validation parity for the admin dashboard forms.
 *
 * The client schemas must never be LOOSER than the backend ones: a payload the
 * client accepts but the backend rejects surfaces to the admin as a generic
 * "check the entered data" toast with no indication of which field is wrong.
 * (Client being stricter is fine — it just means the form catches it earlier.)
 *
 * These cases were all real mismatches found auditing the admin dashboard.
 */

const load = () => import("../src/schemas/admin.js");

/** Field bounds the backend enforces, from halaa-backend admin.validation.js. */
const BACKEND = {
  nameMin: 2,
  nameMax: 100,
  passwordMin: 8,
  passwordMax: 128,
};

const rejects = (schema, payload) => schema.safeParse(payload).success === false;
const accepts = (schema, payload) => schema.safeParse(payload).success === true;

test("admin schemas: name shorter than the backend minimum is rejected client-side", async () => {
  const { addHostSchema, addModeratorSchema, editModeratorSchema } = await load();
  const short = "A".repeat(BACKEND.nameMin - 1);
  const ok = "A".repeat(BACKEND.nameMin);

  const host = (name) => ({ name, email: "a@b.com", phoneNumber: "0512345678" });
  assert.ok(rejects(addHostSchema, host(short)), "addHostSchema must reject a 1-char name");
  assert.ok(accepts(addHostSchema, host(ok)));

  const mod = (name) => ({
    name,
    email: "a@b.com",
    phoneNumber: "0512345678",
    role: "moderator",
  });
  assert.ok(rejects(addModeratorSchema, mod(short)));
  assert.ok(accepts(addModeratorSchema, mod(ok)));
  assert.ok(rejects(editModeratorSchema, mod(short)));
  assert.ok(accepts(editModeratorSchema, mod(ok)));
});

test("admin schemas: name longer than the backend maximum is rejected client-side", async () => {
  const { addHostSchema } = await load();
  const tooLong = "A".repeat(BACKEND.nameMax + 1);
  assert.ok(
    rejects(addHostSchema, { name: tooLong, email: "a@b.com", phoneNumber: "0512345678" })
  );
});

test("admin schemas: an invalid phone never reaches the backend", async () => {
  const { addHostSchema } = await load();
  // 8 digits: a Saudi local part is 9 (5XXXXXXXX). This is the shape that
  // originally surfaced as an opaque 400.
  for (const bad of ["51234567", "abcdefghi", "0"]) {
    assert.ok(
      rejects(addHostSchema, { name: "Raya", email: "a@b.com", phoneNumber: bad }),
      `phone "${bad}" must be rejected client-side`
    );
  }
  assert.ok(
    accepts(addHostSchema, { name: "Raya", email: "a@b.com", phoneNumber: "0512345678" })
  );
});

test("admin schemas: password bounds match the backend when one is supplied", async () => {
  const { addHostSchema } = await load();
  const base = { name: "Raya", email: "a@b.com", phoneNumber: "0512345678" };
  assert.ok(rejects(addHostSchema, { ...base, password: "a".repeat(BACKEND.passwordMin - 1) }));
  assert.ok(accepts(addHostSchema, { ...base, password: "a".repeat(BACKEND.passwordMin) }));
  assert.ok(rejects(addHostSchema, { ...base, password: "a".repeat(BACKEND.passwordMax + 1) }));
  // Blank stays allowed: the backend generates one.
  assert.ok(accepts(addHostSchema, { ...base, password: "" }));
});

test("admin schemas: integer-only numeric fields reject floats", async () => {
  const { discountSchema, categoryFormSchema } = await load();

  // Backend createDiscountSchema: maxUses is z.number().int()
  const discount = (maxUses) => ({
    code: "SAVE10",
    discountType: "fixed",
    value: 10,
    maxUses,
    minimumAmount: 0,
    isActive: true,
  });
  assert.ok(rejects(discountSchema, discount(2.5)), "maxUses must reject a float");
  assert.ok(accepts(discountSchema, discount(2)));

  // Backend createCategorySchema: sortOrder is z.number().int().nonnegative()
  const category = (sortOrder) => ({
    code: "weddings",
    nameEn: "Weddings",
    nameAr: "أفراح",
    sortOrder,
  });
  assert.ok(rejects(categoryFormSchema, category(1.5)), "sortOrder must reject a float");
  assert.ok(accepts(categoryFormSchema, category(1)));
});

test("admin schemas: vendor rating stays within the backend 0..5 range", async () => {
  const { vendorRatingSchema } = await load();
  // Client is deliberately stricter (min 1 — you cannot submit zero stars).
  assert.ok(accepts(vendorRatingSchema, { rating: 5 }));
  assert.ok(rejects(vendorRatingSchema, { rating: 6 }), "must not exceed the backend max");
});
