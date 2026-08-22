const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('../models/UserModel');
const Service = require('../models/ServiceModel');
const marketplaceAnalyticsService = require('../src/modules/marketplace/marketplace.analytics.service');
const servicesService = require('../src/modules/services/services.service');
const dashboardService = require('../src/modules/dashboard/dashboard.service');
const { USER_STATUS, VENDOR_STATUS, SERVICE_STATUS } = require('../src/shared/constants');

describe('Session 4.3: Marketplace Analytics Contract & Deduplication (MKT-10)', () => {
  let mongod;
  let vendorUser;
  let otherUser;
  let testService;

  before(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
  });

  after(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Service.deleteMany({});
    marketplaceAnalyticsService.clearDeduplicationCache();

    vendorUser = await User.create({
      name: 'Ebdaa Studio',
      email: 'ebdaa@example.com',
      mobile: '+966512345678',
      role: 'vendor',
      status: USER_STATUS.ACTIVE,
      profile: {
        vendorData: {
          brandName: 'Ebdaa Studio',
          vendorStatus: VENDOR_STATUS.APPROVED,
          rating: 4.8,
          numberOfRatings: 10,
          numberOfClicks: 0,
          totalViews: 0,
        },
      },
    });

    otherUser = await User.create({
      name: 'Regular Host',
      email: 'host@example.com',
      mobile: '+966598765432',
      role: 'host',
      accountType: 'personal',
      status: USER_STATUS.ACTIVE,
    });

    testService = await Service.create({
      vendorId: vendorUser._id,
      name: 'Wedding Photography',
      category: 'mediaProduction',
      price: 2500,
      status: SERVICE_STATUS.ACTIVE,
      isPublic: true,
      viewCount: 0,
      contactCount: 0,
    });
  });

  test('service_view: increments Service.viewCount and vendor UserModel.totalViews', async () => {
    const result = await marketplaceAnalyticsService.trackEvent({
      eventType: 'service_view',
      targetType: 'service',
      targetId: testService._id.toString(),
      actorId: otherUser._id.toString(),
      actorIp: '192.168.1.1',
    });

    assert.equal(result.success, true);
    assert.equal(result.tracked, true);

    const updatedService = await Service.findById(testService._id);
    assert.equal(updatedService.viewCount, 1);

    const updatedVendor = await User.findById(vendorUser._id);
    assert.equal(updatedVendor.profile.vendorData.totalViews, 1);
  });

  test('vendor_view: increments vendor UserModel.totalViews', async () => {
    const result = await marketplaceAnalyticsService.trackEvent({
      eventType: 'vendor_view',
      targetType: 'vendor',
      targetId: vendorUser._id.toString(),
      actorId: otherUser._id.toString(),
    });

    assert.equal(result.success, true);
    assert.equal(result.tracked, true);

    const updatedVendor = await User.findById(vendorUser._id);
    assert.equal(updatedVendor.profile.vendorData.totalViews, 1);
  });

  test('contact_click: increments Service.contactCount and vendor UserModel.numberOfClicks', async () => {
    const result = await marketplaceAnalyticsService.trackEvent({
      eventType: 'contact_click',
      targetType: 'service',
      targetId: testService._id.toString(),
      contactMethod: 'whatsapp',
      actorId: otherUser._id.toString(),
    });

    assert.equal(result.success, true);
    assert.equal(result.tracked, true);

    const updatedService = await Service.findById(testService._id);
    assert.equal(updatedService.contactCount, 1);

    const updatedVendor = await User.findById(vendorUser._id);
    assert.equal(updatedVendor.profile.vendorData.numberOfClicks, 1);
  });

  test('deduplication: second hit within 1-hour window returns reason "deduplicated" without incrementing', async () => {
    const firstResult = await marketplaceAnalyticsService.trackEvent({
      eventType: 'service_view',
      targetType: 'service',
      targetId: testService._id.toString(),
      actorId: otherUser._id.toString(),
    });
    assert.equal(firstResult.tracked, true);

    const secondResult = await marketplaceAnalyticsService.trackEvent({
      eventType: 'service_view',
      targetType: 'service',
      targetId: testService._id.toString(),
      actorId: otherUser._id.toString(),
    });
    assert.equal(secondResult.tracked, false);
    assert.equal(secondResult.reason, 'deduplicated');

    const updatedService = await Service.findById(testService._id);
    assert.equal(updatedService.viewCount, 1); // Not 2
  });

  test('self_interaction: vendor viewing/clicking own service or profile is ignored', async () => {
    const result = await marketplaceAnalyticsService.trackEvent({
      eventType: 'service_view',
      targetType: 'service',
      targetId: testService._id.toString(),
      actorId: vendorUser._id.toString(), // Self!
    });

    assert.equal(result.tracked, false);
    assert.equal(result.reason, 'self_interaction');

    const updatedService = await Service.findById(testService._id);
    assert.equal(updatedService.viewCount, 0);

    const profileResult = await marketplaceAnalyticsService.trackEvent({
      eventType: 'vendor_view',
      targetType: 'vendor',
      targetId: vendorUser._id.toString(),
      actorId: vendorUser._id.toString(), // Self!
    });
    assert.equal(profileResult.tracked, false);
    assert.equal(profileResult.reason, 'self_interaction');
  });

  test('side-effect-free GET reads: getServiceById does NOT increment viewCount', async () => {
    await servicesService.getServiceById(testService._id, null, false, otherUser._id);
    await servicesService.getServiceById(testService._id, null, false, otherUser._id);

    const service = await Service.findById(testService._id);
    assert.equal(service.viewCount, 0);

    const vendor = await User.findById(vendorUser._id);
    assert.equal(vendor.profile.vendorData.totalViews, 0);
  });

  test('dashboard metrics agreement: vendor stats and admin dashboard aggregate views consistently', async () => {
    // Seed service views
    await Service.updateOne({ _id: testService._id }, { $set: { viewCount: 42 } });

    const vendorStats = await servicesService.getMyStats(vendorUser._id);
    assert.equal(vendorStats.stats.totalViews, 42);

    const adminStats = await dashboardService.getDashboardStats();
    const topVendor = adminStats.bestVendors.find((v) => v.name === 'Ebdaa Studio');
    assert.ok(topVendor);
    assert.equal(topVendor.totalViews, 42);
    assert.equal(topVendor.numberOfClicks, 42);
  });
});
