# P-Chain Staking Implementation Notes

## Overview

This implementation enables P-Chain delegation (staking) transactions using Avalanche.js v5 and Fordefi's signing infrastructure. The code has been adapted from the Aptos implementation pattern.

## Key Files

1. **[pchain-config.ts](src/pchain-config.ts)** - Configuration interface and settings
2. **[pchain-staking-serializer.ts](src/pchain-staking-serializer.ts)** - Builds unsigned P-Chain delegation transactions
3. **[broadcast-pchain-transaction.ts](src/broadcast-pchain-transaction.ts)** - Signs and broadcasts transactions
4. **[pchain-run.ts](src/pchain-run.ts)** - Main execution flow

## Avalanche.js v5 API Notes

### Import Pattern

Due to TypeScript/ES module resolution issues with Avalanche.js v5, we use CommonJS require:

```typescript
const avalanche = require("@avalabs/avalanchejs");
```

### Key API Differences from v4

| Feature | v4 | v5 |
|---------|----|----|
| Transaction Builder | Manual UTXO construction | `pvm.e.newAddPermissionlessDelegatorTx()` |
| Signing | Manual credential creation | `unsignedTx.addSignature()` |
| API Access | `Avalanche` class with PChain() | `pvm.PVMApi` class |
| Context | Manual setup | `Context.getContextFromURI()` |

### Important API Locations

- **PVM API**: `avalanche.pvm.PVMApi`
- **Transaction Builders**: `avalanche.pvm.e.newAddPermissionlessDelegatorTx`
- **Context**: `avalanche.Context.getContextFromURI`
- **Utilities**: `avalanche.utils.stringToAddress`

## Transaction Flow

### 1. Build Unsigned Transaction

```typescript
const unsignedTx = avalanche.pvm.e.newAddPermissionlessDelegatorTx({
    end: endTime,                    // Unix timestamp
    feeState,                        // From pvmApi.getFeeState()
    fromAddressesBytes,              // P-Chain address bytes
    nodeId: "NodeID-...",           // Validator to delegate to
    rewardAddresses,                 // Where rewards go
    start: startTime,                // Unix timestamp
    subnetId: context.pBlockchainID, // Primary network
    utxos,                           // From pvmApi.getUTXOs()
    weight: stakeAmount,             // Amount in nAVAX
    changeAddressesBytes,            // Change address
}, context);
```

### 2. Send to Fordefi

The unsigned transaction bytes are hashed and sent to Fordefi's black box signature API:

```typescript
const txBytes = unsignedTx.toBytes();
const payload = {
    vault_id: vaultId,
    signer_type: 'api_signer',
    sign_mode: 'auto',
    type: "black_box_signature",
    details: {
        format: 'hash_binary',
        hash_binary: Buffer.from(txBytes).toString('base64')
    }
};
```

### 3. Add Signature

When Fordefi returns the signature (65 bytes: r + s + recovery_id):

```typescript
const signatureBytes = Buffer.from(signatureBase64, 'base64');
unsignedTx.addSignature(new Uint8Array(signatureBytes));
```

### 4. Broadcast

```typescript
const signedTx = unsignedTx.getSignedTx();
const signedTxHex = Buffer.from(signedTx.toBytes()).toString('hex');

const pvmApi = new avalanche.pvm.PVMApi(RPC_URL);
const txId = await pvmApi.issueTx(signedTxHex);
```

## Signature Format

- **Algorithm**: secp256k1 (ECDSA)
- **Length**: 65 bytes
  - 32 bytes: r component
  - 32 bytes: s component
  - 1 byte: recovery id (v)

This differs from Aptos which uses Ed25519 (64 bytes).

## Staking Requirements

- **Minimum amount**: 25 AVAX (25,000,000,000 nAVAX)
- **Minimum duration**: 14 days (2 weeks)
- **Maximum duration**: 365 days (1 year)
- **Transaction fee**: ~0.001 AVAX

## P-Chain Address Format

P-Chain addresses use bech32 encoding with "avax" prefix:

```
P-avax1<bech32-encoded-address>
```

The address is derived from the compressed secp256k1 public key:

1. SHA256(publicKey)
2. RIPEMD160(hash)
3. Bech32 encode with "avax" HRP

## Testing Checklist

Before running on mainnet:

- [ ] Test on Fuji testnet first
- [ ] Verify P-Chain address has sufficient AVAX balance (25+ AVAX)
- [ ] Confirm validator NodeID is active and accepting delegations
- [ ] Check validator's delegation fee and capacity
- [ ] Ensure start/end times are within acceptable ranges
- [ ] Verify Fordefi vault has correct public key configured

## Troubleshooting

### "No UTXOs found"
- Ensure P-Chain address has AVAX balance
- Check you're using the correct network (mainnet vs fuji)

### "Invalid NodeID"
- Verify the NodeID format: `NodeID-...`
- Confirm validator is active on the network
- Check validator capacity hasn't been reached

### Signature Issues
- Fordefi must return 65-byte secp256k1 signature
- Verify the public key matches the P-Chain address
- Ensure vault is configured for Avalanche P-Chain

### TypeScript Errors
- Use `require()` for avalanche.js imports, not ES6 `import`
- Ensure `@avalabs/avalanchejs` version 5.0.0 is installed

## Environment Variables

Required in `.env`:

```bash
# Fordefi
FORDEFI_API_USER_TOKEN=
BLACKBOX_VAULT_ID=
VAULT_PUBLIC_KEY=  # base64-encoded compressed secp256k1 public key

# P-Chain
PCHAIN_ADDRESS=P-avax1...
NODE_ID=NodeID-...

# Network
AVALANCHE_NETWORK=mainnet
PCHAIN_RPC_URL=https://api.avax.network
```

## References

- [Avalanche.js GitHub](https://github.com/ava-labs/avalanchejs)
- [P-Chain API Docs](https://docs.avax.network/reference/avalanchego/p-chain/api)
- [Avalanche Staking Guide](https://docs.avax.network/nodes/validate/how-to-stake)
- [Fordefi API Docs](https://docs.fordefi.com/)

## Future Improvements

1. Add TypeScript strict types (requires Avalanche.js type definitions)
2. Implement automatic validator selection based on criteria
3. Add transaction simulation before signing
4. Support for multiple simultaneous delegations
5. Implement reward claiming functionality
