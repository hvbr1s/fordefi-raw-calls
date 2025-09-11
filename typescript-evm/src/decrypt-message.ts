import { fordefiConfig, CONTRACT_ADDRESS } from './config';
import { getProvider } from './get-provider';
import { ethers } from 'ethers';
import hre from 'hardhat';
import { getCharacterBreakdown, decodeTextFromUint256 } from './text-encoding';

const CIPHERTEXT_HANDLE = "0xe8ebeb74255709333b76f65902eea37e2ab59aae72000000000000aa36a70800";

async function decryptMessage() {
    try {
        console.log("🔓 Starting FHE message decryption...");
        
        await hre.fhevm.initializeCLIApi();
        console.log("✅ FHE instance initialized!");

        const provider = await getProvider(fordefiConfig);
        if (!provider) throw new Error("Failed to initialize provider");
        
        const web3Provider = new ethers.BrowserProvider(provider);
        const signer = await web3Provider.getSigner();
        
        console.log("🔍 Signer address:", await signer.getAddress());
        console.log("🔍 Contract address:", CONTRACT_ADDRESS);
        console.log("🔍 Ciphertext handle to decrypt:", CIPHERTEXT_HANDLE);

        console.log("🔑 Generating keypair for user decryption...");
        const keypair = hre.fhevm.generateKeypair();
        console.log("✅ Keypair generated");

        const handleContractPairs = [
            {
                handle: CIPHERTEXT_HANDLE,
                contractAddress: CONTRACT_ADDRESS,
            },
        ];

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

        const decryptedValue = result[CIPHERTEXT_HANDLE];
        console.log("🎉 Decrypted value:", decryptedValue);
        
        if (typeof decryptedValue === 'bigint') {
            console.log("📝 Decrypted BigInt value:", decryptedValue.toString());
            
            try {
                const decodedText = decodeTextFromUint256(decryptedValue);
                console.log("🎉 Decoded text:", `"${decodedText}"`);
                
                const breakdown = getCharacterBreakdown(decodedText);
                const charDisplay = breakdown.map(({char, code}) => `'${char}':${code}`).join(', ');
                console.log("📋 Character breakdown:", charDisplay);
                
                console.log("✅ Successfully decoded the encrypted message!");
                
            } catch (error: any) {
                console.error("❌ Failed to decode text:", error.message);
                throw error
            }
        } else {
            console.log("📝 Decrypted numeric value:", decryptedValue);
            console.log("⚠️ Unexpected data type - expected BigInt for euint256");
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