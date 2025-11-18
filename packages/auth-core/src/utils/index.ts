export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const generateRandomString = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const maskEmail = (email: string): string => {
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  return `${localPart.substring(0, 2)}***@${domain}`;
};

export const validateRedirectUri = (uri: string, allowedUris: string[]): boolean => {
  return allowedUris.some((allowed) => {
    if (allowed === uri) return true;
    if (allowed.endsWith('/*')) {
      const baseUrl = allowed.slice(0, -2);
      return uri.startsWith(baseUrl);
    }
    return false;
  });
};

export const parseExpiration = (expiration: string): number => {
  const units: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };

  const match = expiration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid expiration format: ${expiration}`);
  }

  const [, value, unit] = match;
  return parseInt(value, 10) * units[unit];
};
