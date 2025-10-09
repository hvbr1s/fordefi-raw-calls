// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/access/Ownable.sol";

contract isClient is Ownable {

    mapping(string => bool) private _clients; // encrypted addresses

    event RemovedClient(string organization_id);
    event AddedClient(string organization_id);
    event IsClient(string client);

    error AlreadyClient();
    error AlreadyRemoved();

    constructor(address owner_) Ownable(owner_){}

    function checkIsClient(string memory client) public view returns(bool) {
        require(_clients[client], "Not a client!");
        return true;
    }

    function addClient(string memory client, string memory organization_id) external onlyOwner {
        if (_clients[client] == true){
            revert AlreadyClient();
        }
        _clients[client] = true;

        emit AddedClient(organization_id);
    }

    function removeClient(string memory client, string memory organization_id) external onlyOwner {
        if (_clients[client] == false){
            revert AlreadyRemoved();
        }
        _clients[client] = false;

        emit RemovedClient(organization_id);
    }
}
