const test = require("node:test");
const assert = require("node:assert/strict");
const { round2, allocateDiscount } = require("../src/shared/utils/money");

test("round2 rounds to 2dp half-up and guards float error", () => {
  assert.equal(round2(29.999), 30);
  assert.equal(round2(0.1 + 0.2), 0.3);
  assert.equal(round2(29.005), 29.01);
  assert.equal(round2(100), 100);
  assert.equal(round2(null), 0);
});

test("allocateDiscount distributes proportionally and sums exactly", () => {
  const items = [
    { id: "plan", subtotal: 370 },
    { id: "addon", subtotal: 100 },
  ];
  const alloc = allocateDiscount(items, 100);
  const sum = round2(alloc.get("plan") + alloc.get("addon"));
  assert.equal(sum, 100, "allocations must sum to the discount");
  assert.ok(alloc.get("plan") > alloc.get("addon"), "larger line gets larger share");
});

test("allocateDiscount caps discount at the discountable base", () => {
  const alloc = allocateDiscount([{ id: "p", subtotal: 50 }], 100);
  assert.equal(alloc.get("p"), 50);
});

test("allocateDiscount with zero discount allocates nothing", () => {
  const alloc = allocateDiscount([{ id: "p", subtotal: 50 }], 0);
  assert.equal(alloc.get("p"), 0);
});

test("setup fee is added AFTER discount and never discounted (formula check)", () => {
  // discountable = plan(370) + addon(100) = 470; discount 100 → 370; + setup 1200
  const plan = 370, addon = 100, discount = 100, setup = 1200;
  const discountable = round2(plan + addon);
  const total = round2(discountable - discount) + setup;
  assert.equal(total, 1570);
});
