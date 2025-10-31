import { bech32 } from "bech32";

// Convert hex address to P-Chain bech32 address
const hexAddress = "0x0df73e8e6359b5b5e2b280bbb3bebb227d0543d8";

function convertHexToPChainAddress(hexAddr: string) {
    // Remove 0x prefix if present
    const cleanHex = hexAddr.replace(/^0x/, '');
    
    // Convert hex to bytes
    const addressBytes = Buffer.from(cleanHex, 'hex');
    
    console.log("Hex address:", hexAddr);
    console.log("Address bytes length:", addressBytes.length);
    console.log("Address bytes (hex):", addressBytes.toString('hex'));
    
    // Convert bytes to 5-bit words for bech32
    const words = bech32.toWords(addressBytes);
    
    // Create bech32 address with "avax" prefix
    const bech32Address = bech32.encode("avax", words);
    
    // Add P-Chain prefix
    const fullPChainAddress = `P-${bech32Address}`;  // uppercase 'P' is standard
    
    console.log("\nP-Chain address:", fullPChainAddress);
    
    // Verify by parsing it back
    try {
        // Remove chain prefix for parsing
        const addressPart = fullPChainAddress.substring(2); // Remove "P-"
        const decoded = bech32.decode(addressPart);
        const decodedBytes = Buffer.from(bech32.fromWords(decoded.words));
        console.log("Verification successful!");
        console.log("Parsed back to hex:", decodedBytes.toString('hex'));
    } catch (e) {
        console.error("Verification failed:", e);
    }
    
    return fullPChainAddress;
}

convertHexToPChainAddress(hexAddress);