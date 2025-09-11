import { fordefiConfig, CONTRACT_ADDRESS, DESTINATION_ADDRESS, MESSAGE } from './config';
import { getProvider } from './get-provider';
import { ethers } from 'ethers';
import hre from 'hardhat';
import { encodeTextWithLength, displayEncodingProcess, encodeTextForUint256 } from './text-encoding';

// Updated ABI for euint256 support - using bytes32 for externalEuint256 in ABI
const MESSENGER_ABI = [
    "function sendMessage(address _to, bytes32 message, bytes calldata inputProof) external",
    "event Message(address indexed _from, address indexed _to, uint256 message)"
];

async function main() {
    try {
        console.log("Starting FHE message encryption...");
        
        await hre.fhevm.initializeCLIApi();
        console.log("✅ FHE instance initialized via Hardhat plugin");

        // Convert text to reversible encoded number for uint256
        console.log("🔤 Starting text encoding process...");
        
        // Display the encoding process
        displayEncodingProcess(MESSAGE);
        
        // Choose encoding based on message length
        let numericValue: bigint;
        if (MESSAGE.length > 3) {
            numericValue = encodeTextForUint256(MESSAGE);
            console.log(`✅ Final encoded value (uint256): ${numericValue.toString()}`);
        } else {
            // Use legacy encoding for short messages
            numericValue = BigInt(encodeTextWithLength(MESSAGE));
            console.log(`✅ Final encoded value (legacy): ${numericValue.toString()}`);
        }

        const encryptedValue = await hre.fhevm
            .createEncryptedInput(CONTRACT_ADDRESS, fordefiConfig.address)
            .add256(numericValue)
            .encrypt();

        console.log("✅ Message encrypted successfully!");
        console.log("📦 Encrypted handles:", encryptedValue.handles);
        console.log("🔐 Input proof length:", encryptedValue.inputProof?.length || 0);
        console.log("🔐 Input proof (first 100 bytes):", encryptedValue.inputProof ? ethers.hexlify(encryptedValue.inputProof.slice(0, 100)) : "undefined");

        const provider = await getProvider(fordefiConfig);
        if (!provider) throw new Error("Failed to initialize Fordefi Web3 provider");
        
        const web3Provider = new ethers.BrowserProvider(provider);
        const signer = await web3Provider.getSigner();
        
        // Debug: Check addresses
        console.log("🔍 Signer address:", fordefiConfig.address);
        console.log("🔍 Destination address:", DESTINATION_ADDRESS);
        
        // Create contract instance
        const messengerContract = new ethers.Contract(
            CONTRACT_ADDRESS,
            MESSENGER_ABI,
            signer
        );

        console.log("📤 Sending encrypted message to contract...");
        
        // Convert the encrypted handle (Uint8Array) to bytes32 format for externalEuint256
        const handleBytes = encryptedValue.handles[0];
        console.log("🔍 Handle bytes:", handleBytes);
        
        const handleAsBytes32 = ethers.hexlify(handleBytes!);
        console.log("🔍 Handle as bytes32:", handleAsBytes32);
        console.log("🔍 Handle length:", handleAsBytes32.length, "characters (should be 66: 0x + 64 hex chars)");
        
        // The inputProof is used by FHE.fromExternal() to validate the encrypted input
        console.log("🔍 Input proof for validation:", encryptedValue.inputProof ? "present" : "missing");
        
        // Debug: Check balance and gas estimate
        const balance = await web3Provider.getBalance(fordefiConfig.address);
        console.log("⛽ Signer balance:", ethers.formatEther(balance), "ETH");        
        try {            
            const gasEstimate = await messengerContract.sendMessage!.estimateGas(
                DESTINATION_ADDRESS,
                handleAsBytes32,
                encryptedValue.inputProof
            );
            console.log("⛽ Gas estimate:", gasEstimate.toString());
        } catch (gasError: any) {
            console.error("❌ Gas estimation failed:", gasError.message);
            if (gasError.data) {
                console.log("🔍 Error data:", gasError.data);
            }
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