const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgentRegistry", function () {
  let agentRegistry;
  let owner, agent1, agent2;

  beforeEach(async function () {
    [owner, agent1, agent2] = await ethers.getSigners();
    
    const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
    agentRegistry = await AgentRegistry.deploy(owner.address);
    await agentRegistry.waitForDeployment();
  });

  describe("Agent Registration", function () {
    it("Should register an agent", async function () {
      await agentRegistry.connect(agent1).registerAgent(
        "Alice Agent",
        ["smart-contracts", "auditing"],
        "ipfs://metadata"
      );

      const agent = await agentRegistry.getAgent(agent1.address);
      expect(agent.name).to.equal("Alice Agent");
      expect(agent.capabilities.length).to.equal(2);
      expect(agent.trustScore).to.equal(50);
      expect(agent.isActive).to.equal(true);
    });

    it("Should emit AgentRegistered event", async function () {
      await expect(
        agentRegistry.connect(agent1).registerAgent(
          "Alice",
          ["testing"],
          ""
        )
      ).to.emit(agentRegistry, "AgentRegistered")
        .withArgs(agent1.address, "Alice", ["testing"]);
    });

    it("Should prevent duplicate registration", async function () {
      await agentRegistry.connect(agent1).registerAgent(
        "Alice",
        ["testing"],
        ""
      );

      await expect(
        agentRegistry.connect(agent1).registerAgent("Alice2", ["testing2"], "")
      ).to.be.revertedWith("Already registered");
    });

    it("Should require non-empty name", async function () {
      await expect(
        agentRegistry.connect(agent1).registerAgent("", ["testing"], "")
      ).to.be.revertedWith("Name required");
    });

    it("Should require at least one capability", async function () {
      await expect(
        agentRegistry.connect(agent1).registerAgent("Alice", [], "")
      ).to.be.revertedWith("At least one capability required");
    });
  });

  describe("Agent Search", function () {
    it("Should search agents by capability", async function () {
      await agentRegistry.connect(agent1).registerAgent(
        "Alice",
        ["smart-contracts"],
        ""
      );
      
      await agentRegistry.connect(agent2).registerAgent(
        "Bob",
        ["smart-contracts", "frontend"],
        ""
      );

      const results = await agentRegistry.searchByCapability("smart-contracts");
      expect(results.length).to.equal(2);
      expect(results).to.include(agent1.address);
      expect(results).to.include(agent2.address);
    });

    it("Should return empty array for non-existent capability", async function () {
      const results = await agentRegistry.searchByCapability("non-existent");
      expect(results.length).to.equal(0);
    });
  });

  describe("Agent Updates", function () {
    beforeEach(async function () {
      await agentRegistry.connect(agent1).registerAgent(
        "Alice",
        ["testing", "auditing"],
        ""
      );
    });

    it("Should update agent capabilities", async function () {
      await agentRegistry.connect(agent1).updateCapabilities(
        ["smart-contracts", "frontend"]
      );

      const agent = await agentRegistry.getAgent(agent1.address);
      expect(agent.capabilities.length).to.equal(2);
      expect(agent.capabilities[0]).to.equal("smart-contracts");
      expect(agent.capabilities[1]).to.equal("frontend");
    });

    it("Should update capability index when updating capabilities", async function () {
      await agentRegistry.connect(agent1).updateCapabilities(
        ["new-capability"]
      );

      const oldResults = await agentRegistry.searchByCapability("testing");
      expect(oldResults.length).to.equal(0);

      const newResults = await agentRegistry.searchByCapability("new-capability");
      expect(newResults.length).to.equal(1);
      expect(newResults[0]).to.equal(agent1.address);
    });

    it("Should prevent non-registered agents from updating", async function () {
      await expect(
        agentRegistry.connect(agent2).updateCapabilities(["testing"])
      ).to.be.revertedWith("Not registered");
    });
  });

  describe("Trust Score", function () {
    beforeEach(async function () {
      await agentRegistry.connect(agent1).registerAgent(
        "Alice",
        ["testing"],
        ""
      );
    });

    it("Should allow owner to update trust score", async function () {
      await agentRegistry.connect(owner).updateTrustScore(agent1.address, 95);

      const agent = await agentRegistry.getAgent(agent1.address);
      expect(agent.trustScore).to.equal(95);
    });

    it("Should emit TrustScoreUpdated event", async function () {
      await expect(
        agentRegistry.connect(owner).updateTrustScore(agent1.address, 80)
      ).to.emit(agentRegistry, "TrustScoreUpdated")
        .withArgs(agent1.address, 80);
    });

    it("Should prevent non-owner from updating trust score", async function () {
      await expect(
        agentRegistry.connect(agent2).updateTrustScore(agent1.address, 95)
      ).to.be.revertedWithCustomError(agentRegistry, "OwnableUnauthorizedAccount");
    });

    it("Should enforce trust score range", async function () {
      await expect(
        agentRegistry.connect(owner).updateTrustScore(agent1.address, 101)
      ).to.be.revertedWith("Score must be 0-100");
    });
  });

  describe("Agent Listing", function () {
    it("Should return all registered agents", async function () {
      await agentRegistry.connect(agent1).registerAgent("Alice", ["testing"], "");
      await agentRegistry.connect(agent2).registerAgent("Bob", ["frontend"], "");

      const allAgents = await agentRegistry.getAllAgents();
      expect(allAgents.length).to.equal(2);
      expect(allAgents).to.include(agent1.address);
      expect(allAgents).to.include(agent2.address);
    });

    it("Should return correct agent count", async function () {
      await agentRegistry.connect(agent1).registerAgent("Alice", ["testing"], "");
      await agentRegistry.connect(agent2).registerAgent("Bob", ["frontend"], "");

      const count = await agentRegistry.getAgentCount();
      expect(count).to.equal(2);
    });
  });
});

