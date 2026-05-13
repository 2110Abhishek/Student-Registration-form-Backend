import CryptoJS from 'crypto-js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Encrypts data for storage in MongoDB (2nd level)
 */
export const encryptBackend = (data: any): string => {
  const BACKEND_SECRET = process.env.BACKEND_SECRET || 'backend_secret_key_123';
  return CryptoJS.AES.encrypt(JSON.stringify(data), BACKEND_SECRET).toString();
};

/**
 * Decrypts data from MongoDB (removes 2nd level)
 */
export const decryptBackend = (cipherText: string): any => {
  const BACKEND_SECRET = process.env.BACKEND_SECRET || 'backend_secret_key_123';
  const bytes = CryptoJS.AES.decrypt(cipherText, BACKEND_SECRET);
  const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
  if (!decryptedData) return null;
  return JSON.parse(decryptedData);
};

/**
 * Decrypts data from Frontend (removes 1st level)
 * This is used to verify/process data before re-encrypting for DB
 */
export const decryptFrontendLayer = (cipherText: string, frontendSecret: string): any => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, frontendSecret);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedData) return null;
    return JSON.parse(decryptedData);
  } catch (error) {
    console.error('Decryption Error:', error);
    return null;
  }
};
