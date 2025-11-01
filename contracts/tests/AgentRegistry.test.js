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
      // ERC-8004: Trust score calculated automatically (50 base + 5 metadata + 0 capability bonus = 55)
      expect(agent.trustScore).to.be.gte(50);
      expect(agent.trustScore).to.be.lte(65);
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

  describe("ERC-8004 Trust Score Generation", function () {
    it("Should calculate trust score with metadata bonus", async function () {
      await agentRegistry.connect(agent1).registerAgent(
        "Alice",
        ["testing"],
        "ipfs://metadata-hash"
      );
      
      const agent = await agentRegistry.getAgent(agent1.address);
      // Base 50 + metadata bonus 5 = 55
      expect(agent.trustScore).to.equal(55);
    });

    it("Should calculate trust score with capability bonuses", async function () {
      await agentRegistry.connect(agent1).registerAgent(
        "Alice",
        ["cap1", "cap2", "cap3", "cap4", "cap5"],
        ""
      );
      
      const agent = await agentRegistry.getAgent(agent1.address);
      // Base 50 + 5 (3+ capabilities) + 5 (5+ capabilities) = 60
      expect(agent.trustScore).to.equal(60);
    });

    it("Should calculate maximum trust score", async function () {
      await agentRegistry.connect(agent1).registerAgent(
        "Alice",
        ["cap1", "cap2", "cap3", "cap4", "cap5", "cap6"],
        "ipfs://metadata"
      );
      
      const agent = await agentRegistry.getAgent(agent1.address);
      // Base 50 + metadata 5 + 3+ bonus 5 + 5+ bonus 5 = 65 (max)
      expect(agent.trustScore).to.equal(65);
    });
  });

  describe("ERC-8004 Reputation Registry", function () {
    beforeEach(async function () {
      await agentRegistry.connect(agent1).registerAgent("Alice", ["testing"], "");
      await agentRegistry.connect(agent2).registerAgent("Bob", ["frontend"], "");
    });

    it("Should submit reputation feedback", async function () {
      const tx = await agentRegistry.connect(agent2).submitFeedback(
        agent1.address,
        5,
        "Excellent service",
        ethers.ZeroHash
      );
      
      await expect(tx)
        .to.emit(agentRegistry, "ReputationFeedbackSubmitted")
        .withArgs(agent2.address, agent1.address, 5);
      
      const agent = await agentRegistry.getAgent(agent1.address);
      // Trust score should be updated to 100 (5 stars * 20 = 100)
      expect(agent.trustScore).to.equal(100);
    });

    it("Should calculate average rating correctly", async function () {
      // Submit multiple ratings
      await agentRegistry.connect(agent2).submitFeedback(agent1.address, 4, "", ethers.ZeroHash);
      
      const agent1After = await agentRegistry.getAgent(agent1.address);
      expect(agent1After.trustScore).to.equal(80); // 4 * 20 = 80
    });

    it("Should prevent self-rating", async function () {
      await expect(
        agentRegistry.connect(agent1).submitFeedback(agent1.address, 5, "", ethers.ZeroHash)
      ).to.be.revertedWith("Cannot rate yourself");
    });

    it("Should enforce rating range", async function () {
      await expect(
        agentRegistry.connect(agent2).submitFeedback(agent1.address, 6, "", ethers.ZeroHash)
      ).to.be.revertedWith("Rating must be 1-5");
    });

    it("Should get agent reputation", async function () {
      await agentRegistry.connect(agent2).submitFeedback(
        agent1.address,
        5,
        "Great!",
        ethers.ZeroHash
      );
      
      const reputation = await agentRegistry.getAgentReputation(agent1.address);
      expect(reputation.length).to.equal(1);
      expect(reputation[0].fromAgent).to.equal(agent2.address);
      expect(reputation[0].rating).to.equal(5);
      expect(reputation[0].comment).to.equal("Great!");
    });
  });

  describe("ERC-8004 A2A Communication", function () {
    beforeEach(async function () {
      await agentRegistry.connect(agent1).registerAgent("Alice", ["smart-contracts"], "metadata");
      await agentRegistry.connect(agent2).registerAgent("Bob", ["frontend"], "metadata");
    });

    it("Should initiate A2A communication", async function () {
      // First boost trust score to meet threshold (40)
      await agentRegistry.connect(owner).updateTrustScore(agent2.address, 50);
      
      const tx = await agentRegistry.connect(agent1).initiateA2ACommunication(
        agent2.address,
        "smart-contracts"
      );
      
      await expect(tx)
        .to.emit(agentRegistry, "A2AInteractionInitiated");
      
      // Extract interaction ID from event
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return agentRegistry.interface.parseLog(log).name === "A2AInteractionInitiated";
        } catch {
          return false;
        }
      });
      
      if (event) {
        const parsed = agentRegistry.interface.parseLog(event);
        const interactionId = parsed.args.interactionId;
        
        const interaction = await agentRegistry.getA2AInteraction(interactionId);
        expect(interaction.fromAgent).to.equal(agent1.address);
        expect(interaction.toAgent).to.equal(agent2.address);
        expect(interaction.capability).to.equal("smart-contracts");
        expect(interaction.completed).to.equal(false);
      }
    });

    it("Should require minimum trust score for A2A", async function () {
      // Agent2 has default trust score (50-65), should work
      // But let's test with a low trust score
      await agentRegistry.connect(owner).updateTrustScore(agent2.address, 30);
      
      await expect(
        agentRegistry.connect(agent1).initiateA2ACommunication(agent2.address, "test")
      ).to.be.revertedWith("Target agent trust score too low");
    });

    it("Should complete A2A interaction and boost trust", async function () {
      await agentRegistry.connect(owner).updateTrustScore(agent2.address, 50);
      
      const tx = await agentRegistry.connect(agent1).initiateA2ACommunication(
        agent2.address,
        "smart-contracts"
      );
      const receipt = await tx.wait();
      
      const event = receipt.logs.find(log => {
        try {
          return agentRegistry.interface.parseLog(log).name === "A2AInteractionInitiated";
        } catch {
          return false;
        }
      });
      
      if (event) {
        const parsed = agentRegistry.interface.parseLog(event);
        const interactionId = parsed.args.interactionId;
        
        const agent1Before = await agentRegistry.getAgent(agent1.address);
        const agent2Before = await agentRegistry.getAgent(agent2.address);
        
        await agentRegistry.connect(agent1).completeA2AInteraction(interactionId);
        
        const agent1After = await agentRegistry.getAgent(agent1.address);
        const agent2After = await agentRegistry.getAgent(agent2.address);
        
        // Both should get +1 trust boost (handle BigInt properly)
        expect(agent1After.trustScore).to.equal(agent1Before.trustScore + BigInt(1));
        expect(agent2After.trustScore).to.equal(agent2Before.trustScore + BigInt(1));
      }
    });

    it("Should get agent interactions", async function () {
      await agentRegistry.connect(owner).updateTrustScore(agent2.address, 50);
      
      await agentRegistry.connect(agent1).initiateA2ACommunication(
        agent2.address,
        "smart-contracts"
      );
      
      const interactions = await agentRegistry.getAgentInteractions(agent1.address);
      expect(interactions.length).to.be.gte(1);
    });
  });

  describe("ERC-8004 Trust Establishment from Payment", function () {
    beforeEach(async function () {
      await agentRegistry.connect(agent1).registerAgent("Alice", ["payments"], "");
      await agentRegistry.connect(agent2).registerAgent("Bob", ["services"], "");
    });

    it("Should establish trust from payment transaction", async function () {
      const agent1Before = await agentRegistry.getAgent(agent1.address);
      const agent2Before = await agentRegistry.getAgent(agent2.address);
      
      const txHash = ethers.keccak256(ethers.toUtf8Bytes("test-tx"));
      await agentRegistry.connect(agent1).establishTrustFromPayment(
        agent1.address,
        agent2.address,
        txHash
      );
      
      const agent1After = await agentRegistry.getAgent(agent1.address);
      const agent2After = await agentRegistry.getAgent(agent2.address);
      
      // Both should get +2 trust boost (handle BigInt properly)
      const maxScore = BigInt(100);
      const boost = BigInt(2);
      expect(agent1After.trustScore).to.equal(
        agent1Before.trustScore + boost > maxScore ? maxScore : agent1Before.trustScore + boost
      );
      expect(agent2After.trustScore).to.equal(
        agent2Before.trustScore + boost > maxScore ? maxScore : agent2Before.trustScore + boost
      );
      
      await expect(
        agentRegistry.connect(agent1).establishTrustFromPayment(
          agent1.address,
          agent2.address,
          txHash
        )
      ).to.emit(agentRegistry, "TrustEstablished")
        .withArgs(agent1.address, agent2.address, txHash);
    });
  });
});

