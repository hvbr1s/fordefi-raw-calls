import dotenv from 'dotenv'
import fs from 'fs'
import { Network } from "@aptos-labs/ts-sdk";

dotenv.config()

export const APTOS_NETWORK = Network.MAINNET

export interface FordefiAptosConfig {
    accessToken: string;
    originVault: string;
    originAddress: string;
    destAddress: string;
    privateKeyPem: string;
    apiPathEndpoint: string;
    asset: string;
    decimals: bigint;
    amount: bigint;
    durableNonceAccount?: string
  };

export const fordefiConfig: FordefiAptosConfig = {
    accessToken: process.env.FORDEFI_API_USER_TOKEN || "",
    originVault: process.env.BLACKBOX_VAULT_ID || "",
    originAddress: process.env.BLACK_BOX_ADDRESS || "",
    destAddress: process.env.DESTINATION_ADDRES || "",
    privateKeyPem: fs.readFileSync('./secret/private.pem', 'utf8'),
    apiPathEndpoint: '/api/v1/transactions',
    asset: '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b', // Mainnet USDC
    decimals: 6n, // depends on the asset, check on a block explorer >> https://aptoscan.com/
    amount: 1n,
};