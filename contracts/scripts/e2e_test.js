const hre = require("hardhat");
const axios = require("axios");

async function main() {
    console.log("Starting End-to-End Test...");

    // 1. Setup Provider & Wallet
    const provider = new hre.ethers.JsonRpcProvider("http://127.0.0.1:8545");
    // Use Account #19 from hardhat node as the "Student" (to avoid conflicts with deployer)
    const privateKey = "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e";
    const wallet = new hre.ethers.Wallet(privateKey, provider);
    const userAddress = wallet.address;

    console.log(`Test User: ${userAddress}`);

    // 2. Get Contract Address
    // Assuming we deployed and saved it. If not, we might need to query or redeploy.
    // For this test, let's just use the deployment script again to ensure fresh state or read file.
    const addressFile = require("../../frontend/src/contracts/address.json");
    const contractAddress = addressFile.Voting;
    console.log(`Voting Contract: ${contractAddress}`);

    const Voting = await hre.ethers.getContractFactory("Voting");
    const contract = Voting.attach(contractAddress).connect(wallet);

    // 3. Issue Credential (Mock DID Service)
    console.log("\n[1] Requesting VC from Backend...");
    try {
        const issueRes = await axios.post("http://localhost:3001/api/did/issue", {
            studentId: "student1", // Using valid ID from mock DB
            userAddress: userAddress
        });
        const { vc, signature } = issueRes.data;
        console.log("✅ VC Received");

        // 4. Verify & Register
        console.log("\n[2] Registering for Election...");
        const registerRes = await axios.post("http://localhost:3001/api/did/verify-and-register", {
            userAddress: userAddress,
            vc: vc,
            signature: signature
        });

        if (registerRes.data.success) {
            console.log("✅ Registration Successful (Backend verified VC and called Contract)");
        } else {
            throw new Error("Registration failed");
        }

    } catch (error) {
        console.error("❌ DID/Registration Step Failed:", error.response ? error.response.data : error.message);
        // If failed (maybe already registered), we try to proceed to voting anyway to check
    }

    // 5. Check Registration On-Chain
    const voter = await contract.voters(userAddress);
    console.log(`\n[3] On-Chain Status: Registered=${voter.isRegistered}, Voted=${voter.hasVoted}`);

    if (!voter.isRegistered) {
        console.error("❌ User is NOT registered on-chain. Aborting.");
        return;
    }

    // 6. Vote
    if (!voter.hasVoted) {
        console.log("\n[4] Casting Vote for Candidate #1...");
        const tx = await contract.vote(1);
        await tx.wait();
        console.log("✅ Vote Cast");
    } else {
        console.log("\n[4] User already voted. Skipping vote cast.");
    }

    // 7. Check Results
    console.log("\n[5] Checking Results...");
    const candidate = await contract.candidates(1);
    console.log(`Candidate #1 (${candidate.name}): ${candidate.voteCount} votes`);
    console.log("✅ E2E Test Completed Successfully");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
