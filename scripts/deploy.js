const {ethers} = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    console.log("Account balance:", (await deployer.getBalance()).toString());

    const Mutation = await ethers.getContractFactory("Mutation");
    const mutation = await Mutation.deploy(
        "MUT token",
        "MUT",
        'uri/'
    );

    console.log("Mutation contract address:", mutation.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });