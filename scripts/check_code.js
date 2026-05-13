const ethers = require('ethers');

async function checkCode() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const address = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // The address from .env
    try {
        const code = await provider.getCode(address);
        console.log(`Code at ${address}: ${code}`);
        if (code === '0x') {
            console.log("CRITICAL: No code found at this address. Contract is NOT deployed.");
        } else {
            console.log("OK: Contract code found.");
        }
    } catch (error) {
        console.error("Error connecting to node:", error);
    }
}

checkCode();
