const { expect } = require("chai");

describe("VotingSystem NFT", function () {
  async function deployVotingSystem() {
    const [owner, studentA, studentB] = await ethers.getSigners();
    const votingSystem = await ethers.deployContract("VotingSystem");
    await votingSystem.waitForDeployment();
    return { votingSystem, owner, studentA, studentB };
  }

  it("mints an identity NFT with the correct student ID", async function () {
    const { votingSystem, studentA } = await deployVotingSystem();

    await votingSystem.mint(studentA.address, "12345678");

    expect(await votingSystem.ownerOf(0)).to.equal(studentA.address);
    expect(await votingSystem.studentIds(0)).to.equal("12345678");
  });

  it("prevents soulbound NFTs from being transferred", async function () {
    const { votingSystem, studentA, studentB } = await deployVotingSystem();

    await votingSystem.mint(studentA.address, "12345678");

    await expect(
      votingSystem.connect(studentA).transferFrom(studentA.address, studentB.address, 0),
    ).to.be.revertedWith("VotingSystem: Soulbound token cannot be transferred");
  });
});
