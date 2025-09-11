// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint256, externalEuint256 } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract Messenger is SepoliaConfig {
    event Message(address indexed _from, address indexed _to, euint256 message);
    event ValidateMessage(euint256 indexed _encryptedMessage);

    function sendMessage(address _to, externalEuint256 message, bytes calldata inputProof) external {
        require(_to != address(0), "Cannot send to null address");

        euint256 encryptedMessage = FHE.fromExternal(message, inputProof);
        require(FHE.isInitialized(encryptedMessage), "Encrypted message not initialized!");
        emit ValidateMessage(encryptedMessage);

        FHE.allowThis(encryptedMessage);
        FHE.allow(encryptedMessage, msg.sender);
        emit Message(msg.sender, _to, encryptedMessage);
    }
}