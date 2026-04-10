"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptText = encryptText;
exports.decryptText = decryptText;
const crypto_1 = require("crypto");
/**
 * Encrypt the password/value with given key
 *
 * @param password - Secret key
 * @param plainText - value to encrypt
 */
function encryptText(password, plainText) {
    const salt = (0, crypto_1.randomBytes)(16);
    const iv = (0, crypto_1.randomBytes)(12);
    const key = (0, crypto_1.scryptSync)(password, salt, 32);
    const cipher = (0, crypto_1.createCipheriv)('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
}
/**
 * Decrypt the password/value with given key
 *
 * @param password - Secret key
 * @param base64Text - value to decrypt
 */
function decryptText(password, base64Text) {
    const data = Buffer.from(base64Text, 'base64');
    if (data.length >= 44) {
        try {
            const salt = data.subarray(0, 16);
            const iv = data.subarray(16, 28);
            const tag = data.subarray(28, 44);
            const encrypted = data.subarray(44);
            const key = (0, crypto_1.scryptSync)(password, salt, 32);
            const decipher = (0, crypto_1.createDecipheriv)('aes-256-gcm', key, iv);
            decipher.setAuthTag(tag);
            return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
        }
        catch (_a) {
        }
    }
    let result = '';
    const plainText = data.toString();
    for (let i = 0; i < plainText.length; i++) {
        result += String.fromCharCode(password[i % password.length].charCodeAt(0) ^ plainText.charCodeAt(i));
    }
    return result;
}
//# sourceMappingURL=crypto.js.map