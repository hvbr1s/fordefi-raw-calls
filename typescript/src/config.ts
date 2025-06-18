import { FordefiProviderConfig } from '@fordefi/web3-provider';
import dotenv from 'dotenv';
import fs from 'fs'

dotenv.config();

export const CONTRACT_ADDRESS = "0x4e7d2186eb8b75fbdca867761636637e05baef1e";

export const CALL_DATA = "0x0efe6a8b000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000186a00000000000000000000000000000000000000000000000000000000000000000"

export const fordefiConfig: FordefiProviderConfig = {
    chainId: 1,
    address: '0x8BFCF9e2764BC84DE4BBd0a0f5AAF19F47027A73', // The Fordefi EVM Vault that will call the contract
    apiUserToken: process.env.FORDEFI_API_USER_TOKEN ?? (() => { throw new Error('FORDEFI_API_USER_TOKEN is not set'); })(), 
    apiPayloadSignKey: fs.readFileSync('./fordefi_secret/private.pem', 'utf8') ?? (() => { throw new Error('PEM_PRIVATE_KEY is not set'); })(),
    rpcUrl: 'https://eth.llamarpc.com',
    skipPrediction: true
};