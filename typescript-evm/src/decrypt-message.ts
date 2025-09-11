import { fordefiConfig, CONTRACT_ADDRESS } from './config';
import { getProvider } from './get-provider';
import { ethers } from 'ethers';
import hre from 'hardhat';
import { decodeTextWithLength, getCharacterBreakdown } from './text-encoding';

// The ciphertext handle from the contrcat call event to decrypt
const CIPHERTEXT_HANDLE = "0x716afde06e859640c8d0383f0d59fbdfc8ba2224ca000000000000aa36a70400";

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
        const decryptedValue = result[CIPHERTEXT_HANDLE];
        console.log("🎉 Decrypted value:", decryptedValue);
        
        // Convert back to original message using reversible decoding
        const numericValue = typeof decryptedValue === 'bigint' ? Number(decryptedValue) : decryptedValue;
        if (typeof numericValue === 'number') {
            console.log("📝 Decrypted numeric value:", numericValue);
            
            try {
                // Decode the number back to text
                const decodedText = decodeTextWithLength(numericValue);
                console.log("🎉 Decoded text:", `"${decodedText}"`);
                
                // Show the character breakdown
                const breakdown = getCharacterBreakdown(decodedText);
                const charDisplay = breakdown.map(({char, code}) => `'${char}':${code}`).join(', ');
                console.log("📋 Character breakdown:", charDisplay);
                
                console.log("✅ Successfully decoded the encrypted message!");
                
            } catch (error: any) {
                console.error("❌ Failed to decode text:", error.message);
                console.log("💡 This might be an old message using the sum encoding method");
                
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
