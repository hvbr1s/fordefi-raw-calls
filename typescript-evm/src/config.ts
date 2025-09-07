import { FordefiProviderConfig } from '@fordefi/web3-provider';
import dotenv from 'dotenv';
import fs from 'fs'

dotenv.config();

export const CONTRACT_ADDRESS = "0x848Bb922511fFf65EDD121790a049cD8976585aC";
export const DESTINATION_ADDRESS = "0xF659feEE62120Ce669A5C45Eb6616319D552dD93";
export const RAW_CALL_DATA = "0x095ea7b3000000000000000000000000000000000022d473030f116ddee9f6b43ac78ba300000000000000000000000000000000000000000000000000000000000f4240";
export const DECIMALS = 6;

export const fordefiConfig: FordefiProviderConfig = {
    chainId: 11155111,
    address: '0x8BFCF9e2764BC84DE4BBd0a0f5AAF19F47027A73', // The Fordefi EVM Vault that will call the contract
    apiUserToken: process.env.FORDEFI_API_USER_TOKEN ?? (() => { throw new Error('FORDEFI_API_USER_TOKEN is not set'); })(), 
    apiPayloadSignKey: fs.readFileSync('./fordefi_secret/private.pem', 'utf8') ?? (() => { throw new Error('PEM_PRIVATE_KEY is not set'); })(),
    rpcUrl: 'https://1rpc.io/eth', // fallback RPC
    skipPrediction: true
};