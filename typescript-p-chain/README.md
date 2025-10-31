# Avalanche P-Chain Staking with Fordefi

This project enables P-Chain staking transactions on Avalanche using Fordefi's signing infrastructure.

https://subnets.avax.network/p-chain

## Features

- Derive Avalanche P-Chain addresses from compressed secp256k1 public keys
- Transfer AVAX between P-Chain addresses
- Build P-Chain delegation (staking) transactions
- Sign transactions using Fordefi's API
- Broadcast signed transactions to the Avalanche P-Chain

## Prerequisites

- Node.js 16+ and npm/pnpm
- Fordefi API access token
- Vault ID with P-Chain support
- P-Chain address with available AVAX balance

## Installation

```bash
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Fill in your configuration:
```env
FORDEFI_API_USER_TOKEN=your_fordefi_token_here
BLACKBOX_VAULT_ID=your_vault_id_here
VAULT_PUBLIC_KEY=AylGVK5wbcLMJ5xQ32LlXUyXhP73WNzcF/o2ho+/nj8n
PCHAIN_ADDRESS=P-avax1...
NODE_ID=NodeID-...
AVALANCHE_NETWORK=mainnet
PCHAIN_RPC_URL=https://api.avax.network
```

3. Add your private key PEM file:
```bash
mkdir -p secret
# Add your private.pem file to secret/private.pem
```

## Usage

### Derive P-Chain Address

Derive a P-Chain address from a compressed secp256k1 public key:

```bash
npm run derive
```

Edit [derive_avalanche_p_chain_address.ts](src/derive_avalanche_p_chain_address.ts) to use your public key.

### Transfer AVAX on P-Chain

Send AVAX from your P-Chain address to another P-Chain address:

```bash
npm run transfer
```

Set the destination and amount in your `.env`:
```env
DESTINATION_ADDRESS=P-avax1... # Recipient P-Chain address
TRANSFER_AMOUNT=1.0 # Amount in AVAX
```

This will:
1. Build an unsigned P-Chain base transaction
2. Send it to Fordefi for signing
3. Wait for the signature
4. Broadcast the signed transaction to P-Chain
5. Return the transaction ID

### Create Staking Transaction

Submit a delegation transaction to stake AVAX:

```bash
npm run stake
```

Set the validator NodeID in your `.env`:
```env
NODE_ID=NodeID-... # The validator to delegate to
```

This will:
1. Build an unsigned P-Chain delegation transaction
2. Send it to Fordefi for signing
3. Wait for the signature
4. Broadcast the signed transaction to P-Chain
5. Return the transaction ID

## Configuration Details

### Staking Parameters

Edit [pchain-config.ts](src/pchain-config.ts) to adjust staking parameters:

```typescript
stakeAmount: 25_000_000_000n, // 25 AVAX (minimum for delegation)
startTime: BigInt(Math.floor(Date.now() / 1000) + 60), // Start in 1 minute
endTime: BigInt(Math.floor(Date.now() / 1000) + 60 + (14 * 24 * 60 * 60)), // 14 days minimum
```

### Important Constraints

- **Minimum stake**: 25 AVAX for delegation
- **Minimum duration**: 14 days (2 weeks)
- **Maximum duration**: 365 days (1 year)
- **Network fee**: ~0.001 AVAX transaction fee

### Finding Validators

To delegate, you need a validator's NodeID. Find validators at:
- [Avalanche Subnet Explorer](https://subnets.avax.network)
- [Avascan Validators](https://avascan.info/staking/validators)

Look for validators with:
- Good uptime (>95%)
- Reasonable delegation fee (<10%)
- Available delegation capacity

## Project Structure

```
src/
├── pchain-config.ts                    # Configuration for P-Chain staking
├── pchain-staking-serializer.ts        # Builds unsigned staking transactions
├── broadcast-pchain-transaction.ts     # Handles signature and broadcast
├── pchain-run.ts                       # Main execution flow
├── derive_avalanche_p_chain_address.ts # Address derivation utility
└── process_tx.ts                       # Fordefi API helpers
```

## Flow

### 1. Build Transaction
The script fetches your P-Chain UTXOs and constructs an `AddDelegatorTx` transaction specifying:
- The validator NodeID to delegate to
- The amount to stake
- Start and end times for the delegation period
- Reward address (where staking rewards go)

### 2. Sign with Fordefi
The unsigned transaction is sent to Fordefi's black box signature API. The transaction hash is signed using your vault's private key, which never leaves Fordefi's secure infrastructure.

### 3. Broadcast
Once signed, the transaction is reconstructed with the signature and broadcast to the Avalanche P-Chain RPC endpoint.

### 4. Confirmation
The transaction ID is returned and can be viewed on the Avalanche explorer.

## Troubleshooting

### "Expected 33-byte compressed secp256k1 key"
Ensure your public key is in compressed format (starts with 0x02 or 0x03).

### "Insufficient funds"
Ensure your P-Chain address has at least 25.001 AVAX (25 for staking + 0.001 for fees).

### "Invalid NodeID"
Verify the validator NodeID is correct and the validator is active on the network.

### "Transaction not completed"
Check the Fordefi transaction status. It may require manual approval in the Fordefi UI.

## Networks

### Mainnet
- RPC: `https://api.avax.network`
- Explorer: `https://subnets.avax.network/p-chain`
- Network ID: 1

### Fuji Testnet
- RPC: `https://api.avax-test.network`
- Explorer: `https://subnets-test.avax.network/p-chain`
- Network ID: 5
- Get test AVAX: [Avalanche Faucet](https://faucet.avax.network/)

## Resources

- [Avalanche Documentation](https://docs.avax.network/)
- [Avalanche.js Documentation](https://github.com/ava-labs/avalanchejs)
- [P-Chain API Reference](https://docs.avax.network/reference/avalanchego/p-chain/api)
- [Fordefi Documentation](https://docs.fordefi.com/)
