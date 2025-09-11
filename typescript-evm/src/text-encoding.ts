/**
 * Text Encoding/Decoding utilities for FHE encryption
 * 
 * This provides reversible text encoding that packs multiple characters into a single uint256
 * that can be encrypted and then reconstructed back to the original text.
 * 
 * Strategy: Use base-256 encoding to pack characters into a single number
 * Each character (0-255 ASCII) becomes a "digit" in base-256
 * 
 * With uint256, we can store approximately 31 ASCII characters:
 * 256^31 ≈ 2^248 < 2^256, but 256^32 ≈ 2^256 (exactly at the limit)
 * We'll use 30 characters to be safe and leave room for length encoding
 */

const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'); // 2^256 - 1
const MAX_UINT32 = 4294967295; // 2^32 - 1 (for backward compatibility)
const BASE = 256; // ASCII character range
const MAX_CHARS_UINT256 = 30; // Safe limit for uint256

// Pack text into a single number (limited by uint32 size)
export function encodeTextToSingleNumber(text: string): number {
    if (text.length === 0) return 0;
    
    // Convert to character codes
    const charCodes = text.split('').map(char => char.charCodeAt(0));
    
    // Check if all characters are in valid ASCII range (0-255)
    const invalidChars = charCodes.filter(code => code > 255);
    if (invalidChars.length > 0) {
        throw new Error(`Text contains non-ASCII characters with codes: ${invalidChars.join(', ')}. Use ASCII only.`);
    }
    
    // Pack into single number using base-256
    let packed = 0;
    for (let i = 0; i < charCodes.length; i++) {
        const contribution = charCodes[i]! * Math.pow(BASE, charCodes.length - 1 - i);
        if (packed + contribution > MAX_UINT32) {
            throw new Error(`Text "${text}" is too long to fit in uint32. Max ~4 characters for most text.`);
        }
        packed += contribution;
    }
    
    return packed;
}

// Unpack number back to text
export function decodeSingleNumberToText(packedNumber: number, originalLength?: number): string {
    if (packedNumber === 0) return '';
    
    const chars: string[] = [];
    let remaining = packedNumber;
    
    // If we don't know the original length, we need to figure it out
    // This is tricky because leading zeros in characters are lost
    if (originalLength === undefined) {
        // Try to determine length by finding the highest power of 256 that fits
        originalLength = 1;
        while (Math.pow(BASE, originalLength) <= packedNumber) {
            originalLength++;
        }
    }
    
    // Extract characters from most significant to least significant
    for (let i = originalLength - 1; i >= 0; i--) {
        const power = Math.pow(BASE, i);
        const charCode = Math.floor(remaining / power);
        remaining = remaining % power;
        chars.push(String.fromCharCode(charCode));
    }
    
    return chars.join('');
}

// Simple approach: Pack 3 characters max using their ASCII codes
export function encodeTextWithLength(text: string): number {
    if (text.length > 3) {
        throw new Error(`Text too long. Max 3 characters supported for uint32.`);
    }
    
    if (text.length === 0) return 0;
    
    // Pack: length (1 digit) + char1 (3 digits) + char2 (3 digits) + char3 (3 digits)
    // Max: 1 + 255 + 255 + 255 = 1255255255 (fits in uint32: 4,294,967,295)
    let result = text.length * 1000000000; // Length in billions place
    
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        if (charCode > 255) {
            throw new Error(`Character '${text[i]}' has code ${charCode} > 255. Use ASCII only.`);
        }
        const position = Math.pow(1000, 2 - i); // 1000000, 1000, 1
        result += charCode * position;
    }
    
    if (result > MAX_UINT32) {
        throw new Error(`Encoded number ${result} exceeds uint32 limit.`);
    }
    
    return result;
}

export function decodeTextWithLength(packedNumber: number): string {
    if (packedNumber === 0) return '';
    
    // Extract length from billions place
    const length = Math.floor(packedNumber / 1000000000);
    
    if (length === 0 || length > 3) {
        throw new Error(`Invalid length ${length} extracted from ${packedNumber}`);
    }
    
    // Extract character codes (3 digits each, from millions, thousands, ones places)
    const chars: string[] = [];
    let remaining = packedNumber % 1000000000; // Remove length
    
    for (let i = 0; i < length; i++) {
        const position = Math.pow(1000, 2 - i); // 1000000, 1000, 1
        const charCode = Math.floor(remaining / position);
        remaining = remaining % position;
        chars.push(String.fromCharCode(charCode));
    }
    
    return chars.join('');
}

// For display purposes - show the character mapping
export function getCharacterBreakdown(text: string): Array<{char: string, code: number}> {
    return text.split('').map(char => ({
        char: char,
        code: char.charCodeAt(0)
    }));
}

// NEW: Enhanced encoding for euint256 - supports up to 30 characters
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
        // Try uint256 encoding first for longer text
        if (text.length > 3) {
            const uint256Encoded = encodeTextForUint256(text);
            console.log(`🔢 Uint256 encoded: ${uint256Encoded.toString()}`);
            const uint256Decoded = decodeTextFromUint256(uint256Encoded);
            console.log(`✅ Uint256 decoded: "${uint256Decoded}"`);
            console.log(`🔍 Perfect match: ${text === uint256Decoded}`);
            
            const breakdown = getCharacterBreakdown(text);
            const charDisplay = breakdown.slice(0, 10).map(({char, code}) => `'${char}':${code}`).join(', ');
            console.log(`📋 Character mapping (first 10): ${charDisplay}${breakdown.length > 10 ? '...' : ''}`);
            return;
        }
        
        // Try length-prefixed encoding for short text (backward compatibility)
        const lengthEncoded = encodeTextWithLength(text);
        console.log(`🔢 Length-prefixed encoded: ${lengthEncoded}`);
        const lengthDecoded = decodeTextWithLength(lengthEncoded);
        console.log(`✅ Length-prefixed decoded: "${lengthDecoded}"`);
        console.log(`🔍 Perfect match: ${text === lengthDecoded}`);
        
        const breakdown = getCharacterBreakdown(text);
        const charDisplay = breakdown.map(({char, code}) => `'${char}':${code}`).join(', ');
        console.log(`📋 Character mapping: ${charDisplay}`);
        
    } catch (error: any) {
        console.log(`❌ Primary encoding failed: ${error.message}`);
        
        // Try base-256 encoding as fallback
        try {
            const baseEncoded = encodeTextToSingleNumber(text);
            console.log(`🔢 Base-256 encoded: ${baseEncoded}`);
            const baseDecoded = decodeSingleNumberToText(baseEncoded, text.length);
            console.log(`✅ Base-256 decoded: "${baseDecoded}"`);
            console.log(`🔍 Perfect match: ${text === baseDecoded}`);
        } catch (baseError: any) {
            console.log(`❌ All encoding methods failed: ${baseError.message}`);
        }
    }
}
