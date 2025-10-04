import { createAndSignTx, get_tx } from './process_tx';
import { signWithPrivateKey } from './signer';
import { buildPayload } from './serializer';
import { fordefiConfig } from './config';


async function main(): Promise<void> {
  // Partially sign transaction with fee-payer vault
  const requestBody = JSON.stringify(await buildPayload(fordefiConfig));
  const timestamp = new Date().getTime();
  const payload = `${fordefiConfig.apiPathEndpoint}|${timestamp}|${requestBody}`;
  const signedPayloadOne = await signWithPrivateKey(payload, fordefiConfig.privateKeyPem);

  console.log("Submitting transaction to Fordefi for signature 🔑")
  const response = await createAndSignTx(
    fordefiConfig.apiPathEndpoint, 
    fordefiConfig.accessToken, 
    signedPayloadOne, 
    timestamp, 
    requestBody
  );

  await new Promise(resolve => setTimeout(resolve, 2000));

  const signedFordefiTx = await get_tx(fordefiConfig.apiPathEndpoint, fordefiConfig.accessToken, response.data.id)

  if (signedFordefiTx){
    console.log("Transaction fully signed and submitted to network ✅");
    console.log(`Final transaction ID: ${signedFordefiTx.id}`);
  }
}

main().catch(error => {
    console.error("Unhandled error:", error);
});