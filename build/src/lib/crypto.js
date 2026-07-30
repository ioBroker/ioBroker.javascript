"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptText = encryptText;
exports.decryptText = decryptText;
/**
 * Encrypt the password/value with given key
 *
 * @param password - Secret key
 * @param plainText - value to encrypt
 */
function encryptText(password, plainText) {
    let result = '';
    for (let i = 0; i < plainText.length; i++) {
        result += String.fromCharCode(password[i % password.length].charCodeAt(0) ^ plainText.charCodeAt(i));
    }
    return Buffer.from(result).toString('base64');
}
/**
 * Decrypt the password/value with given key
 *
 * @param password - Secret key
 * @param base64Text - value to decrypt
 */
function decryptText(password, base64Text) {
    let result = '';
    const plainText = Buffer.from(base64Text, 'base64').toString();
    for (let i = 0; i < plainText.length; i++) {
        result += String.fromCharCode(password[i % password.length].charCodeAt(0) ^ plainText.charCodeAt(i));
    }
    return result;
}
//# sourceMappingURL=crypto.js.map