const hre = require("hardhat");

async function main() {
    const VotingSystem = await hre.ethers.getContractFactory("VotingSystem");
    // Get the address from the last deployment log or use the known one if deterministic
    // 0x5FbDB2315678afecb367f032d93F642f64180aa3 is the default for nonce 0
    const address = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const votingSystem = await VotingSystem.attach(address);

    console.log("Fetching candidates from session 1...");
    try {
        const candidates = await votingSystem.getCandidates(1);
        console.log("Candidates found:", candidates.length);
        for (const c of candidates) {
            console.log(`- ID: ${c.id}`);
            console.log(`  Name: ${c.name}`);
            console.log(`  VoteCount: ${c.voteCount}`);
        }
    } catch (error) {
        console.error("Error fetching candidates:", error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
