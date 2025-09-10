import { fordefiConfig, CONTRACT_ADDRESS, DESTINATION_ADDRESS } from './config';
import { getProvider } from './get-provider';
import { ethers } from 'ethers';
import hre from 'hardhat';

// Our contract ABI's is at  https://sepolia.etherscan.io/address/0x848bb922511fff65edd121790a049cd8976585ac#code
const SEPOLIA_CONTRACT = "0x848Bb922511fFf65EDD121790a049cD8976585aC";
const MESSENGER_ABI = [
    "function sendMessage(address _to, uint256 message, bytes calldata inputProof) external",
    "event Message(address indexed _from, address indexed _to, uint256 message)"
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
            .createEncryptedInput(SEPOLIA_CONTRACT, fordefiConfig.address)
            .add32(numericValue)
            .encrypt();

        console.log("✅ Message encrypted successfully!");
        console.log("📦 Encrypted handles:", encryptedValue.handles);
        console.log("🔐 Input proof length:", encryptedValue.inputProof?.length || 0);

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
            encryptedValue.handles[0],
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