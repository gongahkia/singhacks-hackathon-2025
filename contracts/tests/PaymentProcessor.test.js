const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PaymentProcessor", function () {
  let paymentProcessor;
  let payer, payee, other;

  beforeEach(async function () {
    [payer, payee, other] = await ethers.getSigners();
    
    const PaymentProcessor = await ethers.getContractFactory("PaymentProcessor");
    paymentProcessor = await PaymentProcessor.deploy();
    await paymentProcessor.waitForDeployment();
  });

  describe("Escrow Creation", function () {
    it("Should create an escrow", async function () {
      const amount = ethers.parseEther("10");
      
      const tx = await paymentProcessor.connect(payer).createEscrow(
        payee.address,
        "Smart contract development",
        { value: amount }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const parsed = paymentProcessor.interface.parseLog(log);
          return parsed.name === "EscrowCreated";
        } catch {
          return false;
        }
      });
      
      const parsedEvent = paymentProcessor.interface.parseLog(event);
      const escrowId = parsedEvent.args.escrowId;

      const escrow = await paymentProcessor.getEscrow(escrowId);
      expect(escrow.payer).to.equal(payer.address);
      expect(escrow.payee).to.equal(payee.address);
      expect(escrow.amount).to.equal(amount);
      expect(escrow.status).to.equal(0); // Active
    });

    it("Should emit EscrowCreated event", async function () {
      const amount = ethers.parseEther("5");
      
      await expect(
        paymentProcessor.connect(payer).createEscrow(
          payee.address,
          "Service",
          { value: amount }
        )
      ).to.emit(paymentProcessor, "EscrowCreated");
    });

    it("Should require non-zero amount", async function () {
      await expect(
        paymentProcessor.connect(payer).createEscrow(
          payee.address,
          "Service",
          { value: 0 }
        )
      ).to.be.revertedWith("Amount must be > 0");
    });

    it("Should prevent self-payment", async function () {
      const amount = ethers.parseEther("1");
      
      await expect(
        paymentProcessor.connect(payer).createEscrow(
          payer.address,
          "Service",
          { value: amount }
        )
      ).to.be.revertedWith("Cannot pay yourself");
    });

    it("Should require service description", async function () {
      const amount = ethers.parseEther("1");
      
      await expect(
        paymentProcessor.connect(payer).createEscrow(
          payee.address,
          "",
          { value: amount }
        )
      ).to.be.revertedWith("Description required");
    });

    it("Should require valid payee address", async function () {
      const amount = ethers.parseEther("1");
      
      await expect(
        paymentProcessor.connect(payer).createEscrow(
          ethers.ZeroAddress,
          "Service",
          { value: amount }
        )
      ).to.be.revertedWith("Invalid payee");
    });
  });

  describe("Escrow Release", function () {
    let escrowId;
    const amount = ethers.parseEther("10");

    beforeEach(async function () {
      const tx = await paymentProcessor.connect(payer).createEscrow(
        payee.address,
        "Service",
        { value: amount }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const parsed = paymentProcessor.interface.parseLog(log);
          return parsed.name === "EscrowCreated";
        } catch {
          return false;
        }
      });
      
      const parsedEvent = paymentProcessor.interface.parseLog(event);
      escrowId = parsedEvent.args.escrowId;
    });

    it("Should release escrow to payee", async function () {
      const payeeBalanceBefore = await ethers.provider.getBalance(payee.address);
      
      await paymentProcessor.connect(payer).releaseEscrow(escrowId);
      
      const payeeBalanceAfter = await ethers.provider.getBalance(payee.address);
      expect(payeeBalanceAfter - payeeBalanceBefore).to.equal(amount);

      const escrow = await paymentProcessor.getEscrow(escrowId);
      expect(escrow.status).to.equal(1); // Completed
    });

    it("Should emit EscrowCompleted event", async function () {
      await expect(
        paymentProcessor.connect(payer).releaseEscrow(escrowId)
      ).to.emit(paymentProcessor, "EscrowCompleted")
        .withArgs(escrowId, amount);
    });

    it("Should only allow payer to release", async function () {
      await expect(
        paymentProcessor.connect(payee).releaseEscrow(escrowId)
      ).to.be.revertedWith("Only payer can release");
    });

    it("Should not allow releasing already completed escrow", async function () {
      await paymentProcessor.connect(payer).releaseEscrow(escrowId);
      
      await expect(
        paymentProcessor.connect(payer).releaseEscrow(escrowId)
      ).to.be.revertedWith("Not active");
    });
  });

  describe("Escrow Refund", function () {
    let escrowId;
    const amount = ethers.parseEther("10");

    beforeEach(async function () {
      const tx = await paymentProcessor.connect(payer).createEscrow(
        payee.address,
        "Service",
        { value: amount }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const parsed = paymentProcessor.interface.parseLog(log);
          return parsed.name === "EscrowCreated";
        } catch {
          return false;
        }
      });
      
      const parsedEvent = paymentProcessor.interface.parseLog(event);
      escrowId = parsedEvent.args.escrowId;
    });

    it("Should refund escrow to payer", async function () {
      const payerBalanceBefore = await ethers.provider.getBalance(payer.address);
      
      const tx = await paymentProcessor.connect(payer).refundEscrow(escrowId);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const payerBalanceAfter = await ethers.provider.getBalance(payer.address);
      const expectedBalance = payerBalanceBefore + amount - gasUsed;
      
      expect(payerBalanceAfter).to.be.closeTo(expectedBalance, ethers.parseEther("0.01"));

      const escrow = await paymentProcessor.getEscrow(escrowId);
      expect(escrow.status).to.equal(2); // Refunded
    });

    it("Should emit EscrowRefunded event", async function () {
      await expect(
        paymentProcessor.connect(payer).refundEscrow(escrowId)
      ).to.emit(paymentProcessor, "EscrowRefunded")
        .withArgs(escrowId, amount);
    });

    it("Should allow payee to initiate refund", async function () {
      await expect(
        paymentProcessor.connect(payee).refundEscrow(escrowId)
      ).to.emit(paymentProcessor, "EscrowRefunded");
    });

    it("Should not allow unauthorized refund", async function () {
      await expect(
        paymentProcessor.connect(other).refundEscrow(escrowId)
      ).to.be.revertedWith("Not authorized");
    });

    it("Should not allow refunding already completed escrow", async function () {
      await paymentProcessor.connect(payer).releaseEscrow(escrowId);
      
      await expect(
        paymentProcessor.connect(payer).refundEscrow(escrowId)
      ).to.be.revertedWith("Not active");
    });
  });

  describe("Escrow Queries", function () {
    it("Should get payer escrows", async function () {
      const amount = ethers.parseEther("1");
      
      await paymentProcessor.connect(payer).createEscrow(
        payee.address,
        "Service 1",
        { value: amount }
      );

      await paymentProcessor.connect(payer).createEscrow(
        payee.address,
        "Service 2",
        { value: amount }
      );

      const escrows = await paymentProcessor.getPayerEscrows(payer.address);
      expect(escrows.length).to.equal(2);
    });

    it("Should get payee escrows", async function () {
      const amount = ethers.parseEther("1");
      
      await paymentProcessor.connect(payer).createEscrow(
        payee.address,
        "Service 1",
        { value: amount }
      );

      await paymentProcessor.connect(other).createEscrow(
        payee.address,
        "Service 2",
        { value: amount }
      );

      const escrows = await paymentProcessor.getPayeeEscrows(payee.address);
      expect(escrows.length).to.equal(2);
    });

    it("Should get contract balance", async function () {
      const amount = ethers.parseEther("5");
      
      await paymentProcessor.connect(payer).createEscrow(
        payee.address,
        "Service",
        { value: amount }
      );

      const balance = await paymentProcessor.getContractBalance();
      expect(balance).to.equal(amount);
    });

    it("Should revert when getting non-existent escrow", async function () {
      const fakeEscrowId = ethers.keccak256(ethers.toUtf8Bytes("fake"));
      
      await expect(
        paymentProcessor.getEscrow(fakeEscrowId)
      ).to.be.revertedWith("Escrow not found");
    });
  });
});

