const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { vendorSignupSchema } = require('../src/modules/auth/auth.validation');
const { ValidationError } = require('../src/shared/errors/errorTypes');
const User = require('../models/UserModel');

describe('Phase 1: Backend Vendor Signup Contract & Security', () => {
  const validPayload = {
    email: 'vendor.test@example.com',
    phoneNumber: '0512345678',
    password: 'Password123!',
    passwordConfirm: 'Password123!',
    preferredLanguage: 'en',
    brandName: 'Test Vendor Store',
    ownerFullName: 'Ahmed Al-Saud',
    serviceDescription: 'Providing high quality event planning and catering services in Riyadh.',
    taglineAr: 'خدمات مناسبات متميزة',
    taglineEn: 'Premium event services',
    aboutAr: 'نبذة عن المتجر والخدمات بالتفصيل',
    aboutEn: 'Detailed about section for the vendor store',
    serviceCategories: {
      eventPlanning: ['hallAndLoungeRentals', 'flowerAndDecoration'],
      foodAndBeverages: ['occasionCakes'],
    },
    location: {
      regionId: 1,
      cityId: 101,
      districtIds: [1001],
      coverageType: 'city',
    },
    socialLinks: {
      instagram: 'https://instagram.com/testvendor',
      twitter: 'https://twitter.com/testvendor',
      whatsapp: '0512345678',
      website: 'https://testvendor.com',
    },
    commercialRegistrationNumber: '1010123456',
    nationalId: '1012345678',
  };

  test('valid vendor payload passes validation', () => {
    const result = vendorSignupSchema.safeParse(validPayload);
    assert.equal(result.success, true, result.error ? JSON.stringify(result.error.issues) : '');
  });

  test('passwords with symbols are allowed; letters and digits required', () => {
    // Has letter, digit, and symbol -> should pass
    const withSymbol = { ...validPayload, password: 'MyPassword@2026#', passwordConfirm: 'MyPassword@2026#' };
    const res1 = vendorSignupSchema.safeParse(withSymbol);
    assert.equal(res1.success, true);

    // Only letters -> should fail
    const onlyLetters = { ...validPayload, password: 'OnlyLettersPassword', passwordConfirm: 'OnlyLettersPassword' };
    const res2 = vendorSignupSchema.safeParse(onlyLetters);
    assert.equal(res2.success, false);

    // Only digits -> should fail
    const onlyDigits = { ...validPayload, password: '123456789012', passwordConfirm: '123456789012' };
    const res3 = vendorSignupSchema.safeParse(onlyDigits);
    assert.equal(res3.success, false);
  });

  test('password mismatch is rejected with passwordConfirm path', () => {
    const mismatched = { ...validPayload, passwordConfirm: 'DifferentPassword123!' };
    const result = vendorSignupSchema.safeParse(mismatched);
    assert.equal(result.success, false);
    const hasConfirmIssue = result.error.issues.some((i) => i.path.includes('passwordConfirm'));
    assert.equal(hasConfirmIssue, true);
  });

  test('serviceDescription enforces 10 to 500 characters', () => {
    const tooShort = { ...validPayload, serviceDescription: 'Short' };
    const res1 = vendorSignupSchema.safeParse(tooShort);
    assert.equal(res1.success, false);

    const tooLong = { ...validPayload, serviceDescription: 'A'.repeat(501) };
    const res2 = vendorSignupSchema.safeParse(tooLong);
    assert.equal(res2.success, false);
  });

  test('brandName enforces 2 to 100 characters', () => {
    const tooShort = { ...validPayload, brandName: 'A' };
    assert.equal(vendorSignupSchema.safeParse(tooShort).success, false);

    const tooLong = { ...validPayload, brandName: 'A'.repeat(101) };
    assert.equal(vendorSignupSchema.safeParse(tooLong).success, false);
  });

  test('commercial registration number must be exactly 10 digits', () => {
    const invalidCr = { ...validPayload, commercialRegistrationNumber: '12345' };
    const result = vendorSignupSchema.safeParse(invalidCr);
    assert.equal(result.success, false);
  });

  test('national ID must be 10 digits starting with 1 or 2', () => {
    const invalidId = { ...validPayload, nationalId: '3012345678' };
    const result = vendorSignupSchema.safeParse(invalidId);
    assert.equal(result.success, false);
  });

  test('serviceCategories must contain at least one selection', () => {
    const emptyCategories = {
      ...validPayload,
      serviceCategories: { eventPlanning: [], foodAndBeverages: [] },
    };
    const result = vendorSignupSchema.safeParse(emptyCategories);
    assert.equal(result.success, false);
    const hasCategoryIssue = result.error.issues.some((i) => i.path.includes('serviceCategories'));
    assert.equal(hasCategoryIssue, true);
  });

  test('serviceCategories rejects unknown category keys', () => {
    const unknownKey = {
      ...validPayload,
      serviceCategories: { unknownCategoryName: ['someOption'] },
    };
    const result = vendorSignupSchema.safeParse(unknownKey);
    assert.equal(result.success, false);
  });

  test('socialLinks validates valid URLs and WhatsApp phone format', () => {
    const badUrl = {
      ...validPayload,
      socialLinks: { ...validPayload.socialLinks, instagram: 'not-a-valid-url' },
    };
    const res1 = vendorSignupSchema.safeParse(badUrl);
    assert.equal(res1.success, false);
    const hasInstaIssue = res1.error.issues.some((i) => i.path.join('.') === 'socialLinks.instagram');
    assert.equal(hasInstaIssue, true);

    const badWhatsApp = {
      ...validPayload,
      socialLinks: { ...validPayload.socialLinks, whatsapp: 'not-a-phone' },
    };
    const res2 = vendorSignupSchema.safeParse(badWhatsApp);
    assert.equal(res2.success, false);
    const hasWaIssue = res2.error.issues.some((i) => i.path.join('.') === 'socialLinks.whatsapp');
    assert.equal(hasWaIssue, true);
  });

  test('ValidationError generates structured fieldErrors map', () => {
    const issues = [
      { path: ['socialLinks', 'instagram'], message: 'Invalid URL', code: 'custom' },
      { path: ['phoneNumber'], message: 'Invalid phone', code: 'custom' },
    ];
    const errors = issues.map((i) => ({ field: i.path.join('.'), message: i.message, code: i.code }));
    const err = new ValidationError('Validation failed', errors);

    assert.equal(err.code, 'VALIDATION_ERROR');
    assert.deepEqual(err.fieldErrors, {
      'socialLinks.instagram': 'Invalid URL',
      phoneNumber: 'Invalid phone',
    });
  });

  test('public vendor projection strips private identity and verification documents', async () => {
    const mockVendor = new User({
      email: 'vendor.public@example.com',
      phoneNumber: '0512345678',
      name: 'Ahmed',
      role: 'vendor',
      status: 'active',
      profile: {
        vendorData: {
          brandName: 'Public Store',
          ownerFullName: 'Ahmed',
          nationalId: '1012345678',
          nationalIdImage: 'vendors/documents/temp/id.jpg',
          commercialRecordNumber: '1010123456',
          commercialRecordImage: 'vendors/documents/temp/cr.jpg',
          businessLogo: 'vendors/logos/temp/logo.jpg',
          portfolioImages: ['vendors/portfolios/temp/1.jpg'],
          pricePackages: ['vendors/packages/temp/pack.pdf'],
          profileFile: 'vendors/documents/temp/profile.pdf',
        },
      },
    });

    const publicJson = await mockVendor.toPublicJSON();
    assert.ok(publicJson.roleData, 'roleData should exist');
    assert.equal(publicJson.roleData.nationalId, undefined);
    assert.equal(publicJson.roleData.nationalIdImage, undefined);
    assert.equal(publicJson.roleData.commercialRecordNumber, undefined);
    assert.equal(publicJson.roleData.commercialRecordImage, undefined);
    assert.equal(publicJson.roleData.brandName, 'Public Store');
  });

  test('serviceCategories rejects unknown option IDs within a valid category', () => {
    const unknownOption = {
      ...validPayload,
      serviceCategories: { eventPlanning: ['totallyFakeOptionId'] },
    };
    const result = vendorSignupSchema.safeParse(unknownOption);
    assert.equal(result.success, false);
    const hasCategoryIssue = result.error.issues.some((i) => i.path.includes('serviceCategories'));
    assert.equal(hasCategoryIssue, true);
  });

  test('parseFormDataJsonFields returns ValidationError with fieldErrors on malformed JSON', () => {
    const { parseFormDataJsonFields } = require('../src/shared/middleware/validation');
    const middleware = parseFormDataJsonFields(['serviceCategories', 'socialLinks']);
    const req = {
      body: {
        serviceCategories: '{"invalid": json}',
      },
    };

    let capturedError = null;
    middleware(req, {}, (err) => {
      capturedError = err;
    });

    assert.ok(capturedError);
    assert.equal(capturedError.statusCode, 400);
    assert.equal(capturedError.code, 'VALIDATION_ERROR');
    assert.ok(capturedError.fieldErrors.serviceCategories);
  });

  test('vendorSignupFilter rejects SVG and non-allowed file types', () => {
    const { vendorSignupFilter } = require('../src/shared/utils/s3Upload');
    
    // SVG upload for logo should be rejected
    let svgRejected = false;
    vendorSignupFilter({}, { fieldname: 'businessLogo', originalname: 'logo.svg', mimetype: 'image/svg+xml' }, (err, accept) => {
      if (err || !accept) svgRejected = true;
    });
    assert.equal(svgRejected, true, 'SVG should be rejected for businessLogo');

    // PDF upload for portfolioImages should be rejected (portfolio is image-only)
    let pdfInPortfolioRejected = false;
    vendorSignupFilter({}, { fieldname: 'portfolioImages', originalname: 'doc.pdf', mimetype: 'application/pdf' }, (err, accept) => {
      if (err || !accept) pdfInPortfolioRejected = true;
    });
    assert.equal(pdfInPortfolioRejected, true, 'PDF should be rejected for portfolioImages');

    // PDF for commercialRecordImage should be accepted
    let pdfInCrAccepted = false;
    vendorSignupFilter({}, { fieldname: 'commercialRecordImage', originalname: 'cr.pdf', mimetype: 'application/pdf' }, (err, accept) => {
      if (!err && accept) pdfInCrAccepted = true;
    });
    assert.equal(pdfInCrAccepted, true, 'PDF should be accepted for commercialRecordImage');

    // JPEG for portfolioImages should be accepted
    let jpgInPortfolioAccepted = false;
    vendorSignupFilter({}, { fieldname: 'portfolioImages', originalname: 'photo.jpg', mimetype: 'image/jpeg' }, (err, accept) => {
      if (!err && accept) jpgInPortfolioAccepted = true;
    });
    assert.equal(jpgInPortfolioAccepted, true, 'JPEG should be accepted for portfolioImages');

    let docxInPriceRejected = false;
    vendorSignupFilter({}, { fieldname: 'pricePackages', originalname: 'prices.docx', mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }, (err, accept) => {
      if (err || !accept) docxInPriceRejected = true;
    });
    assert.equal(docxInPriceRejected, true, 'DOCX should be rejected for pricePackages');

    let mismatchedMimeRejected = false;
    vendorSignupFilter({}, { fieldname: 'portfolioImages', originalname: 'photo.jpg', mimetype: 'image/png' }, (err, accept) => {
      if (err || !accept) mismatchedMimeRejected = true;
    });
    assert.equal(mismatchedMimeRejected, true, 'MIME type must match the filename extension');
  });

  test('required vendor files middleware rejects incomplete multipart requests', () => {
    const { requireMultipartFiles } = require('../src/shared/middleware/validation');
    const middleware = requireMultipartFiles({
      portfolioImages: { min: 1 },
      pricePackages: { min: 1 },
      commercialRecordImage: { min: 1 },
      nationalIdImage: { min: 1 },
    });
    let capturedError = null;
    middleware({ files: { portfolioImages: [{}] } }, {}, (err) => {
      capturedError = err || null;
    });
    assert.ok(capturedError);
    assert.equal(capturedError.code, 'VALIDATION_ERROR');
    assert.deepEqual(Object.keys(capturedError.fieldErrors).sort(), [
      'commercialRecordImage',
      'nationalIdImage',
      'pricePackages',
    ]);
  });

  test('coverage type requires the matching city and district selections', () => {
    const missingCity = {
      ...validPayload,
      location: { regionId: 1, coverageType: 'city', districtIds: [] },
    };
    assert.equal(vendorSignupSchema.safeParse(missingCity).success, false);

    const missingDistricts = {
      ...validPayload,
      location: { regionId: 1, cityId: 101, coverageType: 'districts', districtIds: [] },
    };
    assert.equal(vendorSignupSchema.safeParse(missingDistricts).success, false);
  });

  test('cleanupUploadedFiles safely handles empty or non-empty file objects without throwing', async () => {
    const { cleanupUploadedFiles } = require('../src/shared/utils/s3Upload');
    await assert.doesNotReject(async () => {
      await cleanupUploadedFiles(null);
      await cleanupUploadedFiles({});
      await cleanupUploadedFiles([]);
    });
  });
});
