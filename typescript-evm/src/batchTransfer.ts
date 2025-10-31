import { ethers } from 'ethers';
import hre from 'hardhat';
import dotenv from 'dotenv';

dotenv.config();

// METAMASK WALLET
const PK = process.env.METAMASK_PK!; 
const USER_ADDRESS = "0x83c1C2a52d56dFb958C52831a3D683cFAfC34c75";

// CONTRACTS
const ETOKEN_CONTRACT = "0x4A8C427Ebe0b22427d23Bbf518fd4A3017a3a4A4";
const BATCHER_CONTRACT_ADDRESS = "0x6c2C8A3Bd837f8F0c3286885ea17c17392af91df";
const RECIPIENTS = ["0xF659feEE62120Ce669A5C45Eb6616319D552dD93", "0xED8315fA2Ec4Dd0dA9870Bf8CD57eBf256A90772"];

const BATCHER_ABI = [
    "function batchSendTokenSameAmount(address token, address[] calldata recipients, bytes32 amountPerRecipient, bytes calldata inputProof) external",
    "function batchSendTokenDifferentAmounts(address token, address[] calldata recipients, bytes32[] calldata amounts, bytes[] calldata inputProofs) external",
    "event BatchTokenTransfer(address indexed sender, address indexed token, bytes32 totalAmount, uint256 recipients)"
];

const ETOKEN_ABI = [
    "function setOperator(address operator, uint48 until) external",
    "function isOperator(address holder, address spender) external view returns (bool)",
    "function confidentialBalanceOf(address account) external view returns (uint256)"
];

async function main() {
    try {
        console.log("Starting FHE batch transfer...");

        await hre.fhevm.initializeCLIApi();
        console.log("✅ FHE instance initialized via Hardhat plugin");

        const amountPerRecipient = 1000;

        // Encrypt the amount per recipient
        const eAmountPerRecipient = await hre.fhevm
            .createEncryptedInput(BATCHER_CONTRACT_ADDRESS, USER_ADDRESS)
            .add64(amountPerRecipient)
            .encrypt();

        console.log("📦 Encrypted amount handle:", eAmountPerRecipient.handles);
        console.log("🔐 Input proof length:", eAmountPerRecipient.inputProof?.length || 0);

        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "https://ethereum-sepolia.publicnode.com");
        const wallet = new ethers.Wallet(PK, provider);

        console.log("🔍 Wallet address:", wallet.address);
        console.log("🔍 Recipients:", RECIPIENTS);
        console.log("🔍 Amount per recipient:", amountPerRecipient);

        // Create contract instances
        const eTokenContract = new ethers.Contract(ETOKEN_CONTRACT, ETOKEN_ABI, wallet);
        const batcherContract = new ethers.Contract(BATCHER_CONTRACT_ADDRESS, BATCHER_ABI, wallet);

        // // Step 1: Set batcher contract as operator (ONLY REQUIRED ONCE!)
        // console.log("\n📝 Step 1: Setting batcher contract as operator...");
        // // Set operator with expiration time (max uint48 for permanent)
        // const until = 0xFFFFFFFFFFFF; // Max uint48 value

        // const approveTx = await eTokenContract.setOperator!(
        //     BATCHER_CONTRACT_ADDRESS,
        //     until
        // );
        // console.log("🔗 SetOperator transaction hash:", approveTx.hash);
        // await approveTx.wait();
        // console.log("✅ Operator set confirmed");

        // Step 2: Execute batch transfer
        console.log("\n📤 Step 2: Executing batch transfer...");

        const handleAsBytes = eAmountPerRecipient.handles[0];

        const balance = await provider.getBalance(wallet.address);
        console.log("⛽ Wallet balance:", ethers.formatEther(balance), "ETH");

        // Get encrypted balance handle
        const encryptedBalance = await eTokenContract.confidentialBalanceOf!(wallet.address);
        const balanceHandleHex = ethers.toBeHex(encryptedBalance, 32);
        console.log("📦 Encrypted balance handle:", balanceHandleHex);

        // Decrypt the balance using fhevm user decryption
        const keypair = hre.fhevm.generateKeypair();
        const startTimeStamp = Math.floor(Date.now() / 1000).toString();
        const durationDays = '10';
        const contractAddresses = [ETOKEN_CONTRACT];

        const eip712 = hre.fhevm.createEIP712(
            keypair.publicKey,
            contractAddresses,
            startTimeStamp,
            durationDays
        );

        const signature = await wallet.signTypedData(
            eip712.domain,
            { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification! },
            eip712.message
        );

        const handleContractPairs = [{
            handle: balanceHandleHex,
            contractAddress: ETOKEN_CONTRACT,
        }];

        const result = await hre.fhevm.userDecrypt(
            handleContractPairs,
            keypair.privateKey,
            keypair.publicKey,
            signature.replace('0x', ''),
            contractAddresses,
            wallet.address,
            startTimeStamp,
            durationDays
        );

        const decryptedBalance = result[balanceHandleHex];
        console.log("🔓 Decrypted token balance:", decryptedBalance);

        try {
            const gasEstimate = await batcherContract.batchSendTokenSameAmount!.estimateGas(
                ETOKEN_CONTRACT,
                RECIPIENTS,
                handleAsBytes,
                eAmountPerRecipient.inputProof
            );
            console.log("⛽ Gas estimate:", gasEstimate.toString());
        } catch (gasError: any) {
            console.error("❌ Gas estimation failed:", gasError.message);
            if (gasError.data) {
                console.log("🔍 Error data:", gasError.data);
            }
        }

        const tx = await batcherContract.batchSendTokenSameAmount!(
            ETOKEN_CONTRACT,
            RECIPIENTS,
            handleAsBytes,
            eAmountPerRecipient.inputProof
        );

        console.log("🔗 Batch transfer transaction hash:", tx.hash);

        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed in block:", receipt.blockNumber);

        const batchEvent = receipt.logs.find((log: any) => {
            try {
                const parsed = batcherContract.interface.parseLog(log);
                return parsed?.name === 'BatchTokenTransfer';
            } catch {
                return false;
            }
        });

        if (batchEvent) {
            const parsed = batcherContract.interface.parseLog(batchEvent);
            console.log("\n📨 BatchTokenTransfer Event Emitted:");
            console.log("  Sender:", parsed!.args.sender);
            console.log("  Token:", parsed!.args.token);
            console.log("  Recipients count:", parsed!.args.recipients.toString());
            console.log("  Total encrypted amount:", parsed!.args.totalAmount);
        }

        console.log("\n✅ Batch transfer complete!");
        console.log(`📊 Sent ${amountPerRecipient} tokens to ${RECIPIENTS.length} recipients`);

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

main().catch(console.error);
