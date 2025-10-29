/**
 * XOR "encryption" with Base64 output — browser/TS version (UTF-8 safe).
 * NOTE: XOR like this is not cryptographically secure. Use Web Crypto (AES-GCM) for real security.
 */

function assertPassword(pw: string): void {
    if (!pw) {
        throw new Error('Password must be a non-empty string.');
    }
}

function toBytes(str: string): Uint8Array {
    return new TextEncoder().encode(str);
}

function fromBytes(bytes: Uint8Array): string {
    return new TextDecoder().decode(bytes);
}

function base64Encode(bytes: Uint8Array): string {
    // Convert bytes to binary string for btoa
    let bin = '';
    for (let i = 0; i < bytes.length; i++) {
        bin += String.fromCharCode(bytes[i]);
    }
    return btoa(bin);
}

function base64Decode(b64: string): Uint8Array {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
        out[i] = bin.charCodeAt(i);
    }
    return out;
}

function xorBytes(data: Uint8Array, key: Uint8Array): Uint8Array {
    const out = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
        out[i] = data[i] ^ key[i % key.length];
    }
    return out;
}

/**
 * Encrypt the text with a secret key using XOR and return Base64.
 *
 * @param password Secret key (string)
 * @param plainText Value to encrypt (string)
 */
export function encryptText(password: string, plainText: string): string {
    assertPassword(password);
    const data = toBytes(plainText);
    const key = toBytes(password);
    const xored = xorBytes(data, key);
    return base64Encode(xored);
}

/**
 * Decrypt a Base64 string with the secret key using XOR.
 *
 * @param password Secret key (string)
 * @param base64Text Base64-encoded ciphertext
 */
export function decryptText(password: string, base64Text: string): string {
    assertPassword(password);
    const cipherBytes = base64Decode(base64Text);
    const key = toBytes(password);
    const plainBytes = xorBytes(cipherBytes, key);
    return fromBytes(plainBytes);
}
