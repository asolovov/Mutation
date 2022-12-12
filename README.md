# ERC-721 contract with mutation mechanics

It allows to add ERC-721 contracts and for each contract give any number of token ids that randomly will mint when user `mutate` function. Two given tokens from collection that was added by contract owner will be transfer to current contract (which is similar to burning due to no token withdraw functions from current contract) and new token will be minted.

* Owner can set any mutation price but nor 0
* Owner can pause collection, so no mutation will work for it

For more information see contract commentaries and unit tests

Try running some of the following tasks:

```shell
npx hardhat test
npx hardhat run scripts/deploy.js
```
