import { fordefiConfig, CONTRACT_ADDRESS } from './config';
import { getProvider } from './get-provider';
import { ethers } from 'ethers';
import hre from 'hardhat';
import { decodeTextWithLength, getCharacterBreakdown } from './text-encoding';

// The ciphertext handle to decrypt
const CIPHERTEXT_HANDLE = "0x739aa16c09116bc1bf951545ba316a0cabcd3763d3000000000000aa36a70400";

async function decryptMessage() {
    try {
        console.log("🔓 Starting FHE message decryption...");
        
        // Initialize FHE instance
        await hre.fhevm.initializeCLIApi();
        console.log("✅ FHE instance initialized via Hardhat plugin");

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
        const durationDays = '10'; // Valid for 10 days
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
                
                // Fallback: check if it's the old "hello Fordefi!" message
                if (numericValue === 1300) {
                    console.log("✅ Confirmed: This matches 'hello Fordefi!' (sum of char codes = 1300)");
                    console.log("📋 This uses the old sum-based encoding, not the new reversible encoding");
                }
            }
        }

    } catch (error: any) {
        console.error('❌ Decryption Error:', error.message);
        
        // Common error scenarios
        if (error.message.includes('ACL')) {
            console.log("💡 ACL Error: The ciphertext might not have proper access control set.");
            console.log("   Make sure the contract allows the user to decrypt this ciphertext.");
        }
        
        if (error.message.includes('handle')) {
            console.log("💡 Handle Error: The ciphertext handle might be invalid or expired.");
            console.log("   Make sure you're using the correct handle from the transaction event.");
        }
        
        if (error.message.includes('signature')) {
            console.log("💡 Signature Error: The EIP712 signature might be invalid.");
            console.log("   Make sure the signer address matches the one used in the contract.");
        }
        
        console.error('Full error:', error);
    }
}

// Run the decryption
main().catch(console.error);

async function main() {
    await decryptMessage();
}
