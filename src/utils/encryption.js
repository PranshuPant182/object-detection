export async function encryptGCM(plaintext) {
    const base64Key = "aEV5ZEg5bmJFZkdwTnRKUXlSc3BZWmhrd1RSbUZOU2E=";
    const base64Nonce = "KdlBkegJ0I+G0yWp";

    // Decode Base64 to Uint8Array
    const keyBytes = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
    const nonceBytes = Uint8Array.from(atob(base64Nonce), c => c.charCodeAt(0)); // 12 bytes expected

    // Import AES-GCM key
    const cryptoKey = await window.crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM" },
        false,
        ["encrypt"]
    );

    // Convert plaintext to Uint8Array
    const encoder = new TextEncoder();
    const plaintextBytes = encoder.encode(plaintext);

    // Encrypt using AES-GCM
    const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: nonceBytes,
            tagLength: 128,
        },
        cryptoKey,
        plaintextBytes
    );

    // WebCrypto returns ciphertext + tag in one buffer
    const encryptedBytes = new Uint8Array(encryptedBuffer);

    // Separate ciphertext and tag (last 16 bytes)
    const tagLength = 16; // 128 bits
    const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - tagLength);
    const tag = encryptedBytes.slice(encryptedBytes.length - tagLength);

    // Convert to Base64 for return
    return{ 
        ciphertext:btoa(String.fromCharCode(...ciphertext)), // ciphertext
        tag:btoa(String.fromCharCode(...tag))         // tag
        }
    ;
}