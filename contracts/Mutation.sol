// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


/*
* Implementation of the NFT mutation mechanics based on {ERC721} Open Zeppelin contract.
*
* It allows to add ERC-721 contracts and for each contract give any number of token ids that randomly will mint when
* user `mutate` function. Two given tokens from collection that was added by contract owner will be transfer to current contract
* (which is similar to burning due to no token withdraw functions from current contract) and new token will be minted.
*
* - Owner can set any mutation price but nor 0
* - Owner can pause collection, so no mutation will work for it
*
* For more information see contract commentaries and unit tests
*/
contract Mutation is ERC721, Ownable {

    // data type for `_collections` mapping. Includes `tokenIDs` array that will be minted when `mutate` function see {Mutation-mutate}
    // is called, `pauseStatus` of the collection see {Mutation-pauseCollection} and `mutationPrice` for `mutate` function
    struct Collection {
        uint256[] tokenIDs;
        bool pauseStatus;
        uint256 mutationPrice;
    }

    // base URI for ERC721 tokens
    string internal baseURI;

    // collection address => collection data type see {Mutation-Collection}
    mapping(address => Collection) _collections;

    // mutation ERC721 token ID => collection address
    mapping(uint256 => address) _tokenIds;

    constructor(string memory name_, string memory symbol_, string memory baseURI_)
    ERC721(name_, symbol_)
    {
        baseURI = baseURI_;
    }

    /*
     * @dev changes `baseURI` for current contract
     *
     * Requirements:
     * - caller should be an owner
     *
     * @param baseURI_ new `baseURI` for current contract
     */
    function changeBaseUri(string memory baseURI_) external onlyOwner {
        baseURI = baseURI_;
    }

    ////////////////////////////////////////        Mutation logic    /////////////////////////////////////////////////

    /*
     * @dev transfers tokens for given `tokenID1` and `tokenID2` from `collection` to current token and mints ERC721 token
     * from current contract with random token ID from `tokenIDs` see {Mutation-Collection}. Deletes minted token id
     * from `tokenIDs`
     *
     * Requirements:
     * - `collection` should not be a zero address
     * - collection should be added see {Mutation-addCollection}
     * - signer should be an owner of `tokenID1` and `tokenID2`
     * - collection should not be paused see {Mutation-pauseCollection}
     * - value sanded by transaction should be more or equal to `mutationPrice` see {Mutation-Collection}
     * - there should be more than 0 tokens in `tokenIDs` see {Mutation-Collection}
     *
     * @param tokenID1   token id of given collection that will be sanded to current contract
     * @param tokenID2   token id of given collection that will be sanded to current contract
     * @param collection collection address
     */
    function mutate(uint256 tokenID1, uint256 tokenID2, address collection) external payable {
        require(collection != address(0), "Mutation: collection address is a zero address!");
        require(_isCollectionAdded(collection), "Mutation: collection is not added!");
        require(IERC721(collection).ownerOf(tokenID1) == msg.sender, "Mutation: you are not an owner of token id 1!");
        require(IERC721(collection).ownerOf(tokenID2) == msg.sender, "Mutation: you are not an owner of token id 2!");
        require(!_isCollectionPaused(collection), "Mutation: collection is paused!");
        require(msg.value >= _collections[collection].mutationPrice, "Mutation: not enough funds!");
        require(_isMutationAvailable(collection), "Mutation: no tokens available to mint");

        IERC721(collection).transferFrom(msg.sender, address(this), tokenID1);
        IERC721(collection).transferFrom(msg.sender, address(this), tokenID2);

        uint256 tokenIDIndex = _randomChooseTokenIdIndex(collection);
        uint256[] memory tokenIDs = _collections[collection].tokenIDs;

        _mint(msg.sender, tokenIDs[tokenIDIndex]);

        _collections[collection].tokenIDs[tokenIDIndex] = tokenIDs[tokenIDs.length - 1];
        _collections[collection].tokenIDs.pop();
    }

    ////////////////////////////////////        Managing collections      /////////////////////////////////////////////

    /*
     * @dev adds collection to `_collections` mapping that allows to `mutate` collection tokens
     *
     * Requirements:
     * - signer should be an owner
     * - `collection` should not be a zero address
     * - collection should not be added
     * - there should be more than 0 tokens in `tokenIDs`
     * - all token ids in `tokenIDs` should not be minted or added in other collections
     * - `_mutationPrice` should be more than 0
     *
     * @param collection     collection address
     * @param tokenIDs       array of token ids that will be minted when `mutate` is used
     * @param _mutationPrice price to use `mutate` function
     */
    function addCollection(address collection, uint256[] memory tokenIDs, uint256 _mutationPrice) external onlyOwner {
        require(collection != address(0), "Mutation: collection address is a zero address!");
        require(!_isCollectionAdded(collection), "Mutation: collection is already added!");
        require(tokenIDs.length != 0, "Mutation: should be at least one tokenID in tokenIDs!");
        require(_idsValidation(tokenIDs), "Mutation: token id duplicated!");
        require(_mutationPrice != 0, "Mutation: mutation price should be more than 0");

        _collections[collection] = Collection(tokenIDs, false, _mutationPrice);
        _addTokenIDs(tokenIDs, collection);
    }

    /*
     * @dev allows to pause collection
     *
     * Requirements:
     * - signer should be an owner
     * - `collection` should not be a zero address
     * - collection should be added
     * - collection should not be paused
     *
     * @param collection     collection address
     */
    function pauseCollection(address collection) external onlyOwner {
        require(collection != address(0), "Mutation: collection address is a zero address!");
        require(_isCollectionAdded(collection), "Mutation: collection is not added!");
        require(!_isCollectionPaused(collection), "Mutation: collection is already paused!");

        _collections[collection].pauseStatus = true;
    }

    /*
     * @dev allows to unpause collection
     *
     * Requirements:
     * - signer should be an owner
     * - `collection` should not be a zero address
     * - collection should be added
     * - collection should be paused
     *
     * @param collection     collection address
     */
    function unpauseCollection(address collection) external onlyOwner {
        require(collection != address(0), "Mutation: collection address is a zero address!");
        require(_isCollectionAdded(collection), "Mutation: collection is not added!");
        require(_isCollectionPaused(collection), "Mutation: collection is not paused!");

        _collections[collection].pauseStatus = false;
    }

    /*
     * @dev allows to set `newMutationPrice` for `collection`
     *
     * Requirements:
     * - signer should be an owner
     * - `collection` should not be a zero address
     * - collection should be added
     * - `newMutationPrice` should be more than 0
     *
     * @param collection       collection address
     * @param newMutationPrice new price for mutation for given collection
     */
    function setMutationPrice(address collection, uint256 newMutationPrice) external onlyOwner {
        require(collection != address(0), "Mutation: collection address is a zero address!");
        require(_isCollectionAdded(collection), "Mutation: collection is not added!");
        require(newMutationPrice != 0, "Mutation: mutation price should be more than 0");

        _collections[collection].mutationPrice = newMutationPrice;
    }

    /////////////////////////////////        Collections view functions      //////////////////////////////////////////

    /*
     * @dev return `Collection` data type for given `collection` address
     * @param collection       collection address
     * @return Collection data type
     */
    function getCollection(address collection) public view returns(Collection memory) {
        return _collections[collection];
    }

    /*
     * @dev return `mutationPrice` from `Collection` data type for given `collection` address
     * @param collection       collection address
     * @return price for mutation for given collection
     */
    function getMutationPrice(address collection) external view returns (uint256) {
        return _collections[collection].mutationPrice;
    }

    /*
     * @dev check if collection was added
     * @param collection       collection address
     * @return true if collection was added, false if was not
     */
    function isCollectionAdded(address collection) external view returns(bool) {
        return _isCollectionAdded(collection);
    }

    /*
     * @dev check if collection is paused
     * @param collection       collection address
     * @return true if collection is paused, false if not
     */
    function isCollectionPaused(address collection) external view returns(bool) {
        return _isCollectionPaused(collection);
    }

    /*
     * @dev returns collection address for given ERC721 token id of current contract that was not minted yet
     * @param tokenID  ERC721 token id
     * @return collection address tokens from which should be mutated to get current `tokenID`
     */
    function getCollectionAddressByTokenID(uint256 tokenID) external view returns (address) {
        return _tokenIds[tokenID];
    }

    ///////////////////////////////////        Internal functions      ////////////////////////////////////////////////

    // return baseURI
    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    // update `_tokenIds` mapping with collection addresses
    function _addTokenIDs(uint256[] memory tokenIds, address collection) internal {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _tokenIds[tokenIds[i]] = collection;
        }
    }

    // check if there is any tokens in `tokenIDs` array in Collection data type for given collection address
    // true if there is tokens, false if there is not
    function _isMutationAvailable(address collection) internal view returns(bool) {
        if (_collections[collection].tokenIDs.length > 0) {
            return true;
        }

        return false;
    }

    // check if given token ids are not minted and not in `_tokenIds` mapping
    // if all tokens are valid returns true, if not returns false
    function _idsValidation(uint256[] memory tokenIds) internal view returns(bool) {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (_tokenIds[tokenIds[i]] != address(0) || _exists(tokenIds[i])) {
                return false;
            }
        }

        return true;
    }

    // returns random index for given collection from `tokenIDs` array in Collection data type for given collection address
    // if there is only one token, returns 0 index
    function _randomChooseTokenIdIndex(address collection) internal returns(uint256) {
        if (_collections[collection].tokenIDs.length > 1) {
            uint random = uint(keccak256(abi.encodePacked(msg.sender, block.timestamp)));
            random = random % (_collections[collection].tokenIDs.length - 1);

            return random;
        }
        return 0;
    }

    // returns true if collection paused and false if not
    function _isCollectionPaused(address collection) internal view returns(bool) {
        return _collections[collection].pauseStatus;
    }

    // returns true if collection added and false if not
    function _isCollectionAdded(address collection) internal view returns(bool) {
        if (_collections[collection].mutationPrice == 0) {
            return false;
        } else {
            return true;
        }
    }
}
