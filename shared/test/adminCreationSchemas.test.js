import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  addHostSchema,
  addModeratorSchema,
  editModeratorSchema,
} from '../src/schemas/admin.js';

describe('Admin Creation Schemas (@halaa/shared/schemas/admin)', () => {
  describe('addHostSchema', () => {
    it('accepts valid host data with Saudi phone and auto-generates undefined password if empty', () => {
      const parsed = addHostSchema.parse({
        name: 'Ahmed Al-Host',
        email: 'host@example.com',
        phoneNumber: '0501234567',
        password: '',
      });

      assert.equal(parsed.name, 'Ahmed Al-Host');
      assert.equal(parsed.email, 'host@example.com');
      assert.equal(parsed.phoneNumber, '966501234567');
      assert.equal(parsed.password, undefined);
    });

    it('accepts valid host data with explicit password >= 8 characters', () => {
      const parsed = addHostSchema.parse({
        name: 'Ahmed Al-Host',
        email: 'host@example.com',
        phoneNumber: '+966 50 123 4567',
        password: 'Password123!',
      });

      assert.equal(parsed.phoneNumber, '966501234567');
      assert.equal(parsed.password, 'Password123!');
    });

    it('rejects password shorter than 8 characters', () => {
      assert.throws(() => {
        addHostSchema.parse({
          name: 'Ahmed Al-Host',
          email: 'host@example.com',
          phoneNumber: '0501234567',
          password: 'short',
        });
      }, /8/);
    });

    it('rejects invalid phone number', () => {
      assert.throws(() => {
        addHostSchema.parse({
          name: 'Ahmed Al-Host',
          email: 'host@example.com',
          phoneNumber: '12345',
        });
      });
    });
  });

  describe('addModeratorSchema', () => {
    it('accepts valid moderator with optional password transformed to undefined if blank', () => {
      const parsed = addModeratorSchema.parse({
        name: 'Moderator Admin',
        email: 'mod@example.com',
        phoneNumber: '0501234567',
        password: '',
        role: 'moderator',
      });

      assert.equal(parsed.name, 'Moderator Admin');
      assert.equal(parsed.phoneNumber, '966501234567');
      assert.equal(parsed.password, undefined);
      assert.equal(parsed.role, 'moderator');
    });

    it('accepts valid moderator with explicit >= 8 char password', () => {
      const parsed = addModeratorSchema.parse({
        name: 'Moderator Admin',
        email: 'mod@example.com',
        phoneNumber: '0501234567',
        password: 'SecurePassword123',
        role: 'admin',
      });

      assert.equal(parsed.password, 'SecurePassword123');
    });
  });

  describe('editModeratorSchema', () => {
    it('validates and normalizes phone number on edit', () => {
      const parsed = editModeratorSchema.parse({
        name: 'Moderator Admin',
        email: 'mod@example.com',
        phoneNumber: '+966501234567',
        role: 'admin',
      });

      assert.equal(parsed.phoneNumber, '966501234567');
    });
  });
});
