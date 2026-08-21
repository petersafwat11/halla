/**
 * Integration test suite for Vendor Marketplace Queries and Index Aggregations (MKT-01, MKT-02)
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const memoryDb = require("./helpers/memoryDb");
const User = require("../models/UserModel");
const Service = require("../models/ServiceModel");
const Block = require("../models/BlockModel");
const vendorsService = require("../src/modules/vendors/vendors.service");
const { USER_STATUS, VENDOR_STATUS, SERVICE_STATUS } = require("../src/shared/constants");

test.before(async () => {
  await memoryDb.start();
});

test.after(async () => {
  await memoryDb.stop();
});

test.beforeEach(async () => {
  await memoryDb.clearAll();
});

test("MKT-01: Multi-district OR filtering returns vendors in any selected district without dropping selections", async () => {
  const v1 = await User.create({
    name: "Vendor District 101",
    email: "v101@test.com",
    role: "vendor",
    status: USER_STATUS.ACTIVE,
    profile: {
      vendorData: {
        brandName: "Brand 101",
        vendorStatus: VENDOR_STATUS.APPROVED,
        serviceLocation: {
          regionId: 1,
          cityId: 10,
          districtIds: [101],
        },
      },
    },
  });

  const v2 = await User.create({
    name: "Vendor District 102",
    email: "v102@test.com",
    role: "vendor",
    status: USER_STATUS.ACTIVE,
    profile: {
      vendorData: {
        brandName: "Brand 102",
        vendorStatus: VENDOR_STATUS.APPROVED,
        serviceLocation: {
          regionId: 1,
          cityId: 10,
          districtIds: [102],
        },
      },
    },
  });

  const v3 = await User.create({
    name: "Vendor District 103",
    email: "v103@test.com",
    role: "vendor",
    status: USER_STATUS.ACTIVE,
    profile: {
      vendorData: {
        brandName: "Brand 103",
        vendorStatus: VENDOR_STATUS.APPROVED,
        serviceLocation: {
          regionId: 1,
          cityId: 10,
          districtIds: [103],
        },
      },
    },
  });

  // Query districtIds as CSV string "101,102"
  const resCsv = await vendorsService.getPublicVendors({
    districtIds: "101,102",
  });

  assert.equal(resCsv.pagination.total, 2);
  const idsCsv = resCsv.data.map((d) => d.id);
  assert.ok(idsCsv.includes(String(v1._id)));
  assert.ok(idsCsv.includes(String(v2._id)));
  assert.ok(!idsCsv.includes(String(v3._id)));

  // Query districtIds as Array [101, 103]
  const resArr = await vendorsService.getPublicVendors({
    districtIds: [101, 103],
  });
  assert.equal(resArr.pagination.total, 2);
  const idsArr = resArr.data.map((d) => d.id);
  assert.ok(idsArr.includes(String(v1._id)));
  assert.ok(idsArr.includes(String(v3._id)));
  assert.ok(!idsArr.includes(String(v2._id)));

  // Backward compatibility: singular districtId: "103"
  const resSingular = await vendorsService.getPublicVendors({
    districtId: "103",
  });
  assert.equal(resSingular.pagination.total, 1);
  assert.equal(resSingular.data[0].id, String(v3._id));
});

test("MKT-02: Indexed MongoDB aggregation with $facet, pagination, and deterministic sort", async () => {
  // Create 5 approved vendors with varying ratings and creation times
  for (let i = 1; i <= 5; i++) {
    const v = await User.create({
      name: `Vendor ${i}`,
      email: `vendor${i}@test.com`,
      role: "vendor",
      status: USER_STATUS.ACTIVE,
      profile: {
        vendorData: {
          brandName: `Top Vendor ${i}`,
          vendorStatus: VENDOR_STATUS.APPROVED,
          rating: i >= 4 ? 5 : 4,
          serviceLocation: { regionId: 1, cityId: 1 },
        },
      },
    });

    // Create 1 active service for each vendor
    await Service.create({
      vendorId: v._id,
      name: `Service for Vendor ${i}`,
      category: "eventPlanning",
      price: i * 100,
      status: SERVICE_STATUS.ACTIVE,
      isPublic: true,
    });
  }

  // Page 1 with limit 2
  const page1 = await vendorsService.getPublicVendors({}, { page: 1, limit: 2 });
  assert.equal(page1.pagination.total, 5);
  assert.equal(page1.pagination.page, 1);
  assert.equal(page1.pagination.limit, 2);
  assert.equal(page1.pagination.pages, 3);
  assert.equal(page1.data.length, 2);

  // Page 2 with limit 2
  const page2 = await vendorsService.getPublicVendors({}, { page: 2, limit: 2 });
  assert.equal(page2.pagination.total, 5);
  assert.equal(page2.pagination.page, 2);
  assert.equal(page2.data.length, 2);

  // Assert no item overlap between page 1 and page 2 (stable deterministic pagination)
  const page1Ids = page1.data.map((d) => d.id);
  const page2Ids = page2.data.map((d) => d.id);
  for (const id of page1Ids) {
    assert.ok(!page2Ids.includes(id), `Duplicate ID ${id} across paginated pages`);
  }

  // Verify startingPrice is derived correctly from aggregation lookup
  assert.ok(page1.data[0].startingPrice !== null);
  assert.ok(Number.isFinite(page1.data[0].startingPrice.amount));
});

test("Moderation blocking: Blocked vendors are excluded from marketplace results", async () => {
  const viewerId = new mongoose.Types.ObjectId();
  const v1 = await User.create({
    name: "Blocked Vendor",
    email: "blocked@test.com",
    role: "vendor",
    status: USER_STATUS.ACTIVE,
    profile: {
      vendorData: {
        brandName: "Blocked Brand",
        vendorStatus: VENDOR_STATUS.APPROVED,
      },
    },
  });

  const v2 = await User.create({
    name: "Allowed Vendor",
    email: "allowed@test.com",
    role: "vendor",
    status: USER_STATUS.ACTIVE,
    profile: {
      vendorData: {
        brandName: "Allowed Brand",
        vendorStatus: VENDOR_STATUS.APPROVED,
      },
    },
  });

  // Viewer blocks v1
  await Block.create({
    blockerId: viewerId,
    blockerType: "user",
    blockedActorId: v1._id,
    blockedActorType: "user",
  });

  const res = await vendorsService.getPublicVendors({}, { viewerId });
  assert.equal(res.pagination.total, 1);
  assert.equal(res.data[0].id, String(v2._id));
});

test("Status invariants: Pending, rejected, inactive, and soft-deleted vendors are excluded", async () => {
  await User.create({
    name: "Pending Vendor",
    email: "pending@test.com",
    role: "vendor",
    status: USER_STATUS.ACTIVE,
    profile: { vendorData: { vendorStatus: VENDOR_STATUS.PENDING } },
  });

  await User.create({
    name: "Rejected Vendor",
    email: "rejected@test.com",
    role: "vendor",
    status: USER_STATUS.ACTIVE,
    profile: { vendorData: { vendorStatus: VENDOR_STATUS.REJECTED } },
  });

  await User.create({
    name: "Inactive Vendor",
    email: "inactive@test.com",
    role: "vendor",
    status: USER_STATUS.INACTIVE,
    profile: { vendorData: { vendorStatus: VENDOR_STATUS.APPROVED } },
  });

  await User.create({
    name: "Deleted Vendor",
    email: "deleted@test.com",
    role: "vendor",
    status: USER_STATUS.ACTIVE,
    deletedAt: new Date(),
    profile: { vendorData: { vendorStatus: VENDOR_STATUS.APPROVED } },
  });

  const approved = await User.create({
    name: "Active Approved Vendor",
    email: "approved@test.com",
    role: "vendor",
    status: USER_STATUS.ACTIVE,
    profile: { vendorData: { vendorStatus: VENDOR_STATUS.APPROVED } },
  });

  const res = await vendorsService.getPublicVendors({});
  assert.equal(res.pagination.total, 1);
  assert.equal(res.data[0].id, String(approved._id));
});

test("Price bounds filter matches vendors through active public services", async () => {
  const vCheap = await User.create({
    name: "Cheap Vendor",
    email: "cheap@test.com",
    role: "vendor",
    status: USER_STATUS.ACTIVE,
    profile: { vendorData: { vendorStatus: VENDOR_STATUS.APPROVED } },
  });
  await Service.create({
    vendorId: vCheap._id,
    name: "Cheap Service",
    category: "foodAndBeverages",
    price: 50,
    status: SERVICE_STATUS.ACTIVE,
    isPublic: true,
  });

  const vExpensive = await User.create({
    name: "Expensive Vendor",
    email: "expensive@test.com",
    role: "vendor",
    status: USER_STATUS.ACTIVE,
    profile: { vendorData: { vendorStatus: VENDOR_STATUS.APPROVED } },
  });
  await Service.create({
    vendorId: vExpensive._id,
    name: "Expensive Service",
    category: "foodAndBeverages",
    price: 500,
    status: SERVICE_STATUS.ACTIVE,
    isPublic: true,
  });

  const resMin = await vendorsService.getPublicVendors({ minPrice: "200" });
  assert.equal(resMin.pagination.total, 1);
  assert.equal(resMin.data[0].id, String(vExpensive._id));

  const resMax = await vendorsService.getPublicVendors({ maxPrice: "100" });
  assert.equal(resMax.pagination.total, 1);
  assert.equal(resMax.data[0].id, String(vCheap._id));
});

test("Compound indexes exist on UserModel and ServiceModel", async () => {
  await User.syncIndexes();
  await Service.syncIndexes();
  const userIndexes = await User.collection.getIndexes();

  const hasRatingIndex = Object.keys(userIndexes).some(
    (name) => name.includes("role") && name.includes("vendorData.rating")
  );
  assert.ok(hasRatingIndex, "UserModel must have compound rating index for marketplace");

  const hasDistrictIndex = Object.keys(userIndexes).some(
    (name) => name.includes("role") && name.includes("districtIds")
  );
  assert.ok(hasDistrictIndex, "UserModel must have compound districtIds index for marketplace");

  const serviceIndexes = await Service.collection.getIndexes();
  const hasServicePriceIndex = Object.keys(serviceIndexes).some(
    (name) => name.includes("status") && name.includes("price")
  );
  assert.ok(hasServicePriceIndex, "ServiceModel must have compound status/price index");
});

