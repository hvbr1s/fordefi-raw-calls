import { fordefiConfig, CONTRACT_ADDRESS, DESTINATION_ADDRESS } from './config';
import { getProvider } from './get-provider';
import { ethers } from 'ethers';
import hre from 'hardhat';

// Our contract ABI's is at  https://sepolia.etherscan.io/address/0x848bb922511fff65edd121790a049cd8976585ac#code
// Note: externalEuint32 is represented as bytes32 in the ABI
const MESSENGER_ABI = [
    "function sendMessage(address _to, bytes32 message, bytes calldata inputProof) external",
    "event Message(address indexed _from, address indexed _to, bytes32 message)"
];

async function main() {
    try {
        console.log("Starting FHE message encryption...");
        
        await hre.fhevm.initializeCLIApi();
        console.log("✅ FHE instance initialized via Hardhat plugin");

        // Convert text to number (ensure it fits in uint32)
        const messageText = "hello Fordefi!";
        const textToNumber = (text: string): number => {
            const sum = text.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
            // Ensure it fits in uint32 range (0 to 4,294,967,295)
            return sum % (2**32);
        };

        const numericValue = textToNumber(messageText);
        console.log(`📝 Converting "${messageText}" to number: ${numericValue}`);

        const encryptedValue = await hre.fhevm
            .createEncryptedInput(CONTRACT_ADDRESS, fordefiConfig.address)
            .add32(numericValue)
            .encrypt();

        console.log("✅ Message encrypted successfully!");
        console.log("📦 Encrypted handles:", encryptedValue.handles);
        console.log("🔐 Input proof length:", encryptedValue.inputProof?.length || 0);
        console.log("🔐 Input proof (first 100 bytes):", encryptedValue.inputProof ? ethers.hexlify(encryptedValue.inputProof.slice(0, 100)) : "undefined");

        const provider = await getProvider(fordefiConfig);
        if (!provider) throw new Error("Failed to initialize provider");
        
        const web3Provider = new ethers.BrowserProvider(provider);
        const signer = await web3Provider.getSigner();
        
        // Debug: Check addresses
        const signerAddress = await signer.getAddress();
        console.log("🔍 Signer address:", signerAddress);
        console.log("🔍 Config address:", fordefiConfig.address);
        console.log("🔍 Destination address:", DESTINATION_ADDRESS);
        
        if (signerAddress.toLowerCase() !== fordefiConfig.address.toLowerCase()) {
            console.warn("⚠️ Address mismatch detected!");
        }

        const messengerContract = new ethers.Contract(
            CONTRACT_ADDRESS,
            MESSENGER_ABI,
            signer
        );

        console.log("📤 Sending encrypted message to contract...");
        
        // Convert the encrypted handle (Uint8Array) to bytes32 format
        const handleBytes = encryptedValue.handles[0];
        console.log("🔍 Handle bytes:", handleBytes);
        
        // For FHE contracts, the encrypted handle should be passed as bytes32
        // This handle represents the externalEuint32 parameter in the contract
        const handleAsBytes32 = ethers.hexlify(handleBytes!);
        console.log("🔍 Handle as bytes32:", handleAsBytes32);
        console.log("🔍 Handle length:", handleAsBytes32.length, "characters (should be 66: 0x + 64 hex chars)");
        
        // The inputProof is used by FHE.fromExternal() to validate the encrypted input
        console.log("🔍 Input proof for validation:", encryptedValue.inputProof ? "present" : "missing");
        
        // Debug: Check if the contract exists and has code
        const contractCode = await web3Provider.getCode(CONTRACT_ADDRESS);
        console.log("🔍 Contract has code:", contractCode !== "0x");
        
        // Debug: Check balance
        const balance = await web3Provider.getBalance(signerAddress);
        console.log("🔍 Signer balance:", ethers.formatEther(balance), "ETH");
        
        // Check if this network supports FHE
        console.log("🔍 Checking FHE network compatibility...");
        console.log("🔍 Network chain ID:", await web3Provider.getNetwork().then(n => n.chainId));
        
        // Try to call a simple contract method first to see if the contract is responsive
        try {
            // Let's try to call the contract with empty/dummy data to see what error we get
            console.log("🔍 Testing contract interaction with minimal data...");
            
            const gasEstimate = await messengerContract.sendMessage!.estimateGas(
                DESTINATION_ADDRESS,
                handleAsBytes32,
                encryptedValue.inputProof
            );
            console.log("🔍 Gas estimate:", gasEstimate.toString());
        } catch (gasError: any) {
            console.error("❌ Gas estimation failed:", gasError.message);
            console.error("This suggests the FHE operations are not supported on this network");
            
            // Try to decode the error if possible
            if (gasError.data) {
                console.log("🔍 Error data:", gasError.data);
            }
            
            // Check if this is a known FHE-related error
            if (gasError.message.includes('missing revert data')) {
                console.log("💡 This error typically occurs when:");
                console.log("   1. The network doesn't have FHE precompiles deployed");
                console.log("   2. The FHE configuration doesn't match the network");
                console.log("   3. The contract is trying to use FHE operations on an unsupported network");
                console.log("💡 Consider using Zama's devnet or a properly configured FHE testnet");
            }
            
            // Don't throw here, continue to see if we get more info
        }
        
        const tx = await messengerContract.sendMessage!(
            DESTINATION_ADDRESS,
            handleAsBytes32,
            encryptedValue.inputProof  
        );

        console.log("🔗 Transaction hash:", tx.hash);
      
        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
        
        const messageEvent = receipt.logs.find((log: any) => {
            try {
                const parsed = messengerContract.interface.parseLog(log);
                return parsed?.name === 'Message';
            } catch {
                return false;
            }
        });

        if (messageEvent) {
            const parsed = messengerContract.interface.parseLog(messageEvent);
            console.log("📨 Message Event Emitted:");
            console.log("  From:", parsed!.args._from);
            console.log("  To:", parsed!.args._to);
            console.log("  Encrypted Message:", parsed!.args.message.toString());
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

main().catch(console.error);