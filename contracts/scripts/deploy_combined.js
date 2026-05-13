const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("----------------------------------------------------");
    console.log("🚀 Deploying Unified VotingSystem Contract...");
    console.log("----------------------------------------------------");

    // 1. Deploy VotingSystem
    const VotingSystem = await hre.ethers.getContractFactory("VotingSystem");
    const votingSystem = await VotingSystem.deploy();
    await votingSystem.waitForDeployment();
    const address = await votingSystem.getAddress();
    console.log(`✅ VotingSystem deployed to: ${address}`);

    // 2. Create Initial Session
    const now = Math.floor(Date.now() / 1000);
    const oneWeek = 7 * 24 * 60 * 60;
    const txSession = await votingSystem.createSession(
        "Student Council 2026",
        "Annual election for Student Council representatives.",
        now,
        now + oneWeek
    );
    await txSession.wait();
    console.log("📅 Created initial session: Student Council 2026");

    // 3. Seed Candidates
    const candidates = [
        { name: "Alice", photoUrl: "https://placekitten.com/200/200", vision: "A vision for the future.", mission: "Mission 1: Study hard. Mission 2: Party hard." },
        { name: "Bob", photoUrl: "https://placekitten.com/201/201", vision: "Better food for everyone.", mission: "More pizza in the cafeteria." },
        { name: "Charlie", photoUrl: "https://placekitten.com/202/202", vision: "Tech innovation.", mission: "Free WiFi everywhere." },
        { name: "David", photoUrl: "https://placekitten.com/203/203", vision: "Sports and health.", mission: "New gym equipment." }
    ];
    for (const c of candidates) {
        const tx = await votingSystem.addCandidate(1, c.name);
        await tx.wait();
        console.log(`👤 Added candidate: ${c.name}`);
    }

    // 4. Update Frontend .env
    const frontendEnvPath = path.join(__dirname, "../../frontend/.env");
    updateEnvFile(frontendEnvPath, "NEXT_PUBLIC_VOTING_SYSTEM_ADDRESS", address);
    // Remove old variables if desired, or leave them (they will just be unused)
    // For cleanliness, we might want to comment them out or remove them, but append is safer.

    // 5. Update Backend .env
    const backendEnvPath = path.join(__dirname, "../../backend/.env");
    updateEnvFile(backendEnvPath, "VOTING_SYSTEM_ADDRESS", address);
    // Add RPC URL if missing (it seemed to be there in backend/.env)

    // 6. Copy Artifacts
    const artifactsDir = path.join(__dirname, "../artifacts/contracts/VotingSystem.sol");
    const frontendContractsDir = path.join(__dirname, "../../frontend/src/contracts");

    if (!fs.existsSync(frontendContractsDir)) {
        fs.mkdirSync(frontendContractsDir, { recursive: true });
    }

    const artifactSource = path.join(artifactsDir, "VotingSystem.json");
    if (fs.existsSync(artifactSource)) {
        fs.copyFileSync(artifactSource, path.join(frontendContractsDir, "VotingSystem.json"));
        console.log("📂 Copied VotingSystem.json to frontend/src/contracts/");
    } else {
        console.error("❌ Could not find VotingSystem.json artifact!");
    }

    // 7. Grant Admin Roles (if ADMIN_ADDRESS exists)
    const envConfig = require('dotenv').parse(fs.readFileSync(backendEnvPath));
    const adminAddress = envConfig.ADMIN_ADDRESS;

    if (adminAddress) {
        console.log(`👑 Granting admin roles to ${adminAddress}...`);
        
        const ADMIN_ROLE = await votingSystem.ADMIN_ROLE();
        const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

        const txGrantDefault = await votingSystem.grantRole(DEFAULT_ADMIN_ROLE, adminAddress);
        await txGrantDefault.wait();

        const txGrantAdmin = await votingSystem.grantRole(ADMIN_ROLE, adminAddress);
        await txGrantAdmin.wait();

        console.log("✅ Roles granted successfully.");
    }

    console.log("----------------------------------------------------");
    console.log("🎉 Deployment Complete!");
    console.log("----------------------------------------------------");
}

function updateEnvFile(filePath, key, value) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, `${key}=${value}\n`);
        console.log(`Created ${filePath} with ${key}`);
        return;
    }

    let content = fs.readFileSync(filePath, "utf8");
    const regex = new RegExp(`^${key}=.*`, "m");

    if (content.match(regex)) {
        content = content.replace(regex, `${key}=${value}`);
        console.log(`Updated ${key} in ${filePath}`);
    } else {
        content += `\n${key}=${value}`;
        console.log(`Appended ${key} to ${filePath}`);
    }

    fs.writeFileSync(filePath, content);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
