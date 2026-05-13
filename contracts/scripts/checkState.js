const hre = require("hardhat");
const ContractAddress = require("../../frontend/src/contracts/address.json");

async function main() {
    const Voting = await hre.ethers.getContractFactory("Voting");
    const voting = await Voting.attach(ContractAddress.Voting);

    console.log("Checking state for contract at:", ContractAddress.Voting);

    const votingOpen = await voting.votingOpen();
    console.log("Voting Open:", votingOpen);

    const candidatesCount = await voting.candidatesCount();
    console.log("Candidates Count:", candidatesCount);

    const owner = await voting.owner();
    console.log("Owner:", owner);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
