pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenTest is ERC721, Ownable {

    constructor(string memory name_, string memory symbol_)
    ERC721(name_, symbol_)
    {}

    function mintTo(address _to, uint256 _tokenId) external onlyOwner {
        _mint(_to, _tokenId);
    }
}
