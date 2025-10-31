import { PCHAIN_RPC_URL } from "./pchain-config";
import { get_tx } from "./process_tx";

// Dynamic import for avalanchejs to work around module system issues
let avalanche: any;
async function getAvalanche() {
    if (!avalanche) {
        avalanche = await import("@avalabs/avalanchejs");
    }
    return avalanche;
}

interface FordefiTransactionResponse {
  id: string;
  state: string;
  signatures: Array<{
    data: string;
    signed_by: any;
  }>;
  details: {
    type: string;
    signature?: any;
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
  // Poll for transaction completion with retries
  const maxRetries = 10;
  const retryDelayMs = 2000;
  let fordefiResponse: FordefiTransactionResponse | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Fetching transaction ${fordefiTxId} from Fordefi (attempt ${attempt}/${maxRetries})...`);
    fordefiResponse = await get_tx(
      apiPath,
      accessToken,
      fordefiTxId
    );

    console.log("Fordefi transaction state:", fordefiResponse.state);

    if (fordefiResponse.state === "completed") {
      break;
    }

    if (attempt < maxRetries) {
      console.log(`Transaction not yet completed. Waiting ${retryDelayMs}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, retryDelayMs));
    }
  }

  if (!fordefiResponse || fordefiResponse.state !== "completed") {
    throw new Error(`Transaction not completed after ${maxRetries} attempts. Current state: ${fordefiResponse?.state || 'unknown'}`);
  }

  // Pull signature from Fordefi response
  // The signature is in the signatures array, not in details.signature
  if (!fordefiResponse.signatures || fordefiResponse.signatures.length === 0) {
    throw new Error("No signatures found in completed transaction");
  }
  
  const signatureBase64 = fordefiResponse.signatures[0].data;
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
  console.log("Signature bytes (hex):", signatureBytes.toString('hex'));

  // UnsignedTx in v5 has an addSignature method
  unsignedTx.addSignature(new Uint8Array(signatureBytes));

  console.log("Signature added successfully");

  // Get the signed transaction
  const signedTx = unsignedTx.getSignedTx();
  const signedTxBytes = signedTx.toBytes();
  const signedTxHex = Buffer.from(signedTxBytes).toString('hex');

  console.log("Signed transaction hex:", signedTxHex.substring(0, 100) + "...");
  console.log("Signed transaction size:", signedTxBytes.length, "bytes");
  console.log("Unsigned transaction size was:", unsignedTx.toBytes().length, "bytes");
  
  // Log first bytes to compare
  console.log("First 20 bytes (hex):", signedTxHex.substring(0, 40));
  console.log("Last 20 bytes (hex):", signedTxHex.substring(signedTxHex.length - 40));

  // Broadcast to P-Chain
  console.log("Submitting transaction to P-Chain node...");

  const avalanche = await getAvalanche();
  const pvmApi = new avalanche.pvm.PVMApi(PCHAIN_RPC_URL);
  
  // Try with the proper format - encode the hex to CB58 manually using base58
  const base58 = await import('bs58');
  const txCB58 = base58.default.encode(signedTxBytes);
  console.log("Transaction in CB58:", txCB58.substring(0, 100) + "...");
  
  // Pass the CB58-encoded transaction
  const txId = await pvmApi.issueTx(txCB58);

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
  // Poll for transaction completion with retries
  const maxRetries = 10;
  const retryDelayMs = 2000;
  let fordefiResponse: FordefiTransactionResponse | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Fetching pre-signed transaction ${fordefiTxId} from Fordefi (attempt ${attempt}/${maxRetries})...`);
    fordefiResponse = await get_tx(
      apiPath,
      accessToken,
      fordefiTxId
    );

    console.log("Fordefi transaction state:", fordefiResponse.state);

    if (fordefiResponse.state === "completed") {
      break;
    }

    if (attempt < maxRetries) {
      console.log(`Transaction not yet completed. Waiting ${retryDelayMs}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, retryDelayMs));
    }
  }

  if (!fordefiResponse || fordefiResponse.state !== "completed") {
    throw new Error(`Transaction not completed after ${maxRetries} attempts. Current state: ${fordefiResponse?.state || 'unknown'}`);
  }

  // Pull signature from Fordefi response
  if (!fordefiResponse.signatures || fordefiResponse.signatures.length === 0) {
    throw new Error("No signatures found in completed transaction");
  }
  
  const signedTxHex = fordefiResponse.signatures[0].data;

  console.log("Broadcasting pre-signed transaction...");

  const avalanche = await getAvalanche();
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
