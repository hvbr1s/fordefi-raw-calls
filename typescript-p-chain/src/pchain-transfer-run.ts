import dotenv from "dotenv";
import axios from "axios";
import { fordefiPChainConfig } from "./pchain-config";
import { buildPChainTransferPayload, PChainTransferConfig } from "./pchain-transfer-serializer";
import { fetchAndBroadcastPChainTransaction } from "./broadcast-pchain-transaction";

dotenv.config();

async function main() {
    try {
        console.log("=== Fordefi P-Chain Transfer Flow ===\n");

        // Get transfer-specific config from environment
        const destinationAddress = process.env.DESTINATION_ADDRESS || "";
        const transferAmount = process.env.TRANSFER_AMOUNT
            ? BigInt(Number(process.env.TRANSFER_AMOUNT) * 1e9) // Convert AVAX to nAVAX
            : 1_000_000_000n; // Default 1 AVAX

        if (!destinationAddress) {
            throw new Error("DESTINATION_ADDRESS environment variable is required");
        }

        const transferConfig: PChainTransferConfig = {
            originVault: fordefiPChainConfig.originVault,
            originAddress: fordefiPChainConfig.originAddress,
            destinationAddress,
            amount: transferAmount,
            accessToken: fordefiPChainConfig.accessToken,
            privateKeyPem: fordefiPChainConfig.privateKeyPem,
            apiPathEndpoint: fordefiPChainConfig.apiPathEndpoint,
        };

        // Step 1: Build the P-Chain transfer transaction
        console.log("Step 1: Building P-Chain transfer transaction...");
        const { payload, rawTransactionHash, txHex, unsignedTx } = await buildPChainTransferPayload(transferConfig);

        console.log("\n=== Transaction Details ===");
        console.log("Raw transaction hash:", rawTransactionHash);
        console.log("Transaction hex:", txHex.substring(0, 100) + "...");

        // Step 2: Send to Fordefi for signing
        console.log("\n\nStep 2: Sending transaction to Fordefi for signing...");
        console.log("Vault ID:", transferConfig.originVault);

        const fordefiResponse = await axios.post(
            `https://api.fordefi.com${transferConfig.apiPathEndpoint}`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${transferConfig.accessToken}`,
                    'Content-Type': 'application/json',
                }
            }
        );

        console.log("Fordefi response:", fordefiResponse.data);
        const transactionId = fordefiResponse.data.id;

        // Step 3 & 4: Wait for signing and broadcast
        console.log("\n\nStep 3: Waiting for signature and broadcasting...");

        // You need to provide the public key from your vault
        // This should be the 33-byte compressed secp256k1 public key
        const publicKeyBase64 = process.env.VAULT_PUBLIC_KEY || "AylGVK5wbcLMJ5xQ32LlXUyXhP73WNzcF/o2ho+/nj8n";
        const publicKeyBuffer = Buffer.from(publicKeyBase64, 'base64');

        const result = await fetchAndBroadcastPChainTransaction(
            unsignedTx,
            publicKeyBuffer,
            transactionId,
            transferConfig.accessToken,
            transferConfig.apiPathEndpoint
        );

        console.log("\n\n=== SUCCESS ===");
        console.log("Transaction ID:", result.txId);
        console.log("Transaction Status:", result.status);
        console.log(`View on explorer: https://subnets.avax.network/p-chain/tx/${result.txId}`);

    } catch (error) {
        console.error("\n\n=== ERROR ===");
        if (axios.isAxiosError(error)) {
            console.error("Status:", error.response?.status);
            console.error("Data:", JSON.stringify(error.response?.data, null, 2));
        } else {
            console.error(error);
        }
        process.exit(1);
    }
}

main();
