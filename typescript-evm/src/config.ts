import { FordefiProviderConfig } from '@fordefi/web3-provider';
import dotenv from 'dotenv';
import fs from 'fs'

dotenv.config();

//export const CONTRACT_ADDRESS = "0x382E525C690C003f173fdF57270FA0b04721e7F7"; // euint32
export const CONTRACT_ADDRESS = "0x13B8433cDa29b9CDd7e24c0ec106C3AE3337D447"; // euint256
export const DESTINATION_ADDRESS = "0x8BFCF9e2764BC84DE4BBd0a0f5AAF19F47027A73";
export const RAW_CALL_DATA = "0x095ea7b3000000000000000000000000000000000022d473030f116ddee9f6b43ac78ba300000000000000000000000000000000000000000000000000000000000f4240";
export const DECIMALS = 6;
export const MESSAGE = "Luv";

export const fordefiConfig: FordefiProviderConfig = {
    chainId: 11155111, 
    address: process.env.FORDEFI_EVM_VAULT_ADDRESS as `0x${string}`?? (() => { throw new Error('FORDEFI_EVM_VAULT_ADDRESS is not set'); })(), 
    apiUserToken: process.env.FORDEFI_API_USER_MACBOOK_PRO_BOT ?? (() => { throw new Error('FORDEFI_API_USER_TOKEN is not set'); })(), 
    apiPayloadSignKey: fs.readFileSync('./fordefi_secret/private2.pem', 'utf8') ?? (() => { throw new Error('PEM_PRIVATE_KEY is not set'); })(),
    rpcUrl: 'https://1rpc.io/sepolia', // fallback RPC for Sepolia
    skipPrediction: true
};