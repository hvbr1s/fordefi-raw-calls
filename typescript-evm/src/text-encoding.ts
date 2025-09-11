/**
 * Text Encoding/Decoding utilities for FHE encryption with euint256
 * 
 * This provides reversible text encoding that packs multiple characters into a single uint256
 * that can be encrypted and then reconstructed back to the original text.
 * 
 * Strategy: Use base-256 encoding to pack characters into a single number
 * Each character (0-255 ASCII) becomes a "digit" in base-256
 * 
 * With uint256, we can store approximately 31 ASCII characters:
 * 256^31 ≈ 2^248 < 2^256, but 256^32 ≈ 2^256 (exactly at the limit)
 * We're using 30 characters to be safe and leave room for length encoding
 */

const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'); // 2^256 - 1
const BASE = 256; // ASCII character range
const MAX_CHARS_UINT256 = 30; // Safe limit for uint256

// For display purposes - show the character mapping
export function getCharacterBreakdown(text: string): Array<{char: string, code: number}> {
    return text.split('').map(char => ({
        char: char,
        code: char.charCodeAt(0)
    }));
}

// Enhanced encoding for euint256 - supports up to 30 characters
export function encodeTextForUint256(text: string): bigint {
    if (text.length > MAX_CHARS_UINT256) {
        throw new Error(`Text too long. Max ${MAX_CHARS_UINT256} characters supported for uint256.`);
    }
    
    if (text.length === 0) return 0n;
    
    // Validate ASCII characters
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        if (charCode > 255) {
            throw new Error(`Character '${text[i]}' has code ${charCode} > 255. Use ASCII only.`);
        }
    }
    
    // Encode length in the highest byte (256^30 position)
    let result = BigInt(text.length) * (BigInt(BASE) ** BigInt(MAX_CHARS_UINT256));
    
    // Encode each character from left to right
    for (let i = 0; i < text.length; i++) {
        const charCode = BigInt(text.charCodeAt(i));
        const position = BigInt(MAX_CHARS_UINT256 - 1 - i);
        result += charCode * (BigInt(BASE) ** position);
    }
    
    if (result > MAX_UINT256) {
        throw new Error(`Encoded number exceeds uint256 limit.`);
    }
    
    return result;
}

export function decodeTextFromUint256(packedNumber: bigint): string {
    if (packedNumber === 0n) return '';
    
    // Extract length from the highest position
    const length = Number(packedNumber / (BigInt(BASE) ** BigInt(MAX_CHARS_UINT256)));
    
    if (length === 0 || length > MAX_CHARS_UINT256) {
        throw new Error(`Invalid length ${length} extracted from ${packedNumber}`);
    }
    
    // Extract character codes
    const chars: string[] = [];
    let remaining = packedNumber % (BigInt(BASE) ** BigInt(MAX_CHARS_UINT256)); // Remove length
    
    for (let i = 0; i < length; i++) {
        const position = BigInt(MAX_CHARS_UINT256 - 1 - i);
        const charCode = Number(remaining / (BigInt(BASE) ** position));
        remaining = remaining % (BigInt(BASE) ** position);
        chars.push(String.fromCharCode(charCode));
    }
    
    return chars.join('');
}

// Helper to display encoding/decoding process
export function displayEncodingProcess(text: string): void {
    console.log(`📝 Original text: "${text}" (${text.length} characters)`);
    
    try {
        const encoded = encodeTextForUint256(text);
        console.log(`🔢 Encoded: ${encoded.toString()}`);
        const decoded = decodeTextFromUint256(encoded);
        console.log(`✅ Decoded: "${decoded}"`);
        console.log(`🔍 Perfect match: ${text === decoded}`);
        
        const breakdown = getCharacterBreakdown(text);
        const charDisplay = breakdown.slice(0, 10).map(({char, code}) => `'${char}':${code}`).join(', ');
        console.log(`📋 Character mapping${breakdown.length > 10 ? ' (first 10)' : ''}: ${charDisplay}${breakdown.length > 10 ? '...' : ''}`);
        
    } catch (error: any) {
        console.error(`❌ Encoding failed: ${error.message}`);
        throw error;
    }
}
