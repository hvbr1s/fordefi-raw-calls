# Aptos BlackBox Signing via Fordefi

Use Fordefi BlackBox vaults to sign and broadcast Aptos transactions, including key rotation from an external wallet (e.g. Petra) to a Fordefi-managed key.

## Setup

```bash
npm install
```

Create a `secret/private.pem` file with your Fordefi API signer private key.

Configure `.env`:

```env
FORDEFI_API_USER_TOKEN="<your Fordefi API token>"
BLACKBOX_VAULT_ID="<Fordefi BlackBox vault ID>"
BLACK_BOX_ADDRESS="<Aptos address derived from the BlackBox vault public key>"
DESTINATION_ADDRESS="<destination address for transfers>"
PETRA_PRIVATE_KEY="<hex-encoded Ed25519 private key for key rotation>"
```

## Scripts

### APT Transfer via BlackBox

Signs an APT transfer using the Fordefi BlackBox vault and broadcasts to Aptos.

```bash
npm run transfer
```

**Flow:** Build Aptos transaction -> serialize signing message -> send to Fordefi BB for signing -> fetch signature -> broadcast signed transaction to Aptos.

### Key Rotation (External Wallet -> Fordefi Vault)

Rotates an Aptos account's authentication key from an external Ed25519 key (e.g. Petra wallet) to a Fordefi BlackBox vault key.

```bash
npm run sign-raw
```

**Flow:**

1. Load the current external private key from `PETRA_PRIVATE_KEY` in `.env`
2. Fetch account info on-chain (sequence number, current auth key)
3. Fetch the new public key from the Fordefi BlackBox vault
4. Build a `RotationProofChallenge` (BCS-serialized struct from `0x1::account`)
5. Sign the challenge locally with the current key (current key proof)
6. Sign the challenge via Fordefi BlackBox (new key proof)
7. Submit `0x1::account::rotate_authentication_key` with both proofs, signed by the current account

After rotation, the Fordefi vault controls the account. The account address stays the same but the `authentication_key` on-chain changes to match the Fordefi vault's derived address.

## Verification

Key rotation was verified on mainnet:

- **Account:** `0xd25b6b26b918f5df4fad7aebcdedfab62ca554d6872d88b77e8091d3db5df88a`
- **Transaction:** [`0xe0bb8f69...`](https://explorer.aptoslabs.com/txn/0xe0bb8f695112323c177bb51a8175f834c232eaa454508a8305b18b8967e7d8a4?network=mainnet)
- **Result:** `authentication_key` changed from the Petra-derived key to `0x203ba4bbf9f2110f3f1b78cad65f96f2d8833d13b3401d5f82e3d0e14e574046` (Fordefi BlackBox vault)

You can verify by querying the account:

```bash
curl https://fullnode.mainnet.aptoslabs.com/v1/accounts/0xd25b6b26b918f5df4fad7aebcdedfab62ca554d6872d88b77e8091d3db5df88a
```

The `authentication_key` field should differ from the account address, confirming rotation occurred.

## Key Concepts

- **BlackBox Signing:** Fordefi signs arbitrary bytes (the BCS-serialized challenge or transaction signing message) without interpreting them. The raw signature is returned and assembled client-side.
- **RotationProofChallenge:** An Aptos Move struct (`0x1::account::RotationProofChallenge`) that must be signed by both the current and new key to authorize a key rotation. The Aptos SDK provides a `RotationProofChallenge` class for BCS serialization.
- **APT decimals:** 1 APT = 10^8 octas. To send 0.1 APT, use `10_000_000n`.
