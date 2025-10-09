import { solidityPackedKeccak256 } from "ethers";

function generateClientHash(address: string, salt: string): string {
    // Hash with a secret salt known only to you and Fordefi
    return solidityPackedKeccak256(
        ["address", "string"],
        [address, salt]
    );
}

const address = "0x8BFCF9e2764BC84DE4BBd0a0f5AAF19F47027A73";
const SECRET_SALT = "81e82853-3c4f-4cd4-b494-78fb4abf168a";

const hash = generateClientHash(address, SECRET_SALT);

console.log("Client hash:", hash);