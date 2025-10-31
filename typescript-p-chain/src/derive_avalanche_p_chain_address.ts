import { createHash } from "crypto";

// 1) Your compressed secp256k1 public key (base64, 33 bytes once decoded)
const pubkeyBase64 = 'AylGVK5wbcLMJ5xQ32LlXUyXhP73WNzcF/o2ho+/nj8n';
const cleanB64 = pubkeyBase64.replace(/^[\'"\s]+|[\'"\s]+$/g, "");

// 2) Decode base64 -> bytes and sanity check (33 bytes for compressed secp256k1)
const pubkeyBytes = Buffer.from(cleanB64, "base64");
if (pubkeyBytes.length !== 33) {
  throw new Error(`Expected 33-byte compressed secp256k1 key, got ${pubkeyBytes.length}`);
}

// 3) Avalanche P-Chain/X-Chain address derivation:
//    - Hash the public key with SHA256
//    - Hash that result with RIPEMD160
//    - Encode with bech32 using "avax" prefix
const sha256Hash = createHash("sha256")
  .update(pubkeyBytes)
  .digest();

const ripemd160Hash = createHash("ripemd160")
  .update(sha256Hash)
  .digest();

// 4) Bech32 encoding for Avalanche
// Using a simplified bech32 implementation
function bech32Encode(hrp: string, data: Buffer): string {
  const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

  // Convert 8-bit data to 5-bit groups
  const words: number[] = [];
  let bits = 0;
  let value = 0;

  for (const byte of data) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      bits -= 5;
      words.push((value >> bits) & 31);
    }
  }

  if (bits > 0) {
    words.push((value << (5 - bits)) & 31);
  }

  // Calculate checksum
  const hrpExpanded = [];
  for (let i = 0; i < hrp.length; i++) {
    hrpExpanded.push(hrp.charCodeAt(i) >> 5);
  }
  hrpExpanded.push(0);
  for (let i = 0; i < hrp.length; i++) {
    hrpExpanded.push(hrp.charCodeAt(i) & 31);
  }

  const values = hrpExpanded.concat(words).concat([0, 0, 0, 0, 0, 0]);
  const polymod = bech32Polymod(values);

  const checksum: number[] = [];
  for (let i = 0; i < 6; i++) {
    checksum.push((polymod >> (5 * (5 - i))) & 31);
  }

  // Combine everything
  let result = hrp + '1';
  for (const word of words.concat(checksum)) {
    result += CHARSET.charAt(word);
  }

  return result;
}

function bech32Polymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;

  for (const value of values) {
    const b = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ value;
    for (let i = 0; i < 5; i++) {
      if ((b >> i) & 1) {
        chk ^= GEN[i];
      }
    }
  }

  return chk;
}

const pChainAddress = bech32Encode("avax", ripemd160Hash);
console.log("Avalanche P-Chain address:", pChainAddress);

// Also show the hex representation of the hash for reference
console.log("RIPEMD160 hash (hex):", `0x${ripemd160Hash.toString("hex")}`);
