const avalanche = require("@avalabs/avalanchejs");
import { PCHAIN_RPC_URL } from "./pchain-config";
import { get_tx } from "./process_tx";

interface FordefiTransactionResponse {
  id: string;
  state: string;
  details: {
    type: string;
    signature: string;
    hash_binary: string;
  };
}

export async function fetchAndBroadcastPChainTransaction(
  unsignedTx: any, // UnsignedTx type
  senderPublicKey: Buffer, // 33-byte compressed secp256k1 public key
  fordefiTxId: string,
  accessToken: string,
  apiPath: string = '/api/v1/transactions'
) {
  console.log(`Fetching transaction ${fordefiTxId} from Fordefi...`);
  const fordefiResponse: FordefiTransactionResponse = await get_tx(
    apiPath,
    accessToken,
    fordefiTxId
  );

  console.log("Fordefi transaction state:", fordefiResponse.state);

  if (fordefiResponse.state !== "completed") {
    throw new Error(`Transaction not completed. Current state: ${fordefiResponse.state}`);
  }

  // Pull signature from Fordefi response
  const signatureBase64 = fordefiResponse.details.signature;
  const signatureBytes = Buffer.from(signatureBase64, 'base64');

  console.log("Signature extracted (base64):", signatureBase64);
  console.log("Signature length:", signatureBytes.length, "bytes");

  // For Avalanche, the signature is typically 65 bytes for secp256k1:
  // - 32 bytes for r
  // - 32 bytes for s
  // - 1 byte for recovery id
  if (signatureBytes.length !== 65) {
    console.warn(`Warning: Expected 65-byte signature, got ${signatureBytes.length} bytes`);
  }

  // Add signature to the unsigned transaction using the built-in method
  console.log("Adding signature to unsigned transaction...");

  // UnsignedTx in v5 has an addSignature method
  unsignedTx.addSignature(new Uint8Array(signatureBytes));

  console.log("Signature added successfully");

  // Get the signed transaction
  const signedTx = unsignedTx.getSignedTx();
  const signedTxBytes = signedTx.toBytes();
  const signedTxHex = Buffer.from(signedTxBytes).toString('hex');

  console.log("Signed transaction hex:", signedTxHex.substring(0, 100) + "...");
  console.log("Signed transaction size:", signedTxBytes.length, "bytes");

  // Broadcast to P-Chain
  console.log("Submitting transaction to P-Chain node...");

  const pvmApi = new avalanche.pvm.PVMApi(PCHAIN_RPC_URL);
  const txId = await pvmApi.issueTx(signedTxHex);

  console.log("Transaction submitted successfully!");
  console.log("Transaction ID:", txId);

  // Check transaction status
  console.log("Checking transaction status...");
  const status = await pvmApi.getTxStatus({ txID: txId });
  console.log("Transaction status:", status);

  return {
    txId,
    status,
    signedTxHex,
  };
}

// Alternative: If Fordefi returns the fully signed transaction
export async function fetchAndBroadcastPreSignedPChainTransaction(
  fordefiTxId: string,
  accessToken: string,
  apiPath: string = '/api/v1/transactions'
) {
  console.log(`Fetching pre-signed transaction ${fordefiTxId} from Fordefi...`);
  const fordefiResponse: FordefiTransactionResponse = await get_tx(
    apiPath,
    accessToken,
    fordefiTxId
  );

  console.log("Fordefi transaction state:", fordefiResponse.state);

  if (fordefiResponse.state !== "completed") {
    throw new Error(`Transaction not completed. Current state: ${fordefiResponse.state}`);
  }

  // If Fordefi returns the complete signed transaction bytes
  const signedTxHex = fordefiResponse.details.signature;

  console.log("Broadcasting pre-signed transaction...");

  const pvmApi = new avalanche.pvm.PVMApi(PCHAIN_RPC_URL);
  const txId = await pvmApi.issueTx(signedTxHex);

  console.log("Transaction submitted successfully!");
  console.log("Transaction ID:", txId);

  const status = await pvmApi.getTxStatus({ txID: txId });
  console.log("Transaction status:", status);

  return {
    txId,
    status,
    signedTxHex,
  };
}
