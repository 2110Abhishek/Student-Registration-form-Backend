import CryptoJS from 'crypto-js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Encrypts each field of an object separately for storage in MongoDB (2nd level)
 */
export const encryptBackend = (data: any): string => {
  const BACKEND_SECRET = process.env.BACKEND_SECRET || 'backend_secret_key_123';
  if (typeof data === 'object' && data !== null) {
    const encryptedObj: any = {};
    for (const key of Object.keys(data)) {
      if (data[key] !== undefined && data[key] !== null) {
        encryptedObj[key] = CryptoJS.AES.encrypt(String(data[key]), BACKEND_SECRET).toString();
      }
    }
    return JSON.stringify(encryptedObj);
  }
  return CryptoJS.AES.encrypt(String(data), BACKEND_SECRET).toString();
};

/**
 * Decrypts each field of an object separately from MongoDB (removes 2nd level)
 */
export const decryptBackend = (cipherText: string): any => {
  const BACKEND_SECRET = process.env.BACKEND_SECRET || 'backend_secret_key_123';
  try {
    const trimmed = cipherText.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const encryptedObj = JSON.parse(trimmed);
      const decryptedObj: any = {};
      for (const key of Object.keys(encryptedObj)) {
        if (encryptedObj[key] !== undefined && encryptedObj[key] !== null) {
          const bytes = CryptoJS.AES.decrypt(String(encryptedObj[key]), BACKEND_SECRET);
          decryptedObj[key] = bytes.toString(CryptoJS.enc.Utf8);
        }
      }
      return decryptedObj;
    }
  } catch (err) {
    // Fallback if parsing fails
  }

  // Fallback to legacy single-string decryption
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, BACKEND_SECRET);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedData) return null;
    try {
      return JSON.parse(decryptedData);
    } catch {
      return decryptedData;
    }
  } catch {
    return null;
  }
};

/**
 * Decrypts each field of an object received from Frontend (removes 1st level)
 */
export const decryptFrontendLayer = (encryptedData: any, frontendSecret: string): any => {
  try {
    if (typeof encryptedData === 'object' && encryptedData !== null) {
      const decryptedObj: any = {};
      for (const key of Object.keys(encryptedData)) {
        if (encryptedData[key] !== undefined && encryptedData[key] !== null) {
          if (key === 'id' || key === '_id') {
            decryptedObj[key] = encryptedData[key];
          } else {
            const bytes = CryptoJS.AES.decrypt(String(encryptedData[key]), frontendSecret);
            decryptedObj[key] = bytes.toString(CryptoJS.enc.Utf8);
          }
        }
      }
      return decryptedObj;
    }
    // Fallback if a single ciphertext string is received
    const bytes = CryptoJS.AES.decrypt(String(encryptedData), frontendSecret);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedData) return null;
    return JSON.parse(decryptedData);
  } catch (error) {
    console.error('Decryption Error:', error);
    return null;
  }
};
