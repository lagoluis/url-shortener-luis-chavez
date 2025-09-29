import crypto from 'crypto';

// Base62 character set: 0-9, A-Z, a-z (URL-safe)
const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Generate a random URL-safe slug using Base62 encoding
 * @param len Length of the slug (default: 7)
 * @returns Random Base62 string
 */
export function randomSlug(len: number = 7): string {
  const bytes = crypto.randomBytes(len);
  let result = '';
  
  for (let i = 0; i < len; i++) {
    // Use modulo to map byte value to Base62 character
    result += BASE62_CHARS[bytes[i] % BASE62_CHARS.length];
  }
  
  return result;
}
