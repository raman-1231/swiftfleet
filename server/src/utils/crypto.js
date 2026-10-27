const crypto = require('crypto');
const env = require('../config/env');

// AES-256-GCM requires 32-byte (256-bit) key and 12-byte IV
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getKeyBuffer() {
  const rawKey = env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  if (rawKey.length === 64) {
    return Buffer.from(rawKey, 'hex');
  }
  // If provided as raw 32-char utf-8 string or base64
  return crypto.createHash('sha256').update(String(rawKey)).digest();
}

/**
 * Encrypt sensitive KYC identifier (Aadhaar / PAN / DL) using AES-256-GCM
 * Output format: iv_hex:tag_hex:ciphertext_hex
 */
function encrypt(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKeyBuffer(), iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt AES-256-GCM ciphertext
 */
function decrypt(ciphertextPayload) {
  if (!ciphertextPayload || typeof ciphertextPayload !== 'string') return '';
  const parts = ciphertextPayload.split(':');
  if (parts.length !== 3) return ciphertextPayload; // Return raw if legacy or unencrypted

  const [ivHex, tagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, getKeyBuffer(), iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Mask Indian compliance identity numbers
 * Aadhaar: 12 digits -> "XXXX-XXXX-1234"
 * PAN: 10 chars -> "XXXXXX1234"
 * Driving Licence: "DL-XXXX-XXXX-1234"
 */
function maskIdentifier(idNumber, docType = '') {
  if (!idNumber || typeof idNumber !== 'string') return '';
  const clean = idNumber.replace(/\s+/g, '').trim();
  if (clean.length <= 4) return '••••' + clean;

  const last4 = clean.slice(-4);
  const typeLower = (docType || '').toLowerCase();

  if (typeLower.includes('aadhaar')) {
    return `XXXX-XXXX-${last4}`;
  }

  if (typeLower.includes('pan')) {
    return `XXXXXX${last4.toUpperCase()}`;
  }

  // Driving licence or generic ID
  const maskedPrefix = 'X'.repeat(Math.max(4, clean.length - 4));
  return `${maskedPrefix}-${last4}`;
}

module.exports = {
  encrypt,
  decrypt,
  maskIdentifier
};
