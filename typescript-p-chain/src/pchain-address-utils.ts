// pchain-address-utils.ts
import { createHash } from "crypto";

/**
 * Convert a public key to P-Chain address using bech32 library
 */
export async function publicKeyToPChainAddress(publicKeyBytes: Buffer): Promise<string> {
    const { bech32 } = await import("bech32");
    
    if (publicKeyBytes.length !== 33) {
        throw new Error(`Expected 33-byte compressed public key, got ${publicKeyBytes.length}`);
    }

    // Hash with SHA256, then RIPEMD160
    const sha256Hash = createHash("sha256").update(publicKeyBytes).digest();
    const ripemd160Hash = createHash("ripemd160").update(sha256Hash).digest();
    
    // Convert to 5-bit words for bech32 encoding
    const words = bech32.toWords(ripemd160Hash);
    
    // Encode with bech32
    const bech32Address = bech32.encode("avax", words);
    
    // Add P-Chain prefix (uppercase P for Avalanche standard)
    return `P-${bech32Address}`;
}

/**
 * Alternative: Generate address that's compatible with avalanchejs
 */
export async function publicKeyToPChainAddressCompat(publicKeyBytes: Buffer): Promise<string> {
    const { bech32 } = await import("bech32");
    
    if (publicKeyBytes.length !== 33) {
        throw new Error(`Expected 33-byte compressed public key, got ${publicKeyBytes.length}`);
    }

    // Hash with SHA256, then RIPEMD160
    const sha256Hash = createHash("sha256").update(publicKeyBytes).digest();
    const ripemd160Hash = createHash("ripemd160").update(sha256Hash).digest();
    
    // Convert to 5-bit words for bech32 encoding
    const words = bech32.toWords(ripemd160Hash);
    
    // Encode with bech32
    const bech32Address = bech32.encode("avax", words);
    
    // Add P-Chain prefix (uppercase P for Avalanche standard)
    return `P-${bech32Address}`;
}

/**
 * Debug function to understand what avalanchejs expects
 */
export async function debugAddressFormat(publicKeyBytes: Buffer): Promise<void> {
    const avalanche = await import("@avalabs/avalanchejs");
    const { bech32 } = await import("bech32");
    
    // Hash the public key
    const sha256Hash = createHash("sha256").update(publicKeyBytes).digest();
    const ripemd160Hash = createHash("ripemd160").update(sha256Hash).digest();
    
    console.log("\n=== Debug Address Format ===");
    console.log("Public key (base64):", publicKeyBytes.toString('base64'));
    console.log("Public key (hex):", publicKeyBytes.toString('hex'));
    console.log("SHA256 hash:", sha256Hash.toString('hex'));
    console.log("RIPEMD160 hash:", ripemd160Hash.toString('hex'));
    
    // Try different encoding methods
    console.log("\n--- Using standard bech32 library ---");
    try {
        const words = bech32.toWords(ripemd160Hash);
        const standardBech32 = bech32.encode("avax", words);
        console.log("Standard bech32:", standardBech32);
        console.log("With prefix:", `p-${standardBech32}`);
    } catch (e) {
        console.log("Standard bech32 error:", e);
    }
    
    console.log("\n--- Using avalanchejs formatBech32 ---");
    try {
        const avaxBech32 = avalanche.utils.formatBech32("avax", ripemd160Hash);
        console.log("Avalanchejs bech32:", avaxBech32);
        console.log("With prefix:", `p-${avaxBech32}`);
        
        // Try to parse it back
        const parsed = avalanche.utils.parseBech32(avaxBech32);
        console.log("Parsed back successfully:", Buffer.from(parsed).toString('hex'));
    } catch (e) {
        console.log("Avalanchejs formatBech32 error:", e);
    }
    
    console.log("\n--- Testing known good address ---");
    // The error message says it expects checksum "vk8mcs"
    const knownAddress = "avax1phmnarnrtx6mtc4jszam804myfvk8mcs";
    try {
        const parsed = avalanche.utils.parseBech32(knownAddress);
        console.log("Known address parsed:", Buffer.from(parsed).toString('hex'));
        console.log("Matches our hash?", Buffer.from(parsed).equals(ripemd160Hash));
    } catch (e) {
        console.log("Known address parse error:", e);
    }
}

/**
 * Parse P-Chain address back to bytes using avalanchejs
 */
export async function parsePChainAddress(pChainAddress: string): Promise<Buffer> {
    const avalanche = await import("@avalabs/avalanchejs");
    
    // Remove chain prefix if present (case-insensitive check)
    let bech32Part = pChainAddress;
    if (pChainAddress.toLowerCase().startsWith('p-')) {
        bech32Part = pChainAddress.substring(2);
    }
    
    // Bech32 is case-insensitive when decoding, so we can parse as-is
    const parsed = avalanche.utils.parseBech32(bech32Part);
    return Buffer.from(parsed);
}

/**
 * Validate P-Chain address using avalanchejs
 */
export async function validatePChainAddress(address: string): Promise<boolean> {
    try {
        await parsePChainAddress(address);
        return true;
    } catch (error) {
        console.error(`Invalid P-Chain address: ${address}`, error);
        return false;
    }
}

/**
 * Normalize a P-Chain address
 * Note: Bech32 is case-insensitive when decoding, so we preserve the original case
 * to maintain valid checksums
 */
export function normalizePChainAddress(address: string): string {
    // Just return the address as-is since Bech32 decoding is case-insensitive
    // and we want to preserve the valid checksum
    return address;
}