// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract Messenger is SepoliaConfig {
    event Message(address indexed _from, address indexed _to, euint32 message);

    function sendMessage(address _to, externalEuint32 message, bytes calldata inputProof) external {
        euint32 encryptedMessage = FHE.fromExternal(message, inputProof);
        require(FHE.isInitialized(encryptedMessage), "Encrypted message not initialized!");
        FHE.allowThis(encryptedMessage);
        FHE.allow(encryptedMessage, msg.sender);
        
        emit Message(msg.sender, _to, encryptedMessage);
    }
}