import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config()

export const AVALANCHE_NETWORK = process.env.AVALANCHE_NETWORK || 'mainnet'; // mainnet, fuji, or custom
export const PCHAIN_RPC_URL = process.env.PCHAIN_RPC_URL || 'https://api.avax.network';

export interface FordefiPChainConfig {
    accessToken: string;
    originVault: string;
    originAddress: string; // P-Chain address in format P-avax1... or hex
    nodeId: string; // NodeID to delegate to (NodeID-...)
    privateKeyPem: string;
    apiPathEndpoint: string;
    stakeAmount: bigint; // Amount in nAVAX (1 AVAX = 1e9 nAVAX)
    startTime: bigint; // Unix timestamp when delegation starts
    endTime: bigint; // Unix timestamp when delegation ends
    rewardAddress?: string; // Optional, defaults to originAddress
};

export const fordefiPChainConfig: FordefiPChainConfig = {
    accessToken: process.env.FORDEFI_API_USER_TOKEN || "",
    originVault: process.env.BLACKBOX_VAULT_ID || "",
    originAddress: process.env.PCHAIN_ADDRESS || "", // P-avax1... format
    nodeId: process.env.NODE_ID || "", // NodeID to delegate to
    privateKeyPem: fs.readFileSync('./secret/private.pem', 'utf8'),
    apiPathEndpoint: '/api/v1/transactions',
    stakeAmount: 25_000_000_000n, // 25 AVAX minimum for delegation
    startTime: BigInt(Math.floor(Date.now() / 1000) + 60), // Start in 1 minute
    endTime: BigInt(Math.floor(Date.now() / 1000) + 60 + (14 * 24 * 60 * 60)), // 14 days minimum
};
