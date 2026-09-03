const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  createHostSchema,
  createBusinessSchema,
  createModeratorSchema,
  updateModeratorSchema,
} = require('../src/modules/admin/admin.validation');
const { normalizePhoneNumber, toE164, isValidPhone } = require('../src/shared/utils/phone');

describe('Admin Creation Validation & Phone Normalization (ADM-10, ADM-11)', () => {
  describe('Phone Normalization & E.164 parity', () => {
    it('normalizes local Saudi numbers to country code digits', () => {
      assert.equal(normalizePhoneNumber('0512345678'), '966512345678');
      assert.equal(toE164('0512345678'), '+966512345678');
      assert.equal(isValidPhone('0512345678'), true);
    });

    it('normalizes Saudi numbers with +966 prefix', () => {
      assert.equal(normalizePhoneNumber('+966512345678'), '966512345678');
      assert.equal(toE164('+966512345678'), '+966512345678');
      assert.equal(isValidPhone('+966512345678'), true);
    });

    it('corrects redundant zero in +96605 numbers', () => {
      assert.equal(normalizePhoneNumber('+9660512345678'), '966512345678');
      assert.equal(toE164('+9660512345678'), '+966512345678');
      assert.equal(isValidPhone('+9660512345678'), true);
    });

    it('normalizes Egyptian numbers', () => {
      assert.equal(normalizePhoneNumber('01012345678'), '201012345678');
      assert.equal(toE164('01012345678'), '+201012345678');
      assert.equal(isValidPhone('01012345678'), true);
    });
  });

  describe('createHostSchema validation', () => {
    it('rejects host payload containing username', () => {
      assert.throws(() => {
        createHostSchema.parse({
          name: 'Test Host',
          phoneNumber: '0512345678',
          username: 'bad_username',
        });
      });
    });

    it('validates host with empty optional password and normalizes phone', () => {
      const result = createHostSchema.parse({
        name: 'Test Host',
        phoneNumber: '0512345678',
        email: '',
        password: '',
      });

      assert.equal(result.name, 'Test Host');
      assert.equal(result.phoneNumber, '966512345678');
      assert.equal(result.password, undefined);
      assert.equal(result.email, undefined);
    });

    it('validates host with valid password >= 8 characters', () => {
      const result = createHostSchema.parse({
        name: 'Test Host',
        phoneNumber: '+966 51 234 5678',
        password: 'ValidPassword123',
      });

      assert.equal(result.phoneNumber, '966512345678');
      assert.equal(result.password, 'ValidPassword123');
    });

    it('rejects password shorter than 8 characters', () => {
      assert.throws(() => {
        createHostSchema.parse({
          name: 'Test Host',
          phoneNumber: '0512345678',
          password: 'short',
        });
      });
    });
  });

  describe('createBusinessSchema validation', () => {
    it('validates business with empty password and normalizes phone', () => {
      const result = createBusinessSchema.parse({
        name: 'Test Business Org',
        phoneNumber: '0512345678',
        email: 'biz@example.com',
        password: '',
      });

      assert.equal(result.name, 'Test Business Org');
      assert.equal(result.phoneNumber, '966512345678');
      assert.equal(result.password, undefined);
    });

    it('validates business with explicit >= 8 char password', () => {
      const result = createBusinessSchema.parse({
        name: 'Test Business Org',
        phoneNumber: '+966512345678',
        password: 'BusinessSecret123',
      });

      assert.equal(result.password, 'BusinessSecret123');
    });
  });

  describe('createModeratorSchema validation', () => {
    it('validates moderator with empty password transformed to undefined and normalizes phone', () => {
      const result = createModeratorSchema.parse({
        name: 'Test Moderator',
        email: 'mod@example.com',
        phoneNumber: '0512345678',
        password: '',
        role: 'moderator',
      });

      assert.equal(result.name, 'Test Moderator');
      assert.equal(result.phoneNumber, '966512345678');
      assert.equal(result.password, undefined);
    });

    it('validates moderator with explicit >= 8 char password', () => {
      const result = createModeratorSchema.parse({
        name: 'Test Moderator',
        email: 'mod@example.com',
        phoneNumber: '+966512345678',
        password: 'ModeratorPassword88',
        role: 'admin',
      });

      assert.equal(result.password, 'ModeratorPassword88');
    });

    it('rejects moderator password shorter than 8 characters', () => {
      assert.throws(() => {
        createModeratorSchema.parse({
          name: 'Test Moderator',
          email: 'mod@example.com',
          phoneNumber: '0512345678',
          password: '123456', // 6 chars was previous bug; must be min 8
        });
      });
    });
  });

  describe('updateModeratorSchema validation', () => {
    it('transforms empty optional fields to undefined on update', () => {
      const result = updateModeratorSchema.parse({
        name: 'Updated Name',
        email: '',
        phoneNumber: '',
      });

      assert.equal(result.name, 'Updated Name');
      assert.equal(result.email, undefined);
      assert.equal(result.phoneNumber, undefined);
    });
  });
});
