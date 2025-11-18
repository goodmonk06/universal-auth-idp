import { describe, it, expect } from 'vitest';
import {
  generateSlug,
  isValidEmail,
  generateRandomString,
  maskEmail,
  validateRedirectUri,
  parseExpiration,
} from './index';

describe('Utils', () => {
  describe('generateSlug', () => {
    it('should convert text to lowercase slug', () => {
      expect(generateSlug('Hello World')).toBe('hello-world');
    });

    it('should remove special characters', () => {
      expect(generateSlug('Hello@World!')).toBe('helloworld');
    });

    it('should handle multiple spaces', () => {
      expect(generateSlug('Hello    World')).toBe('hello-world');
    });

    it('should trim leading and trailing hyphens', () => {
      expect(generateSlug('  Hello World  ')).toBe('hello-world');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.user@company.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('invalid@.com')).toBe(false);
    });
  });

  describe('generateRandomString', () => {
    it('should generate string of specified length', () => {
      const str = generateRandomString(16);
      expect(str).toHaveLength(16);
    });

    it('should generate different strings each time', () => {
      const str1 = generateRandomString(32);
      const str2 = generateRandomString(32);
      expect(str1).not.toBe(str2);
    });

    it('should only contain alphanumeric characters', () => {
      const str = generateRandomString(100);
      expect(str).toMatch(/^[A-Za-z0-9]+$/);
    });
  });

  describe('maskEmail', () => {
    it('should mask email correctly', () => {
      expect(maskEmail('user@example.com')).toBe('us***@example.com');
      expect(maskEmail('john.doe@company.co.uk')).toBe('jo***@company.co.uk');
    });

    it('should handle short email addresses', () => {
      expect(maskEmail('ab@example.com')).toBe('a***@example.com');
    });
  });

  describe('validateRedirectUri', () => {
    it('should validate exact matches', () => {
      const allowed = ['http://localhost:3000/callback'];
      expect(validateRedirectUri('http://localhost:3000/callback', allowed)).toBe(true);
    });

    it('should validate wildcard matches', () => {
      const allowed = ['http://localhost:3000/*'];
      expect(validateRedirectUri('http://localhost:3000/callback', allowed)).toBe(true);
      expect(validateRedirectUri('http://localhost:3000/auth/callback', allowed)).toBe(true);
    });

    it('should reject non-matching URIs', () => {
      const allowed = ['http://localhost:3000/*'];
      expect(validateRedirectUri('http://example.com/callback', allowed)).toBe(false);
    });

    it('should handle multiple allowed URIs', () => {
      const allowed = ['http://localhost:3000/*', 'https://app.example.com/callback'];
      expect(validateRedirectUri('http://localhost:3000/callback', allowed)).toBe(true);
      expect(validateRedirectUri('https://app.example.com/callback', allowed)).toBe(true);
      expect(validateRedirectUri('https://other.com/callback', allowed)).toBe(false);
    });
  });

  describe('parseExpiration', () => {
    it('should parse seconds correctly', () => {
      expect(parseExpiration('30s')).toBe(30);
    });

    it('should parse minutes correctly', () => {
      expect(parseExpiration('15m')).toBe(900); // 15 * 60
    });

    it('should parse hours correctly', () => {
      expect(parseExpiration('2h')).toBe(7200); // 2 * 3600
    });

    it('should parse days correctly', () => {
      expect(parseExpiration('7d')).toBe(604800); // 7 * 86400
    });

    it('should throw error for invalid format', () => {
      expect(() => parseExpiration('invalid')).toThrow('Invalid expiration format');
      expect(() => parseExpiration('10x')).toThrow('Invalid expiration format');
    });
  });
});
