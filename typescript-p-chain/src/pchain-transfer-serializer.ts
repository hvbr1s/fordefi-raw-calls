import dotenv from "dotenv";
import crypto from "crypto";
const avalanche = require("@avalabs/avalanchejs");
import { FordefiPChainConfig, PCHAIN_RPC_URL } from "./pchain-config";

dotenv.config();

export interface PChainTransferConfig {
    originVault: string;
    originAddress: string;
    destinationAddress: string;
    amount: bigint; // Amount in nAVAX (1 AVAX = 1e9 nAVAX)
    accessToken: string;
    privateKeyPem: string;
    apiPathEndpoint: string;
}

export async function buildPChainTransferPayload(transferConfig: PChainTransferConfig) {
    // Initialize PVM API
    const pvmApi = new avalanche.pvm.PVMApi(PCHAIN_RPC_URL);

    const originAddress = transferConfig.originAddress;
    const destinationAddress = transferConfig.destinationAddress;

    console.log(`Building P-Chain transfer from ${originAddress} to ${destinationAddress}`);
    console.log(`Amount: ${transferConfig.amount} nAVAX (${Number(transferConfig.amount) / 1e9} AVAX)`);

    // Get context (network info)
    const context = await avalanche.Context.getContextFromURI(PCHAIN_RPC_URL);
    console.log("Network ID:", context.networkID);
    console.log("P-Chain ID:", context.pBlockchainID);
    console.log("AVAX Asset ID:", context.avaxAssetID);

    // Convert P-Chain addresses to bytes
    const fromAddresses = [avalanche.utils.stringToAddress(originAddress, 'P')];
    const fromAddressesBytes = fromAddresses.map(addr => addr.toBytes());

    const toAddress = avalanche.utils.stringToAddress(destinationAddress, 'P');
    const toAddressBytes = toAddress.toBytes();

    // Fetch UTXOs
    const { utxos } = await pvmApi.getUTXOs({
        addresses: [originAddress],
    });

    console.log(`Found ${utxos.length} UTXOs`);

    if (utxos.length === 0) {
        throw new Error("No UTXOs found for address. Ensure the address has AVAX balance.");
    }

    // Get fee state
    const feeState = await pvmApi.getFeeState();
    console.log("Fee state:", feeState);

    // Create output for the recipient
    const outputs = [
        avalanche.TransferableOutput.fromNative(
            context.avaxAssetID,
            transferConfig.amount,
            [toAddressBytes]
        )
    ];

    console.log("Building base transaction for AVAX transfer...");

    // Build the unsigned base transaction
    const unsignedTx = avalanche.pvm.e.newBaseTx(
        {
            feeState,
            fromAddressesBytes,
            outputs,
            utxos,
            changeAddressesBytes: fromAddressesBytes, // Change goes back to sender
        },
        context
    );

    console.log("Unsigned transaction built successfully");

    // Get transaction bytes for signing
    const txBytes = unsignedTx.toBytes();
    const txHex = Buffer.from(txBytes).toString('hex');

    // Create hash for signing
    const txHash = crypto.createHash('sha256').update(txBytes).digest('hex');
    const base64Hash = Buffer.from(txBytes).toString('base64');

    console.log("Transaction hash (hex):", txHash);
    console.log("Transaction bytes (base64):", base64Hash);
    console.log("Transaction size:", txBytes.length, "bytes");

    // Fordefi payload
    const payload = {
        vault_id: transferConfig.originVault,
        signer_type: 'api_signer',
        sign_mode: 'auto',
        type: "black_box_signature",
        details: {
            format: 'hash_binary',
            hash_binary: base64Hash
        }
    };

    return {
        payload,
        rawTransactionHash: txHash,
        unsignedTx,
        txHex,
        txBytes
    };
}
