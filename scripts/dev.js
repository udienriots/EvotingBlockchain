#!/usr/bin/env node
/**
 * Development orchestrator: start Hardhat node → wait for RPC → deploy → start backend → start frontend.
 * Run from repo root: npm run dev
 * Stop with Ctrl+C (kills all child processes).
 */

const { spawn } = require("child_process");
const path = require("path");
const net = require("net");

const ROOT = path.resolve(__dirname, "..");
const CONTRACTS = path.join(ROOT, "contracts");
const BACKEND = path.join(ROOT, "backend");
const FRONTEND = path.join(ROOT, "frontend");

const RPC_HOST = "127.0.0.1";
const RPC_PORT = 8545;
const WAIT_MS = 500;
const MAX_RPC_WAIT_MS = 30000;

const children = [];

function log(label, msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] [${label}] ${msg}`);
}

function waitForPort(host, port, timeoutMs = MAX_RPC_WAIT_MS) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function tryConnect() {
      const socket = new net.Socket();
      const onErr = () => {
        socket.destroy();
        if (Date.now() - start >= timeoutMs) {
          reject(new Error(`Timeout waiting for ${host}:${port}`));
          return;
        }
        setTimeout(tryConnect, WAIT_MS);
      };
      socket.setTimeout(2000);
      socket.on("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.on("error", onErr);
      socket.on("timeout", onErr);
      socket.connect(port, host);
    }
    tryConnect();
  });
}

function run(cmd, args, cwd, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: "inherit",
      shell: true,
    });
    children.push(child);
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code !== 0 && code !== null) reject(new Error(`${label} exited with code ${code}`));
      else resolve();
    });
  });
}

function runDeploy() {
  log("deploy", "Running deploy_combined.js...");
  return run("npx", ["hardhat", "run", "scripts/deploy_combined.js", "--network", "localhost"], CONTRACTS, "deploy");
}

async function main() {
  console.log("\n  E-Voting dev: node → deploy → backend → frontend\n");

  // 1. Start Hardhat node
  log("node", "Starting Hardhat node (background)...");
  const nodeProc = spawn("npx", ["hardhat", "node"], {
    cwd: CONTRACTS,
    stdio: "inherit",
    shell: true,
  });
  children.push(nodeProc);

  // 2. Wait for RPC
  log("node", `Waiting for RPC at ${RPC_HOST}:${RPC_PORT}...`);
  await waitForPort(RPC_HOST, RPC_PORT);
  log("node", "RPC is ready.");

  // 3. Deploy (one-shot)
  await runDeploy();

  // 4. Start backend
  log("backend", "Starting backend...");
  const backendProc = spawn("npm", ["run", "dev"], {
    cwd: BACKEND,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, FORCE_COLOR: "1" },
  });
  children.push(backendProc);

  // Give backend a moment to bind port
  await new Promise((r) => setTimeout(r, 1500));

  // 5. Start frontend
  log("frontend", "Starting frontend...");
  const frontendProc = spawn("npm", ["run", "dev"], {
    cwd: FRONTEND,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, FORCE_COLOR: "1" },
  });
  children.push(frontendProc);

  log("dev", "All services started. Frontend: http://localhost:3000 | Backend: http://localhost:3001 | RPC: 8545");
  log("dev", "Press Ctrl+C to stop.\n");

  const killAll = () => {
    log("dev", "Shutting down...");
    children.forEach((p) => {
      if (p && !p.killed) p.kill("SIGTERM");
    });
    process.exit(0);
  };
  process.on("SIGINT", killAll);
  process.on("SIGTERM", killAll);
}

main().catch((err) => {
  console.error(err);
  children.forEach((p) => p && !p.killed && p.kill("SIGTERM"));
  process.exit(1);
});
