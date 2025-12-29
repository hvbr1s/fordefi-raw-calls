const { ethers } = require("ethers");
const provider = new ethers.JsonRpcProvider('https://public-node.rsk.co');
const { toBase58Check } = require("bitcoinjs-lib/src/address");
const bcrypto = require("bitcoinjs-lib/src/crypto");
const ecc = require('tiny-secp256k1');
const txId = "0x02cb5dff16405a5c492c37085561ad87756b2b642be6610a756d9e51ee3f9304";

(async function () {
    const tx = await provider.getTransaction(txId); 
    const parsedTx = ethers.Transaction.from(tx);
    
    const pubStr = ethers.SigningKey.recoverPublicKey(parsedTx.unsignedHash, tx.signature).toString('hex').slice(2);
    const pubkey = ecc.pointCompress(Buffer.from(pubStr, 'hex'), true);
    const pubBuff = bcrypto.hash160(Buffer.from(pubkey));

    console.log('recovered pubkey (compressed hex):', Buffer.from(pubkey).toString('hex'));
    console.log('recovered pubkey (uncompressed hex):', pubStr);

    const ethAddress = ethers.keccak256('0x'+pubStr.slice(2)).slice(-40);
    console.log('eth', '0x'+ethAddress);
    console.log('btc mainnet', toBase58Check(pubBuff, 0x00));
    console.log('btc testnet', toBase58Check(pubBuff, 0x6f));
})();