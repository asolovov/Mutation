const { expect } = require("chai");
const {loadFixture} = require("@nomicfoundation/hardhat-network-helpers");
const {ethers} = require("hardhat");

// Can add tests for standard ERC-721 functions such as `transfer`, `approve` etc.

describe("Staking unit tests", function () {

    const name = 'MUT Token';
    const symbol = 'MUT';
    const uri = '/';

    const nameTest = 'test'
    const symbolTest = 'test'

    const zeroAddress = '0x0000000000000000000000000000000000000000';

    async function deployMutationFixture() {
        const [owner, address1, address2] = await ethers.getSigners();

        const Mutation = await ethers.getContractFactory("Mutation");
        const mutation = await Mutation.deploy(
            name,
            symbol,
            uri
        );

        const ERC721 = await ethers.getContractFactory("TokenTest");
        const erc721 = await ERC721.deploy(
            nameTest,
            symbolTest
        );

        const ERC721_2 = await ethers.getContractFactory("TokenTest");
        const erc721_2 = await ERC721_2.deploy(
            nameTest,
            symbolTest
        );

        return {mutation, erc721, erc721_2, owner, address1, address2};
    }

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const {mutation, owner} = await loadFixture(deployMutationFixture);

            expect(await mutation.owner()).to.equal(owner.address);
        });

        it("Should deploy with proper address", async function () {
            const {mutation} = await loadFixture(deployMutationFixture);

            expect(mutation.address).to.be.properAddress;
        });

        it("Should have right name", async function () {
            const {mutation} = await loadFixture(deployMutationFixture);

            expect(await mutation.name()).to.equal(name);
        });

        it("Should have right symbol", async function () {
            const {mutation} = await loadFixture(deployMutationFixture);

            expect(await mutation.symbol()).to.equal(symbol);
        });

    })

    describe("Add collection", function () {
        it("Should add collection", async function () {
            const {mutation, erc721} = await loadFixture(deployMutationFixture);
            const tokens = [0, 1, 2, 3, 4];
            const mutationPrice = 10;

            await mutation.addCollection(erc721.address, tokens, mutationPrice);

            expect(await mutation.isCollectionAdded(erc721.address)).to.equal(true);
        });

        it("Should add collection with right args", async function () {
            const {mutation, erc721} = await loadFixture(deployMutationFixture);
            const tokens = [0, 1, 2, 3, 4];
            const mutationPrice = 10;

            await mutation.addCollection(erc721.address, tokens, mutationPrice);
            const collection = await mutation.getCollection(erc721.address);

            collection.tokenIDs.forEach((value, index) => {
                expect(value).to.equal(tokens[index]);
            })
            expect(collection.pauseStatus).to.equal(false);
            expect(collection.mutationPrice).to.equal(mutationPrice);
        });

        it("Should add token ids in token ids array", async function () {
            const {mutation, erc721} = await loadFixture(deployMutationFixture);
            const tokens = [0, 1, 2, 3, 4];
            const mutationPrice = 10;

            await mutation.addCollection(erc721.address, tokens, mutationPrice);

            for (const value of tokens) {
                expect(await mutation.getCollectionAddressByTokenID(value)).to.equal(erc721.address);
            }
        });

        it("Should not add collection for not owner", async function () {
            const {mutation, erc721, address1} = await loadFixture(deployMutationFixture);
            const tokens = [0, 1, 2, 3, 4];
            const mutationPrice = 10;

            const tx = mutation.connect(address1).addCollection(erc721.address, tokens, mutationPrice);

            await expect(tx).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should not add collection if collection address is a zero address", async function () {
            const {mutation} = await loadFixture(deployMutationFixture);
            const tokens = [0, 1, 2, 3, 4];
            const mutationPrice = 10;

            const tx = mutation.addCollection(zeroAddress, tokens, mutationPrice);

            await expect(tx).to.be.revertedWith("Mutation: collection address is a zero address!");
        });

        it("Should not add collection if already added", async function () {
            const {mutation, erc721} = await loadFixture(deployMutationFixture);
            const tokens = [0, 1, 2, 3, 4];
            const mutationPrice = 10;

            await mutation.addCollection(erc721.address, tokens, mutationPrice);
            const tx = mutation.addCollection(erc721.address, tokens, mutationPrice);

            await expect(tx).to.be.revertedWith("Mutation: collection is already added!");
        });

        it("Should not add collection if tokens array is null", async function () {
            const {mutation, erc721} = await loadFixture(deployMutationFixture);
            const tokens = [];
            const mutationPrice = 10;

            const tx = mutation.addCollection(erc721.address, tokens, mutationPrice);

            await expect(tx).to.be.revertedWith("Mutation: should be at least one tokenID in tokenIDs!");
        });

        it("Should not add collection if token id in tokens array is duplicated with another collection", async function () {
            const {mutation, erc721, erc721_2} = await loadFixture(deployMutationFixture);
            const tokens1 = [0, 1, 2, 3, 4];
            const mutationPrice1 = 10;

            const tokens2 = [4, 5];
            const mutationPrice2 = 15;

            await mutation.addCollection(erc721.address, tokens1, mutationPrice1);
            const tx = mutation.addCollection(erc721_2.address, tokens2, mutationPrice2);

            await expect(tx).to.be.revertedWith("Mutation: token id duplicated!");
        });

        it("Should not add collection if token id in tokens array is already minted", async function () {
            const {mutation, erc721, erc721_2, address1} = await loadFixture(deployMutationFixture);
            const tokens1 = [0];
            const mutationPrice1 = 10;
            const tokens2 = [0, 1];
            const mutationPrice2 = 10;

            await mutation.addCollection(erc721.address, tokens1, mutationPrice1);

            await erc721.mintTo(address1.address, 0);
            await erc721.mintTo(address1.address, 1);
            await erc721.connect(address1).setApprovalForAll(mutation.address, true);

            await mutation.connect(address1).mutate(0, 1, erc721.address, { value: mutationPrice1 });

            const tx = mutation.addCollection(erc721_2.address, tokens2, mutationPrice2);

            await expect(tx).to.be.revertedWith("Mutation: token id duplicated!");
        });

        it("Should not add collection if mutation price is 0", async function () {
            const {mutation, erc721} = await loadFixture(deployMutationFixture);
            const tokens = [0, 1, 2, 3, 4];
            const mutationPrice = 0;

            const tx = mutation.addCollection(erc721.address, tokens, mutationPrice);

            await expect(tx).to.be.revertedWith("Mutation: mutation price should be more than 0");
        });

    })

    describe("Pausing collection", function () {
        describe("Pause", function () {
            it("Should pause collection", async function () {
                const {mutation, erc721} = await loadFixture(deployMutationFixture);
                const tokens = [0, 1, 2, 3, 4];
                const mutationPrice = 10;

                await mutation.addCollection(erc721.address, tokens, mutationPrice);
                await mutation.pauseCollection(erc721.address);

                expect(await mutation.isCollectionPaused(erc721.address)).to.equal(true);
            });

            it("Should not pause collection for not owner", async function () {
                const {mutation, address1, erc721} = await loadFixture(deployMutationFixture);
                const tokens = [0, 1, 2, 3, 4];
                const mutationPrice = 10;

                await mutation.addCollection(erc721.address, tokens, mutationPrice);
                const tx = mutation.connect(address1).pauseCollection(erc721.address);

                await expect(tx).to.be.revertedWith("Ownable: caller is not the owner");
            });

            it("Should not pause collection if collection address is a zero address", async function () {
                const {mutation} = await loadFixture(deployMutationFixture);

                const tx = mutation.pauseCollection(zeroAddress);

                await expect(tx).to.be.revertedWith("Mutation: collection address is a zero address!");
            });

            it("Should not pause collection if it is not added", async function () {
                const {mutation, erc721} = await loadFixture(deployMutationFixture);

                const tx = mutation.pauseCollection(erc721.address);

                await expect(tx).to.be.revertedWith("Mutation: collection is not added!");
            });

            it("Should not pause collection if already paused", async function () {
                const {mutation, address1, erc721} = await loadFixture(deployMutationFixture);
                const tokens = [0, 1, 2, 3, 4];
                const mutationPrice = 10;

                await mutation.addCollection(erc721.address, tokens, mutationPrice);
                await mutation.pauseCollection(erc721.address);
                const tx = mutation.pauseCollection(erc721.address);

                await expect(tx).to.be.revertedWith("Mutation: collection is already paused!");
            });
        })

        describe("Unpause", function () {
            it("Should unpause collection", async function () {
                const {mutation, erc721} = await loadFixture(deployMutationFixture);
                const tokens = [0, 1, 2, 3, 4];
                const mutationPrice = 10;

                await mutation.addCollection(erc721.address, tokens, mutationPrice);

                await mutation.pauseCollection(erc721.address);
                expect(await mutation.isCollectionPaused(erc721.address)).to.equal(true);

                await mutation.unpauseCollection(erc721.address);

                expect(await mutation.isCollectionPaused(erc721.address)).to.equal(false);
            });

            it("Should not unpause collection for not owner", async function () {
                const {mutation, address1, erc721} = await loadFixture(deployMutationFixture);
                const tokens = [0, 1, 2, 3, 4];
                const mutationPrice = 10;

                await mutation.addCollection(erc721.address, tokens, mutationPrice);

                await mutation.pauseCollection(erc721.address);
                expect(await mutation.isCollectionPaused(erc721.address)).to.equal(true);

                const tx = mutation.connect(address1).unpauseCollection(erc721.address);

                await expect(tx).to.be.revertedWith("Ownable: caller is not the owner");
            });

            it("Should not unpause collection if collection address is a zero address", async function () {
                const {mutation} = await loadFixture(deployMutationFixture);

                const tx = mutation.unpauseCollection(zeroAddress);

                await expect(tx).to.be.revertedWith("Mutation: collection address is a zero address!");
            });

            it("Should not unpause collection if it is not added", async function () {
                const {mutation, erc721} = await loadFixture(deployMutationFixture);

                const tx = mutation.unpauseCollection(erc721.address);

                await expect(tx).to.be.revertedWith("Mutation: collection is not added!");
            });

            it("Should not unpause collection if not paused", async function () {
                const {mutation, erc721} = await loadFixture(deployMutationFixture);
                const tokens = [0, 1, 2, 3, 4];
                const mutationPrice = 10;

                await mutation.addCollection(erc721.address, tokens, mutationPrice);
                const tx = mutation.unpauseCollection(erc721.address);

                await expect(tx).to.be.revertedWith("Mutation: collection is not paused!");
            });
        })
    })

    describe("Set mutation price", function () {
        it("Should set mutation price", async function () {
            const {mutation, erc721} = await loadFixture(deployMutationFixture);
            const tokens = [0, 1, 2, 3, 4];
            const mutationPrice = 10;
            const newMutationPrice = 15;

            await mutation.addCollection(erc721.address, tokens, mutationPrice);
            expect(await mutation.getMutationPrice(erc721.address)).to.equal(mutationPrice);

            await mutation.setMutationPrice(erc721.address, newMutationPrice);

            expect(await mutation.getMutationPrice(erc721.address)).to.equal(newMutationPrice);
        });

        it("Should not set mutation price for not owner", async function () {
            const {mutation, erc721, address1} = await loadFixture(deployMutationFixture);
            const tokens = [0, 1, 2, 3, 4];
            const mutationPrice = 10;
            const newMutationPrice = 15;

            await mutation.addCollection(erc721.address, tokens, mutationPrice);
            expect(await mutation.getMutationPrice(erc721.address)).to.equal(mutationPrice);

            const tx = mutation.connect(address1).setMutationPrice(erc721.address, newMutationPrice);

            await expect(tx).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should not set mutation price if collection address is a zero address", async function () {
            const {mutation, erc721} = await loadFixture(deployMutationFixture);
            const newMutationPrice = 15;

            const tx = mutation.setMutationPrice(zeroAddress, newMutationPrice);

            await expect(tx).to.be.revertedWith("Mutation: collection address is a zero address!");
        });

        it("Should not set mutation price if collection is not added", async function () {
            const {mutation, erc721} = await loadFixture(deployMutationFixture);
            const newMutationPrice = 15;

            const tx = mutation.setMutationPrice(erc721.address, newMutationPrice);

            await expect(tx).to.be.revertedWith("Mutation: collection is not added!");
        });

        it("Should not set mutation price if it is 0", async function () {
            const {mutation, erc721} = await loadFixture(deployMutationFixture);
            const tokens = [0, 1, 2, 3, 4];
            const mutationPrice = 10;
            const newMutationPrice = 0;

            await mutation.addCollection(erc721.address, tokens, mutationPrice);
            expect(await mutation.getMutationPrice(erc721.address)).to.equal(mutationPrice);

            const tx = mutation.setMutationPrice(erc721.address, newMutationPrice);

            await expect(tx).to.be.revertedWith("Mutation: mutation price should be more than 0");
        });

    })

    describe("Mutate", function () {

        it("Should not mint token to signer if signer is not owner of token id 1", async function () {
            const {mutation, erc721, address1, address2} = await loadFixture(deployMutationFixture);
            const tokens = [0];
            const mutationPrice = 10;

            await erc721.mintTo(address2.address, 0);
            await erc721.mintTo(address1.address, 1);
            await erc721.connect(address1).setApprovalForAll(mutation.address, true);

            await mutation.addCollection(erc721.address, tokens, mutationPrice);

            const tx = mutation.connect(address1).mutate(0, 1, erc721.address, { value: mutationPrice });

            await expect(tx).to.be.revertedWith("Mutation: you are not an owner of token id 1!");
        });

        it("Should not mint token to signer if signer is not owner of token id 1", async function () {
            const {mutation, erc721, address1, address2} = await loadFixture(deployMutationFixture);
            const tokens = [0];
            const mutationPrice = 10;

            await erc721.mintTo(address1.address, 0);
            await erc721.mintTo(address2.address, 1);
            await erc721.connect(address1).setApprovalForAll(mutation.address, true);

            await mutation.addCollection(erc721.address, tokens, mutationPrice);

            const tx = mutation.connect(address1).mutate(0, 1, erc721.address, { value: mutationPrice });

            await expect(tx).to.be.revertedWith("Mutation: you are not an owner of token id 2!");
        });

        it("Should not mint token to signer if collection address is a zero address", async function () {
            const {mutation, erc721, address1} = await loadFixture(deployMutationFixture);
            const tokens = [0];
            const mutationPrice = 10;

            await erc721.mintTo(address1.address, 0);
            await erc721.mintTo(address1.address, 1);
            await erc721.connect(address1).setApprovalForAll(mutation.address, true);

            await mutation.addCollection(erc721.address, tokens, mutationPrice);

            const tx = mutation.connect(address1).mutate(0, 1, zeroAddress, { value: mutationPrice });

            await expect(tx).to.be.revertedWith("Mutation: collection address is a zero address!");
        });

        it("Should not mint token to signer if collection is not added", async function () {
            const {mutation, erc721, address1} = await loadFixture(deployMutationFixture);

            const tx = mutation.connect(address1).mutate(0, 1, erc721.address, { value: 10 });

            await expect(tx).to.be.revertedWith("Mutation: collection is not added!");
        });

        it("Should not mint token to signer if collection is paused", async function () {
            const {mutation, erc721, address1} = await loadFixture(deployMutationFixture);
            const tokens = [0];
            const mutationPrice = 10;

            await erc721.mintTo(address1.address, 0);
            await erc721.mintTo(address1.address, 1);
            await erc721.connect(address1).setApprovalForAll(mutation.address, true);

            await mutation.addCollection(erc721.address, tokens, mutationPrice);
            await mutation.pauseCollection(erc721.address);

            const tx = mutation.connect(address1).mutate(0, 1, erc721.address, { value: mutationPrice });

            await expect(tx).to.be.revertedWith("Mutation: collection is paused!");
        });

        it("Should not mint token to signer if value is not enough to mutate", async function () {
            const {mutation, erc721, address1} = await loadFixture(deployMutationFixture);
            const tokens = [0];
            const mutationPrice = 10;

            await erc721.mintTo(address1.address, 0);
            await erc721.mintTo(address1.address, 1);
            await erc721.connect(address1).setApprovalForAll(mutation.address, true);

            await mutation.addCollection(erc721.address, tokens, mutationPrice);

            const tx = mutation.connect(address1).mutate(0, 1, erc721.address, { value: 1 });

            await expect(tx).to.be.revertedWith("Mutation: not enough funds!");
        });

        describe("One token one collection", function () {
            it("Should mint token to signer", async function () {
                const {mutation, erc721, address1} = await loadFixture(deployMutationFixture);
                const tokens = [0];
                const mutationPrice = 10;

                await erc721.mintTo(address1.address, 0);
                await erc721.mintTo(address1.address, 1);
                await erc721.connect(address1).setApprovalForAll(mutation.address, true);

                await mutation.addCollection(erc721.address, tokens, mutationPrice);

                await mutation.connect(address1).mutate(0, 1, erc721.address, { value: mutationPrice });

                expect(await mutation.ownerOf(tokens[0])).to.equal(address1.address);
            });

            it("Should transfer token1 and token2 from erc721 to mutation contract", async function () {
                const {mutation, erc721, address1} = await loadFixture(deployMutationFixture);
                const tokens = [0];
                const mutationPrice = 10;

                await erc721.mintTo(address1.address, 0);
                await erc721.mintTo(address1.address, 1);
                await erc721.connect(address1).setApprovalForAll(mutation.address, true);

                await mutation.addCollection(erc721.address, tokens, mutationPrice);

                await mutation.connect(address1).mutate(0, 1, erc721.address, { value: mutationPrice });

                expect(await erc721.ownerOf(0)).to.equal(mutation.address);
                expect(await erc721.ownerOf(1)).to.equal(mutation.address);
            });

            it("Should delete minted ID from tokens array", async function () {
                const {mutation, erc721, address1} = await loadFixture(deployMutationFixture);
                const tokens = [0];
                const mutationPrice = 10;

                await erc721.mintTo(address1.address, 0);
                await erc721.mintTo(address1.address, 1);
                await erc721.connect(address1).setApprovalForAll(mutation.address, true);

                await mutation.addCollection(erc721.address, tokens, mutationPrice);

                await mutation.connect(address1).mutate(0, 1, erc721.address, { value: mutationPrice });
                const collection = await mutation.getCollection(erc721.address);

                expect(collection.tokenIDs.length).to.equal(0);
            });

            it("Should not mint token when no token available", async function () {
                const {mutation, erc721, address1} = await loadFixture(deployMutationFixture);
                const tokens = [0];
                const mutationPrice = 10;

                await erc721.mintTo(address1.address, 0);
                await erc721.mintTo(address1.address, 1);
                await erc721.mintTo(address1.address, 2);
                await erc721.mintTo(address1.address, 3);
                await erc721.connect(address1).setApprovalForAll(mutation.address, true);

                await mutation.addCollection(erc721.address, tokens, mutationPrice);

                await mutation.connect(address1).mutate(0, 1, erc721.address, { value: mutationPrice });
                const tx = mutation.connect(address1).mutate(2, 3, erc721.address, { value: mutationPrice });

                await expect(tx).to.be.revertedWith("Mutation: no tokens available to mint");
            });
        })

        describe("Several tokens one collection", function () {
            it("Should mint token to signer", async function () {
                const {mutation, erc721, address1} = await loadFixture(deployMutationFixture);
                const tokens = [0, 1, 2];
                const mutationPrice = 10;

                await erc721.mintTo(address1.address, 0);
                await erc721.mintTo(address1.address, 1);
                await erc721.connect(address1).setApprovalForAll(mutation.address, true);

                await mutation.addCollection(erc721.address, tokens, mutationPrice);

                const mutate = await mutation.connect(address1).mutate(0, 1, erc721.address, { value: mutationPrice });
                const event = await mutate.wait();

                const mintedId = +event.events[event.events.length - 1].args.tokenId.toString();

                expect(await mutation.ownerOf(mintedId)).to.equal(address1.address);
            });

            it("Should transfer token1 and token2 from erc721 to mutation contract", async function () {
                const {mutation, erc721, address1} = await loadFixture(deployMutationFixture);
                const tokens = [0, 1];
                const mutationPrice = 10;

                await erc721.mintTo(address1.address, 0);
                await erc721.mintTo(address1.address, 1);
                await erc721.connect(address1).setApprovalForAll(mutation.address, true);

                await mutation.addCollection(erc721.address, tokens, mutationPrice);

                await mutation.connect(address1).mutate(0, 1, erc721.address, { value: mutationPrice });

                expect(await erc721.ownerOf(0)).to.equal(mutation.address);
                expect(await erc721.ownerOf(1)).to.equal(mutation.address);
            });

            it("Should delete minted ID from tokens array", async function () {
                const {mutation, erc721, address1} = await loadFixture(deployMutationFixture);
                const tokens = [0, 1];
                const mutationPrice = 10;

                await erc721.mintTo(address1.address, 0);
                await erc721.mintTo(address1.address, 1);
                await erc721.connect(address1).setApprovalForAll(mutation.address, true);

                await mutation.addCollection(erc721.address, tokens, mutationPrice);

                await mutation.connect(address1).mutate(0, 1, erc721.address, { value: mutationPrice });

                const collection = await mutation.getCollection(erc721.address);

                expect(collection.tokenIDs.length).to.equal(1);
            });

            it("Should not mint token when no token available", async function () {
                const {mutation, erc721, address1} = await loadFixture(deployMutationFixture);
                const tokens = [0, 1];
                const mutationPrice = 10;

                await erc721.mintTo(address1.address, 0);
                await erc721.mintTo(address1.address, 1);
                await erc721.mintTo(address1.address, 2);
                await erc721.mintTo(address1.address, 3);
                await erc721.mintTo(address1.address, 4);
                await erc721.mintTo(address1.address, 5);
                await erc721.connect(address1).setApprovalForAll(mutation.address, true);

                await mutation.addCollection(erc721.address, tokens, mutationPrice);

                await mutation.connect(address1).mutate(0, 1, erc721.address, { value: mutationPrice });
                await mutation.connect(address1).mutate(2, 3, erc721.address, { value: mutationPrice });
                const tx = mutation.connect(address1).mutate(4, 5, erc721.address, { value: mutationPrice });

                await expect(tx).to.be.revertedWith("Mutation: no tokens available to mint");
            });
        })

        describe("One token for several collections", function () {
            it("Should mint tokens to signer", async function () {
                const {mutation, erc721, erc721_2, address1} = await loadFixture(deployMutationFixture);
                const tokens1 = [0];
                const mutationPrice1 = 10;

                const tokens2 = [1];
                const mutationPrice2 = 15;

                await erc721.mintTo(address1.address, 0);
                await erc721.mintTo(address1.address, 1);
                await erc721_2.mintTo(address1.address, 0);
                await erc721_2.mintTo(address1.address, 1);
                await erc721.connect(address1).setApprovalForAll(mutation.address, true);
                await erc721_2.connect(address1).setApprovalForAll(mutation.address, true);

                await mutation.addCollection(erc721.address, tokens1, mutationPrice1);
                await mutation.addCollection(erc721_2.address, tokens2, mutationPrice2);

                await mutation.connect(address1).mutate(0, 1, erc721.address, { value: mutationPrice1 });
                await mutation.connect(address1).mutate(0, 1, erc721_2.address, { value: mutationPrice2 });

                expect(await mutation.ownerOf(tokens1[0])).to.equal(address1.address);
                expect(await mutation.ownerOf(tokens2[0])).to.equal(address1.address);
            });

            it("Should transfer token1 and token2 from erc721 to mutation contract", async function () {
                const {mutation, erc721, erc721_2, address1} = await loadFixture(deployMutationFixture);
                const tokens1 = [0];
                const mutationPrice1 = 10;

                const tokens2 = [1];
                const mutationPrice2 = 15;

                await erc721.mintTo(address1.address, 0);
                await erc721.mintTo(address1.address, 1);
                await erc721_2.mintTo(address1.address, 0);
                await erc721_2.mintTo(address1.address, 1);
                await erc721.connect(address1).setApprovalForAll(mutation.address, true);
                await erc721_2.connect(address1).setApprovalForAll(mutation.address, true);

                await mutation.addCollection(erc721.address, tokens1, mutationPrice1);
                await mutation.addCollection(erc721_2.address, tokens2, mutationPrice2);

                await mutation.connect(address1).mutate(0, 1, erc721.address, { value: mutationPrice1 });
                await mutation.connect(address1).mutate(0, 1, erc721_2.address, { value: mutationPrice2 });

                expect(await erc721.ownerOf(0)).to.equal(mutation.address);
                expect(await erc721.ownerOf(1)).to.equal(mutation.address);
                expect(await erc721_2.ownerOf(0)).to.equal(mutation.address);
                expect(await erc721_2.ownerOf(1)).to.equal(mutation.address);
            });

            it("Should delete minted ID from tokens array", async function () {
                const {mutation, erc721, erc721_2, address1} = await loadFixture(deployMutationFixture);
                const tokens1 = [0];
                const mutationPrice1 = 10;

                const tokens2 = [1];
                const mutationPrice2 = 15;

                await erc721.mintTo(address1.address, 0);
                await erc721.mintTo(address1.address, 1);
                await erc721_2.mintTo(address1.address, 0);
                await erc721_2.mintTo(address1.address, 1);
                await erc721.connect(address1).setApprovalForAll(mutation.address, true);
                await erc721_2.connect(address1).setApprovalForAll(mutation.address, true);

                await mutation.addCollection(erc721.address, tokens1, mutationPrice1);
                await mutation.addCollection(erc721_2.address, tokens2, mutationPrice2);

                await mutation.connect(address1).mutate(0, 1, erc721.address, { value: mutationPrice1 });
                await mutation.connect(address1).mutate(0, 1, erc721_2.address, { value: mutationPrice2 });

                const collection1 = await mutation.getCollection(erc721.address);
                const collection2 = await mutation.getCollection(erc721_2.address);

                expect(collection1.tokenIDs.length).to.equal(0);
                expect(collection2.tokenIDs.length).to.equal(0);
            });

            it("Should not mint token when no token available", async function () {
                const {mutation, erc721, erc721_2, address1} = await loadFixture(deployMutationFixture);
                const tokens1 = [0];
                const mutationPrice1 = 10;

                const tokens2 = [1];
                const mutationPrice2 = 15;

                await erc721.mintTo(address1.address, 0);
                await erc721.mintTo(address1.address, 1);
                await erc721.mintTo(address1.address, 2);
                await erc721.mintTo(address1.address, 3);
                await erc721_2.mintTo(address1.address, 0);
                await erc721_2.mintTo(address1.address, 1);
                await erc721_2.mintTo(address1.address, 2);
                await erc721_2.mintTo(address1.address, 3);
                await erc721.connect(address1).setApprovalForAll(mutation.address, true);
                await erc721_2.connect(address1).setApprovalForAll(mutation.address, true);

                await mutation.addCollection(erc721.address, tokens1, mutationPrice1);
                await mutation.addCollection(erc721_2.address, tokens2, mutationPrice2);

                await mutation.connect(address1).mutate(0, 1, erc721.address, { value: mutationPrice1 });
                await mutation.connect(address1).mutate(0, 1, erc721_2.address, { value: mutationPrice2 });

                const tx1 = mutation.connect(address1).mutate(2, 3, erc721.address, { value: mutationPrice1 });
                const tx2 = mutation.connect(address1).mutate(2, 3, erc721_2.address, { value: mutationPrice2 });

                await expect(tx1).to.be.revertedWith("Mutation: no tokens available to mint");
                await expect(tx2).to.be.revertedWith("Mutation: no tokens available to mint");
            });

        })

        describe("Several tokens for several collections", function () {
            it("Should mint tokens to signer", async function () {
                const {mutation, erc721, erc721_2, address1} = await loadFixture(deployMutationFixture);
                const tokens1 = [0, 1, 2];
                const mutationPrice1 = 10;

                const tokens2 = [3, 4, 5];
                const mutationPrice2 = 15;

                await erc721.mintTo(address1.address, 0);
                await erc721.mintTo(address1.address, 1);
                await erc721_2.mintTo(address1.address, 0);
                await erc721_2.mintTo(address1.address, 1);
                await erc721.connect(address1).setApprovalForAll(mutation.address, true);
                await erc721_2.connect(address1).setApprovalForAll(mutation.address, true);

                await mutation.addCollection(erc721.address, tokens1, mutationPrice1);
                await mutation.addCollection(erc721_2.address, tokens2, mutationPrice2);

                const mutation1 = await mutation.connect(address1).mutate(0, 1, erc721.address, { value: mutationPrice1 });
                const event1 = await mutation1.wait();
                const mintedId1 = +event1.events[event1.events.length - 1].args.tokenId.toString();

                const mutation2 = await mutation.connect(address1).mutate(0, 1, erc721_2.address, { value: mutationPrice2 });
                const event2 = await mutation2.wait();
                const mintedId2 = +event2.events[event2.events.length - 1].args.tokenId.toString();

                expect(await mutation.ownerOf(mintedId1)).to.equal(address1.address);
                expect(await mutation.ownerOf(mintedId2)).to.equal(address1.address);
            });

            it("Should transfer token1 and token2 from erc721 to mutation contract", async function () {
                const {mutation, erc721, erc721_2, address1} = await loadFixture(deployMutationFixture);
                const tokens1 = [0, 1, 2];
                const mutationPrice1 = 10;

                const tokens2 = [3, 4, 5];
                const mutationPrice2 = 15;

                await erc721.mintTo(address1.address, 0);
                await erc721.mintTo(address1.address, 1);
                await erc721_2.mintTo(address1.address, 0);
                await erc721_2.mintTo(address1.address, 1);
                await erc721.connect(address1).setApprovalForAll(mutation.address, true);
                await erc721_2.connect(address1).setApprovalForAll(mutation.address, true);

                await mutation.addCollection(erc721.address, tokens1, mutationPrice1);
                await mutation.addCollection(erc721_2.address, tokens2, mutationPrice2);

                await mutation.connect(address1).mutate(0, 1, erc721.address, { value: mutationPrice1 });
                await mutation.connect(address1).mutate(0, 1, erc721_2.address, { value: mutationPrice2 });

                expect(await erc721.ownerOf(0)).to.equal(mutation.address);
                expect(await erc721.ownerOf(1)).to.equal(mutation.address);
                expect(await erc721_2.ownerOf(0)).to.equal(mutation.address);
                expect(await erc721_2.ownerOf(1)).to.equal(mutation.address);
            });

            it("Should delete minted ID from tokens array", async function () {
                const {mutation, erc721, erc721_2, address1} = await loadFixture(deployMutationFixture);
                const tokens1 = [0, 1];
                const mutationPrice1 = 10;

                const tokens2 = [2, 3];
                const mutationPrice2 = 15;

                await erc721.mintTo(address1.address, 0);
                await erc721.mintTo(address1.address, 1);
                await erc721_2.mintTo(address1.address, 0);
                await erc721_2.mintTo(address1.address, 1);
                await erc721.connect(address1).setApprovalForAll(mutation.address, true);
                await erc721_2.connect(address1).setApprovalForAll(mutation.address, true);

                await mutation.addCollection(erc721.address, tokens1, mutationPrice1);
                await mutation.addCollection(erc721_2.address, tokens2, mutationPrice2);

                await mutation.connect(address1).mutate(0, 1, erc721.address, { value: mutationPrice1 });
                await mutation.connect(address1).mutate(0, 1, erc721_2.address, { value: mutationPrice2 });

                const collection1 = await mutation.getCollection(erc721.address);
                const collection2 = await mutation.getCollection(erc721_2.address);

                expect(collection1.tokenIDs.length).to.equal(1);
                expect(collection2.tokenIDs.length).to.equal(1);
            });

            it("Should not mint token when no token available", async function () {
                const {mutation, erc721, erc721_2, address1} = await loadFixture(deployMutationFixture);
                const tokens1 = [0, 1];
                const mutationPrice1 = 10;

                const tokens2 = [2, 3];
                const mutationPrice2 = 15;

                await erc721.mintTo(address1.address, 0);
                await erc721.mintTo(address1.address, 1);
                await erc721.mintTo(address1.address, 2);
                await erc721.mintTo(address1.address, 3);
                await erc721.mintTo(address1.address, 4);
                await erc721.mintTo(address1.address, 5);
                await erc721_2.mintTo(address1.address, 0);
                await erc721_2.mintTo(address1.address, 1);
                await erc721_2.mintTo(address1.address, 2);
                await erc721_2.mintTo(address1.address, 3);
                await erc721_2.mintTo(address1.address, 4);
                await erc721_2.mintTo(address1.address, 5);
                await erc721.connect(address1).setApprovalForAll(mutation.address, true);
                await erc721_2.connect(address1).setApprovalForAll(mutation.address, true);

                await mutation.addCollection(erc721.address, tokens1, mutationPrice1);
                await mutation.addCollection(erc721_2.address, tokens2, mutationPrice2);

                await mutation.connect(address1).mutate(0, 1, erc721.address, { value: mutationPrice1 });
                await mutation.connect(address1).mutate(2, 3, erc721.address, { value: mutationPrice1 });
                const tx1 = mutation.connect(address1).mutate(4, 5, erc721.address, { value: mutationPrice1 });

                await mutation.connect(address1).mutate(0, 1, erc721_2.address, { value: mutationPrice2 });
                await mutation.connect(address1).mutate(2, 3, erc721_2.address, { value: mutationPrice2 });
                const tx2 = mutation.connect(address1).mutate(4, 5, erc721_2.address, { value: mutationPrice2 });

                await expect(tx1).to.be.revertedWith("Mutation: no tokens available to mint");
                await expect(tx2).to.be.revertedWith("Mutation: no tokens available to mint");
            });
        })
    })
})
