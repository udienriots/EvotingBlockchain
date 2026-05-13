const { expect } = require("chai");

describe("VotingSystem voting", function () {
  async function deployVotingSystem() {
    const [owner, voterA, voterB, outsider] = await ethers.getSigners();
    const votingSystem = await ethers.deployContract("VotingSystem");
    await votingSystem.waitForDeployment();
    return { votingSystem, owner, voterA, voterB, outsider };
  }

  async function createActiveSession(votingSystem) {
    const latestBlock = await ethers.provider.getBlock("latest");
    const startTime = latestBlock.timestamp - 60;
    const endTime = latestBlock.timestamp + 3600;

    await votingSystem.createSession(
      "Pemilihan Ketua",
      "Sesi aktif untuk pengujian",
      startTime,
      endTime,
    );
    await votingSystem.addCandidate(1, "Alice");
    await votingSystem.addCandidate(1, "Bob");
  }

  it("sets the deployer as admin", async function () {
    const { votingSystem, owner } = await deployVotingSystem();
    const ADMIN_ROLE = await votingSystem.ADMIN_ROLE();
    expect(await votingSystem.hasRole(ADMIN_ROLE, owner.address)).to.equal(true);
  });

  it("allows eligible NFT holders to vote and stores their history", async function () {
    const { votingSystem, voterA } = await deployVotingSystem();
    await createActiveSession(votingSystem);
    await votingSystem.mint(voterA.address, "22001");

    await votingSystem.connect(voterA).vote(1, 2);

    const candidates = await votingSystem.getCandidates(1);
    expect(candidates[1].voteCount).to.equal(1n);
    expect(await votingSystem.checkUserVoted(1, voterA.address)).to.equal(true);

    const history = await votingSystem.getUserHistory(voterA.address);
    expect(history).to.have.lengthOf(1);
    expect(history[0].sessionId).to.equal(1n);
    expect(history[0].candidateId).to.equal(2n);
  });

  it("blocks wallets without Student NFT from voting", async function () {
    const { votingSystem, outsider } = await deployVotingSystem();
    await createActiveSession(votingSystem);

    await expect(votingSystem.connect(outsider).vote(1, 1)).to.be.revertedWith(
      "You must hold a Student NFT to vote",
    );
  });

  it("enforces the per-session allowlist", async function () {
    const { votingSystem, voterA, voterB } = await deployVotingSystem();
    await createActiveSession(votingSystem);
    await votingSystem.mint(voterA.address, "22001");
    await votingSystem.mint(voterB.address, "22002");
    await votingSystem.setSessionAllowedVoters(1, [voterA.address]);

    expect(await votingSystem.isEligibleForSession(1, voterA.address)).to.equal(true);
    expect(await votingSystem.isEligibleForSession(1, voterB.address)).to.equal(false);

    await expect(votingSystem.connect(voterB).vote(1, 1)).to.be.revertedWith(
      "You are not eligible for this session",
    );
  });
});
