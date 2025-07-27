import dotenv from "dotenv";
import {
  Account,
  AccountAddress,
  AccountAuthenticator,
  Aptos,
  AptosConfig,
  Deserializer,
  Serializer,
  Network,
  NetworkToNetworkName,
  SimpleTransaction,
} from "@aptos-labs/ts-sdk";
import { FordefiAptosConfig } from "./config";

dotenv.config();


const APTOS_NETWORK = Network.MAINNET

const config = new AptosConfig({ network: APTOS_NETWORK });
const aptos = new Aptos(config);

export async function buildPayload(fordefiConfig: FordefiAptosConfig){
    const originVaultAddress = fordefiConfig.originAddress
    const feePayerAddress = fordefiConfig.feePayer
    const destinationAddress = fordefiConfig.destAddress

    const senderAccount = await aptos.account.getAccountInfo({
        accountAddress: originVaultAddress
    });
    const sequenceNumber = senderAccount.sequence_number;
    console.log(sequenceNumber)

    console.log(`Current sequence number for ${originVaultAddress}: ${sequenceNumber}`);

    let transaction = await aptos.transaction.build.simple({
        sender: originVaultAddress,
        withFeePayer: true,
        data: {
          function: "0x1::aptos_account::transfer",
          functionArguments: [destinationAddress, fordefiConfig.amount],
        }
      });
    transaction.feePayerAddress = AccountAddress.from(feePayerAddress)
    const rawTransaction = transaction.rawTransaction
    console.debug("Transaction", transaction)

    const [simulatedTransactionResult] = await aptos.transaction.simulate.simple({
        transaction,
    });
    console.debug("Simulation successful: ", simulatedTransactionResult?.success)

    const txPayload = rawTransaction.payload
    const txBytes = txPayload.bcsToBytes();
    const base64EncodedTransaction = Buffer.from(txBytes).toString('base64');

    const payload = {
        vault_id: fordefiConfig.feePayerVault,
        signer_type: 'api_signer',
        sign_mode: 'auto',
        type: "aptos_transaction",
        details: {
            skip_prediction: false,
            type: 'aptos_serialized_entry_point_payload',
            chain: 'aptos_mainnet',
            serialized_transaction_payload: base64EncodedTransaction,
            push_mode: 'auto'
        }
    };

    return payload;
}