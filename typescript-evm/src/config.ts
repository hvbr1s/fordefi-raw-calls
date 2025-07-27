import { FordefiProviderConfig } from '@fordefi/web3-provider';
import dotenv from 'dotenv';
import fs from 'fs'

dotenv.config();

export const CONTRACT_ADDRESS = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
export const CALL_DATA = "0x095ea7b3000000000000000000000000000000000022d473030f116ddee9f6b43ac78ba300000000000000000000000000000000000000000000000000000000000f4240"

export const fordefiConfig: FordefiProviderConfig = {
    chainId: 1,
    address: '0x9f0e7a4F86c17B4C29Bf9B3305247544f402585b', // The Fordefi EVM Vault that will call the contract
    apiUserToken: process.env.FORDEFI_API_USER_TOKEN ?? (() => { throw new Error('FORDEFI_API_USER_TOKEN is not set'); })(), 
    apiPayloadSignKey: fs.readFileSync('./fordefi_secret/private.pem', 'utf8') ?? (() => { throw new Error('PEM_PRIVATE_KEY is not set'); })(),
    rpcUrl: 'https://eth.llamarpc.com', // fallback RPC
    skipPrediction: false
};