const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  createServiceSchema,
  updateServiceSchema,
} = require('../src/modules/services/services.validation');

describe('Backend Services Form Contract (MKT-03, MKT-04, MKT-06)', () => {
  test('createServiceSchema validates name boundaries, optional Arabic fields, and price >= 0', () => {
    // Valid service payload
    const valid = createServiceSchema.safeParse({
      name: 'Event Lighting & FX',
      nameAr: 'إضاءة ومؤثرات خاصة',
      category: 'soundLightingEntertainment',
      description: 'Full stage lighting with laser and smoke machine.',
      descriptionAr: 'إضاءة مسرح كاملة مع ليزر وجهاز دخان.',
      price: 2500,
      duration: '4 hours',
      tags: ['weddings', 'corporate'],
      included: ['Setup', 'Technician on-site'],
      serviceLocation: {
        regionId: 1,
        regionNameAr: 'منطقة الرياض',
        regionNameEn: 'Riyadh Region',
        cityId: 101,
        cityNameAr: 'الرياض',
        cityNameEn: 'Riyadh',
        districtIds: [1001, 1002],
        coverageType: 'districts',
      },
    });
    assert.equal(valid.success, true);

    // Price 0 is valid (free consultation)
    const freeService = createServiceSchema.safeParse({
      name: 'Free Venue Tour',
      category: 'hallsAndVenues',
      description: 'Complimentary walk-through of the banquet halls.',
      price: 0,
    });
    assert.equal(freeService.success, true);

    // Negative price is rejected
    const negativePrice = createServiceSchema.safeParse({
      name: 'Invalid Price',
      category: 'hallsAndVenues',
      description: 'Should fail due to negative price.',
      price: -100,
    });
    assert.equal(negativePrice.success, false);

    // Name > 200 is rejected
    const longName = createServiceSchema.safeParse({
      name: 'N'.repeat(201),
      category: 'eventPlanning',
      description: 'Valid description.',
      price: 100,
    });
    assert.equal(longName.success, false);

    // Description > 2000 is rejected
    const longDesc = createServiceSchema.safeParse({
      name: 'Valid Name',
      category: 'eventPlanning',
      description: 'D'.repeat(2001),
      price: 100,
    });
    assert.equal(longDesc.success, false);
  });

  test('updateServiceSchema allows clearing optional Arabic fields and duration with empty strings', () => {
    const clearFields = updateServiceSchema.safeParse({
      name: 'Updated Service Title',
      nameAr: '',
      description: 'Updated English description only.',
      descriptionAr: '',
      duration: '',
    });

    assert.equal(clearFields.success, true, 'updateServiceSchema must accept empty strings for clearable fields');
    assert.equal(clearFields.data.nameAr, '');
    assert.equal(clearFields.data.descriptionAr, '');
    assert.equal(clearFields.data.duration, '');
  });

  test('serviceLocationSchema validates administrative area selection', () => {
    const validLocation = updateServiceSchema.safeParse({
      serviceLocation: {
        regionId: 3,
        regionNameAr: 'منطقة مكة المكرمة',
        regionNameEn: 'Makkah Region',
        cityId: 301,
        cityNameAr: 'جدة',
        cityNameEn: 'Jeddah',
        districtIds: [3001],
        districtNames: [{ nameAr: 'حي الشاطئ', nameEn: 'Al-Shati' }],
        coverageType: 'districts',
      },
    });

    assert.equal(validLocation.success, true);
    assert.equal(validLocation.data.serviceLocation.regionId, 3);
    assert.equal(validLocation.data.serviceLocation.cityId, 301);
    assert.deepEqual(validLocation.data.serviceLocation.districtIds, [3001]);
  });
});
