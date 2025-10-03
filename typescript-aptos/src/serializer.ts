import dotenv from "dotenv";
import {
  Aptos,
  AptosConfig } from "@aptos-labs/ts-sdk";
import { FordefiAptosConfig, APTOS_NETWORK } from "./config";

dotenv.config();

const config = new AptosConfig({ network: APTOS_NETWORK });
const aptos = new Aptos(config);

export async function buildPayload(fordefiConfig: FordefiAptosConfig){
    const originVaultAddress = fordefiConfig.originAddress
    const destinationAddress = fordefiConfig.destAddress

    const senderAccount = await aptos.account.getAccountInfo({
        accountAddress: originVaultAddress
    });
    const sequenceNumber = senderAccount.sequence_number;
    console.log(sequenceNumber)

    console.log(`Current sequence number for ${originVaultAddress}: ${sequenceNumber}`);

    const txCount = await aptos.getAccountTransactionsCount({
        accountAddress: originVaultAddress,
    });
    console.log("Account transaction count: ", txCount)

    let transaction = await aptos.transaction.build.simple({
        sender: originVaultAddress,
        withFeePayer: false,
        data: {
            function: "0x1::primary_fungible_store::transfer",
            typeArguments: ["0x1::fungible_asset::Metadata"],
            functionArguments: [fordefiConfig.asset, destinationAddress, fordefiConfig.amount],
          }
      }); // this transaction calls the transfer function on the USDC Object to perform a FA transfer

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
        vault_id: fordefiConfig.originVault,
        signer_type: 'api_signer',
        sign_mode: 'auto',
        type: "aptos_transaction",
        details: {
            skip_prediction: true,
            fail_on_prediction_failure: false,
            type: 'aptos_serialized_entry_point_payload',
            chain: 'aptos_mainnet',
            serialized_transaction_payload: base64EncodedTransaction,
            push_mode: 'auto',
            gas_config: {
                max_gas: "100", // in units of gas
                price: {
                    type: "custom",
                    price: "100" // in octa, 1 APT = 100_000_000 octas
                }
            }
        }
    };

    return payload;
}