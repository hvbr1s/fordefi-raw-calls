const { toBase58Check } = require("bitcoinjs-lib/src/address");
const bcrypto = require("bitcoinjs-lib/src/crypto");
const ecc = require('tiny-secp256k1');
const BIP32Factory = require('bip32').default;

const bip32 = BIP32Factory(ecc);

// From pub_keys.json
const xpub = "xpub661MyMwAqRbcFCvjYemPD3f6o3da15jDYLgW9PzyJv6RJN7uwraUpXoXUGqWQs8xWVtqetvFF4AkW1NnHrPWCf1KQoxGSDbFuAbbr5uFBUg";
const publicKeyCompressedBase64 = "A+dvHUxsrRdxrfbL9Tnc2vpMCDvl8fYqO0rHbzOjG619";

// Target addresses from tx recovery
const targetEth = "0x8bfcf9e2764bc84de4bbd0a0f5aaf19f47027a73";
const targetBtcMainnet = "15Xk1HBBZUzYfmhJ2CZcZM1Qc8eQ4GRYwt";
const targetBtcTestnet = "mk3hJLGANWRoStAujmXzPGDjU8F6viRqUK";

function deriveBtcAddress(pubkeyCompressed: Buffer, network: 'mainnet' | 'testnet'): string {
    const pubHash = bcrypto.hash160(pubkeyCompressed);
    const version = network === 'mainnet' ? 0x00 : 0x6f;
    return toBase58Check(pubHash, version);
}

function deriveEthAddress(pubkeyUncompressed: Buffer): string {
    const { keccak256 } = require("ethers");
    // Remove 04 prefix if present, take last 40 chars of keccak hash
    const pubNoPrefix = pubkeyUncompressed.length === 65 ? pubkeyUncompressed.slice(1) : pubkeyUncompressed;
    return '0x' + keccak256(pubNoPrefix).slice(-40);
}

console.log("=== Checking Master Public Key ===\n");

// Decode the base64 compressed public key
const masterPubkey = Buffer.from(publicKeyCompressedBase64, 'base64');
console.log("Master pubkey (hex):", masterPubkey.toString('hex'));
console.log("Master pubkey length:", masterPubkey.length, "bytes");

// Derive addresses from master key directly
const masterBtcMainnet = deriveBtcAddress(masterPubkey, 'mainnet');
const masterBtcTestnet = deriveBtcAddress(masterPubkey, 'testnet');

// Get uncompressed for ETH
const masterPubkeyUncompressed = Buffer.from(ecc.pointCompress(masterPubkey, false));
const masterEth = deriveEthAddress(masterPubkeyUncompressed);

console.log("\nFrom master pubkey directly:");
console.log("  BTC mainnet:", masterBtcMainnet, masterBtcMainnet === targetBtcMainnet ? "✓ MATCH" : "✗ no match");
console.log("  BTC testnet:", masterBtcTestnet, masterBtcTestnet === targetBtcTestnet ? "✓ MATCH" : "✗ no match");
console.log("  ETH:", masterEth, masterEth === targetEth ? "✓ MATCH" : "✗ no match");

console.log("\n=== Checking xpub Derivation ===\n");

// Parse xpub
const masterNode = bip32.fromBase58(xpub);
console.log("xpub pubkey (hex):", masterNode.publicKey.toString('hex'));

// Check if xpub pubkey matches the compressed pubkey
console.log("xpub matches master pubkey:", masterNode.publicKey.toString('hex') === masterPubkey.toString('hex') ? "✓ YES" : "✗ NO");

// Try common derivation paths
const paths = [
    "m/0",
    "m/0/0",
    "m/1",
    "m/1/0",
    "m/44'/0'/0'/0/0",  // BIP44 BTC (won't work with xpub - hardened)
    "m/44'/60'/0'/0/0", // BIP44 ETH (won't work with xpub - hardened)
];

console.log("\nTrying derivation paths from xpub:");
console.log("Target BTC mainnet:", targetBtcMainnet);
console.log("Target ETH:", targetEth);
console.log("");

// For xpub we can only do non-hardened derivation
const nonHardenedPaths = ["0", "0/0", "1", "1/0", "0/1", "0/2", "0/3", "0/4", "0/5"];

for (const path of nonHardenedPaths) {
    try {
        const child = masterNode.derivePath(path);
        const childBtc = deriveBtcAddress(child.publicKey, 'mainnet');
        const childUncompressed = Buffer.from(ecc.pointCompress(child.publicKey, false));
        const childEth = deriveEthAddress(childUncompressed);

        const btcMatch = childBtc === targetBtcMainnet ? " ✓ BTC MATCH!" : "";
        const ethMatch = childEth === targetEth ? " ✓ ETH MATCH!" : "";

        if (btcMatch || ethMatch) {
            console.log(`Path ${path}: BTC=${childBtc} ETH=${childEth}${btcMatch}${ethMatch}`);
        }
    } catch (e) {
        // Skip invalid paths
    }
}

// Also try deeper paths
console.log("\nTrying deeper paths...");
for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
        const path = `${i}/${j}`;
        try {
            const child = masterNode.derivePath(path);
            const childBtc = deriveBtcAddress(child.publicKey, 'mainnet');
            const childUncompressed = Buffer.from(ecc.pointCompress(child.publicKey, false));
            const childEth = deriveEthAddress(childUncompressed);

            if (childBtc === targetBtcMainnet || childEth === targetEth) {
                console.log(`Path ${path}: BTC=${childBtc} ETH=${childEth} ✓ FOUND!`);
            }
        } catch (e) {
            // Skip
        }
    }
}

console.log("\nDone checking paths.");
