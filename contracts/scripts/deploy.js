const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    // 1. Deploy StudentNFT FIRST
    const StudentNFT = await hre.ethers.getContractFactory("StudentNFT");
    const studentNFT = await StudentNFT.deploy();
    await studentNFT.waitForDeployment();
    const nftAddress = await studentNFT.getAddress();
    console.log("StudentNFT deployed to:", nftAddress);

    // 2. Deploy Voting (Pass NFT Address)
    const Voting = await hre.ethers.getContractFactory("Voting");
    const voting = await Voting.deploy(nftAddress); // Pass NFT address here

    await voting.waitForDeployment();
    const address = await voting.getAddress();

    console.log("Voting deployed to:", address);

    // Create a Session
    const now = Math.floor(Date.now() / 1000);
    const oneWeek = 7 * 24 * 60 * 60;
    const txSession = await voting.createSession(
        "Student Council 2026",
        "Annual election for Student Council representatives.",
        now,
        now + oneWeek
    );
    await txSession.wait();
    console.log("Created initial session: Student Council 2026");

    // Seed Candidates to Session 1
    const candidates = ["Alice", "Bob", "Charlie", "David"];
    for (const name of candidates) {
        const tx = await voting.addCandidate(1, name);
        await tx.wait();
        console.log(`Added candidate to Session 1: ${name}`);
    }



    // Save to Frontend
    const frontendContractsDir = path.join(__dirname, "../../frontend/src/contracts");
    if (!fs.existsSync(frontendContractsDir)) {
        fs.mkdirSync(frontendContractsDir, { recursive: true });
    }

    const addressFile = path.join(frontendContractsDir, "address.json");
    fs.writeFileSync(
        addressFile,
        JSON.stringify({ Voting: address, StudentNFT: nftAddress }, null, 2)
    );
    console.log("Address saved to frontend/src/contracts/address.json");

    // Copy Artifacts
    const artifactsDir = path.join(__dirname, "../artifacts/contracts");
    const votingArtifactSource = path.join(artifactsDir, "Voting.sol/Voting.json");
    const nftArtifactSource = path.join(artifactsDir, "StudentNFT.sol/StudentNFT.json");

    fs.copyFileSync(votingArtifactSource, path.join(frontendContractsDir, "Voting.json"));
    fs.copyFileSync(nftArtifactSource, path.join(frontendContractsDir, "StudentNFT.json"));
    console.log("Artifacts (ABI) copied to frontend/src/contracts/");

    // Grant Admin Roles to the Admin Address in .env if it exists
    const localEnvPath = path.join(__dirname, "../../backend/.env");
    if (fs.existsSync(localEnvPath)) {
        const envConfig = require('dotenv').parse(fs.readFileSync(localEnvPath));
        const adminAddress = envConfig.ADMIN_ADDRESS;

        if (adminAddress) {
            console.log(`Granting roles to ${adminAddress}...`);
            const ADMIN_ROLE = await voting.ADMIN_ROLE();
            const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
            
            await voting.grantRole(DEFAULT_ADMIN_ROLE, adminAddress);
            await voting.grantRole(ADMIN_ROLE, adminAddress);
            console.log("Voting Roles granted successfully.");

            // Assuming StudentNFT is still Ownable or changed to AccessControl
            // If StudentNFT is unchanged it might fail here if it expects Ownable
            // Let's just catch error if any.
            try {
                const txTransferNFT = await studentNFT.transferOwnership(adminAddress);
                await txTransferNFT.wait();
                console.log("StudentNFT Ownership transferred successfully.");
            } catch (e) {
                console.log("StudentNFT might not be Ownable anymore, skipping transferOwnership.");
            }
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
