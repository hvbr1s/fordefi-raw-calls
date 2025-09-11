import { fordefiConfig, CONTRACT_ADDRESS } from './config';
import { getProvider } from './get-provider';
import { ethers } from 'ethers';
import hre from 'hardhat';
import { decodeTextWithLength, getCharacterBreakdown, decodeTextFromUint256 } from './text-encoding';

// The ciphertext handle from the contract call event to decrypt
const CIPHERTEXT_HANDLE = "0xB93A6A358F229878F1A7E226203B79D0ABDB6500AA000000000000AA36A70800";

async function decryptMessage() {
    try {
        console.log("🔓 Starting FHE message decryption...");
        
        // Initialize Zama FHE instance
        await hre.fhevm.initializeCLIApi();
        console.log("✅ FHE instance initialized!");

        const provider = await getProvider(fordefiConfig);
        if (!provider) throw new Error("Failed to initialize provider");
        
        const web3Provider = new ethers.BrowserProvider(provider);
        const signer = await web3Provider.getSigner();
        
        console.log("🔍 Signer address:", await signer.getAddress());
        console.log("🔍 Contract address:", CONTRACT_ADDRESS);
        console.log("🔍 Ciphertext handle to decrypt:", CIPHERTEXT_HANDLE);

        // Step 1: Generate keypair for user decryption
        console.log("🔑 Generating keypair for user decryption...");
        const keypair = hre.fhevm.generateKeypair();
        console.log("✅ Keypair generated");

        // Step 2: Prepare handle-contract pairs
        const handleContractPairs = [
            {
                handle: CIPHERTEXT_HANDLE,
                contractAddress: CONTRACT_ADDRESS,
            },
        ];

        // Step 3: Set up EIP712 parameters
        const startTimeStamp = Math.floor(Date.now() / 1000).toString();
        const durationDays = '10';
        const contractAddresses = [CONTRACT_ADDRESS];

        console.log("📝 Creating EIP712 signature request...");
        const eip712 = hre.fhevm.createEIP712(
            keypair.publicKey,
            contractAddresses,
            startTimeStamp,
            durationDays,
        );

        console.log("✍️ Signing decryption request...");
        const signature = await signer.signTypedData(
            eip712.domain,
            {
                UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification!,
            },
            eip712.message,
        );

        console.log("✅ Signature created:", signature.slice(0, 20) + "...");

        // Step 4: Perform user decryption
        console.log("🔓 Performing user decryption...");
        const result = await hre.fhevm.userDecrypt(
            handleContractPairs,
            keypair.privateKey,
            keypair.publicKey,
            signature.replace('0x', ''),
            contractAddresses,
            await signer.getAddress(),
            startTimeStamp,
            durationDays,
        );

        // Step 5: Extract the decrypted value
        console.log("🔍 Decryption result keys:", Object.keys(result));
        console.log("🔍 Full result:", result);
        
        const decryptedValue = result[CIPHERTEXT_HANDLE];
        console.log("🎉 Decrypted value:", decryptedValue);
        
        if (decryptedValue === undefined || decryptedValue === null) {
            console.error("❌ No decrypted value found for handle:", CIPHERTEXT_HANDLE);
            console.log("💡 Available handles in result:", Object.keys(result));
            
            // Try to find the correct handle (case-insensitive or different format)
            const availableHandles = Object.keys(result);
            const normalizedHandle = CIPHERTEXT_HANDLE.toLowerCase();
            
            for (const handle of availableHandles) {
                if (handle.toLowerCase() === normalizedHandle) {
                    console.log("✅ Found matching handle with different case:", handle);
                    const actualValue = result[handle];
                    console.log("🎉 Actual decrypted value:", actualValue);
                    
                    if (actualValue !== undefined && actualValue !== null) {
                        // Use the found value
                        const bigintValue = typeof actualValue === 'bigint' ? actualValue : BigInt(actualValue);
                        console.log("📝 Converted value:", bigintValue.toString());
                        
                        // Continue with decoding...
                        try {
                            const decodedText = decodeTextFromUint256(bigintValue);
                            console.log("🎉 Decoded text (uint256):", `"${decodedText}"`);
                            return;
                        } catch (error: any) {
                            console.log("❌ Uint256 decoding failed, trying legacy:", error.message);
                            try {
                                const numericValue = Number(bigintValue);
                                const decodedText = decodeTextWithLength(numericValue);
                                console.log("🎉 Decoded text (legacy):", `"${decodedText}"`);
                                return;
                            } catch (legacyError: any) {
                                console.error("❌ All decoding failed:", legacyError.message);
                            }
                        }
                    }
                }
            }
            
            throw new Error("No valid decrypted value found");
        }
        
        // Convert back to original message using reversible decoding
        const bigintValue = typeof decryptedValue === 'bigint' ? decryptedValue : BigInt(decryptedValue);
        console.log("📝 Decrypted value:", bigintValue.toString());
        
        try {
            // Try uint256 decoding first (for longer messages)
            const decodedText = decodeTextFromUint256(bigintValue);
            console.log("🎉 Decoded text (uint256):", `"${decodedText}"`);
            
            // Show the character breakdown
            const breakdown = getCharacterBreakdown(decodedText);
            const charDisplay = breakdown.slice(0, 10).map(({char, code}) => `'${char}':${code}`).join(', ');
            console.log("📋 Character breakdown:", charDisplay + (breakdown.length > 10 ? '...' : ''));
            
            console.log("✅ Successfully decoded the encrypted message!");
            
        } catch (error: any) {
            console.log("❌ Uint256 decoding failed:", error.message);
            console.log("💡 Trying legacy decoding methods...");
            
            try {
                // Try legacy uint32 decoding
                const numericValue = Number(bigintValue);
                const decodedText = decodeTextWithLength(numericValue);
                console.log("🎉 Decoded text (legacy):", `"${decodedText}"`);
                
                // Show the character breakdown
                const breakdown = getCharacterBreakdown(decodedText);
                const charDisplay = breakdown.map(({char, code}) => `'${char}':${code}`).join(', ');
                console.log("📋 Character breakdown:", charDisplay);
                
                console.log("✅ Successfully decoded using legacy method!");
                
            } catch (legacyError: any) {
                console.error("❌ All decoding methods failed:", legacyError.message);
                console.log("💡 This might be an unsupported encoding format");
            }
        }

    } catch (error: any) {
        console.error('❌ Decryption Error:', error.message);
        console.error('Full error:', error);
    }
}

main().catch(console.error);

async function main() {
    await decryptMessage();
}
