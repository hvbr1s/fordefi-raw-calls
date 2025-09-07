import { fordefiConfig, CONTRACT_ADDRESS, DESTINATION_ADDRESS } from './config';
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/node";
import { getProvider } from './get-provider';
import { ethers } from 'ethers';

// Our contract ABI's is at  https://sepolia.etherscan.io/address/0x848bb922511fff65edd121790a049cd8976585ac#code
const MESSENGER_ABI = [
    "function sendMessage(address _to, uint256 message, bytes calldata inputProof) external",
    "event Message(address indexed _from, address indexed _to, uint256 message)"
];

async function main() {
    try {
        console.log("Starting FHE message encryption...");
        
        // Initialize FHE instance
        const instance = await createInstance(SepoliaConfig);
        console.log("✅ FHE instance created");

        // Convert text to number (ensure it fits in uint32)
        const messageText = "hello Fordefi!";
        const textToNumber = (text: string): number => {
            const sum = text.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
            // Ensure it fits in uint32 range (0 to 4,294,967,295)
            return sum % (2**32);
        };

        const numericValue = textToNumber(messageText);
        console.log(`📝 Converting "${messageText}" to number: ${numericValue}`);

        const buffer = instance.createEncryptedInput(
            CONTRACT_ADDRESS, // Your Messenger contract address
            fordefiConfig.address, // Your vault address
        );

        buffer.add32(numericValue);
        console.log("🔒 Added value to encryption buffer");

        // Encrypt the value
        console.log("⏳ Encrypting message...");
        const encryptedInput = await buffer.encrypt();
        console.log("✅ Message encrypted successfully!");
        console.log("📦 Encrypted handles:", encryptedInput.handles);
        console.log("🔐 Input proof length:", encryptedInput.inputProof?.length || 0);

        const provider = await getProvider(fordefiConfig);
        if (!provider) throw new Error("Failed to initialize provider");
        
        const web3Provider = new ethers.BrowserProvider(provider);
        const signer = await web3Provider.getSigner();

        const messengerContract = new ethers.Contract(
            CONTRACT_ADDRESS,
            MESSENGER_ABI,
            signer
        );

        console.log("📤 Sending encrypted message to contract...");
        
        const tx = await messengerContract.sendMessage!(
            DESTINATION_ADDRESS,
            encryptedInput.handles[0],
            encryptedInput.inputProof  
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