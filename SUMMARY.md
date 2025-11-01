# SUMMARY.md

## Project Overview

This repository contains a full-stack decentralized application (dApp) for a hackathon. The project, titled "Hedera - Building an Agent-first Digital Economy," aims to create a platform where AI agents can discover each other, establish trust, and execute payments autonomously on the Hedera testnet.

The core idea is to build an "agentic economy" by leveraging blockchain technology for trustless interactions. The project uses a combination of smart contracts, a backend API, and a web-based frontend to achieve this.

The main components of the system are:
-   **Agent Discovery**: An on-chain registry for agents to publish their capabilities, based on the ERC-8004 standard.
-   **Trust Establishment**: A trust score system associated with each agent in the registry.
-   **Secure Payments**: An on-chain payment system with escrow functionality, inspired by the x402 payment standard.
-   **Interaction Logging**: Use of the Hedera Consensus Service (HCS) to log agent interactions for auditability.

## Technology Stack

-   **Blockchain**: Hedera Testnet
-   **Smart Contracts**:
    -   Solidity
    -   Hardhat (for development, testing, and deployment)
    -   Ethers.js (for interacting with contracts)
    -   OpenZeppelin Contracts (for security and standard components like `Ownable`, `Pausable`, `ReentrancyGuard`)
-   **Backend**:
    -   Node.js
    -   Express.js (for the REST API)
    -   `@hashgraph/sdk` (for interacting with Hedera services like HCS and HTS)
    -   `ethers` (for interacting with the smart contracts)
    -   `dotenv` (for environment variable management)
-   **Frontend**:
    -   Next.js (React framework)
    -   TypeScript
    -   Tailwind CSS (for styling)
    -   shadcn/ui (for UI components)
    -   `axios` (for API calls)
    -   WalletConnect/HashPack/Blade for wallet integration.

## Project Structure

The repository is organized into the following main directories:

-   `contracts/`: Contains the Solidity smart contracts, deployment scripts, and tests for the on-chain logic.
-   `backend/`: Contains the Node.js Express server that acts as a bridge between the frontend and the Hedera network/smart contracts.
-   `frontend/`: Contains the Next.js web application that provides the user interface for the system.
-   `docs/`: Contains detailed guides for developers with different roles (Web3, Web2, Frontend) and a quick start guide.
-   `tests/`: Intended for integration tests.

## Core Functionality

### On-Chain Logic (Smart Contracts)

The on-chain logic is implemented in two main smart contracts located in `contracts/src/`:

1.  **`AgentRegistry.sol`**:
    -   **Purpose**: Implements an ERC-8004 compliant registry for AI agents.
    -   **Features**:
        -   `registerAgent`: Allows an agent to register itself with a name, capabilities, and metadata.
        -   `getAgent`: Retrieves the details of a registered agent.
        -   `searchByCapability`: Finds agents that have a specific capability.
        -   `getAllAgents`: Returns a list of all registered agents.
        -   `updateCapabilities`: Allows an agent to update its capabilities.
        -   `updateTrustScore`: An owner-only function to update the trust score of an agent.
        -   `deactivateAgent`: An owner-only function to deactivate an agent.
    -   **Security**: Uses OpenZeppelin's `Ownable` for access control and `Pausable` for emergency stops.

2.  **`PaymentProcessor.sol`**:
    -   **Purpose**: Implements a payment system with escrow functionality.
    -   **Features**:
        -   `createEscrow`: Creates a new escrow payment in HBAR. The funds are held by the contract.
        -   `releaseEscrow`: Allows the payer to release the funds to the payee.
        -   `refundEscrow`: Allows either the payer or payee to refund the payment to the payer.
        -   `disputeEscrow`: Allows either party to mark an escrow as disputed.
        -   `claimExpiredEscrow`: Allows for refunds of escrows that have passed their expiration time.
        -   `getEscrow`: Retrieves the details of an escrow.
    -   **Security**: Uses OpenZeppelin's `ReentrancyGuard` to prevent re-entrancy attacks, `Ownable` for admin functions, and `Pausable`.

### Backend Services

The backend, located in the `backend/` directory, provides a REST API for the frontend to interact with the blockchain.

-   **`server.js`**: The main entry point for the Express server. It sets up middleware (CORS, JSON parsing) and defines the API routes.
-   **`routes/`**: Defines the API endpoints.
    -   `agents.js`: Endpoints for agent registration, search, and retrieval.
    -   `payments.js`: Endpoints for creating, releasing, and refunding escrow payments.
    -   `messages.js`: Endpoints for interacting with the Hedera Consensus Service (HCS) to create topics and submit messages.
    -   `tokens.js`: Endpoints for Hedera Token Service (HTS) operations, like checking balances and transferring tokens.
    -   `x402.js`: Endpoints for the HTTP 402 payment challenge flow.
    -   `auth.js`: Endpoint for verifying digital signatures from wallets.
-   **`services/`**: Contains the business logic and interacts with the Hedera network.
    -   `hedera-client.js`: A wrapper around the `@hashgraph/sdk` for interacting with Hedera services (HCS, HTS, Mirror Node).
    -   `agent-service.js`: Interacts with the `AgentRegistry` smart contract.
    -   `payment-service.js`: Interacts with the `PaymentProcessor` smart contract.
    -   `token-service.js`: Handles HTS token operations.

### Frontend User Interface

The frontend, located in `frontend/code/`, is a Next.js application that provides a user interface for the agent economy platform.

-   **`app/page.tsx`**: The main page of the application, which orchestrates the different views (payment request, processing, result).
-   **`components/`**: Contains reusable React components.
    -   `payment-request.tsx`: A form to initiate a payment.
    -   `processing-screen.tsx`: A screen shown while a transaction is being processed.
    -   `result-screen.tsx`: Displays the result of a transaction (success or failure).
    -   `transaction-history.tsx`: A sidebar component that shows a list of recent transactions.
-   **`lib/api-client.ts`**: A client-side library for making requests to the backend API. This is the primary way the frontend interacts with the backend.
-   **`lib/types.ts`**: TypeScript type definitions for the data models (Agent, Payment, etc.).
-   **`components/ui/`**: A rich set of UI components from `shadcn/ui` are available, indicating a focus on a polished user interface.

## Setup and Deployment

The project includes scripts and detailed documentation for setup and deployment.

1.  **Prerequisites**: Node.js (v18+), Git, and a Hedera testnet account.
2.  **Installation**:
    -   Run `setup.sh` (for Linux/Mac) or `setup.bat` (for Windows) to install dependencies for all parts of the project.
    -   Alternatively, run `npm install` in the root, `contracts`, and `backend` directories.
3.  **Configuration**:
    -   Copy `.env.example` to `.env` in the root directory.
    -   Fill in the required environment variables, including Hedera account credentials (`HEDERA_ACCOUNT_ID`, `HEDERA_PRIVATE_KEY`, `EVM_PRIVATE_KEY`) and RPC/Mirror Node URLs.
4.  **Smart Contract Deployment**:
    -   Navigate to the `contracts` directory.
    -   Run `npx hardhat compile` to compile the contracts.
    -   Run `npx hardhat run deploy/deploy.js --network hedera_testnet` to deploy the contracts to the Hedera testnet.
    -   The deployed contract addresses are saved in `contracts/deployment.json`.
5.  **Running the Backend**:
    -   Navigate to the `backend` directory.
    -   Run `npm run dev` to start the backend server in development mode.
    -   The server will run on `http://localhost:3001` by default.
6.  **Running the Frontend**:
    -   Navigate to the `frontend/code` directory.
    -   Run `npm run dev` to start the frontend development server.
    -   The application will be accessible at `http://localhost:3000`.

## Key Files

-   **`README.md`**: The main entry point for understanding the project, its goals, and the hackathon structure.
-   **`docs/QUICKSTART.md`**: A comprehensive guide for getting the project set up and running quickly.
-   **`docs/WEB3_GUIDE.md`**, **`docs/WEB2_GUIDE.md`**, **`docs/FRONTEND_GUIDE.md`**: Detailed guides for developers working on different parts of the stack.
-   **`contracts/src/AgentRegistry.sol`**: The smart contract for agent discovery.
-   **`contracts/src/PaymentProcessor.sol`**: The smart contract for escrow payments.
-   **`backend/server.js`**: The main file for the backend API server.
-   **`backend/services/hedera-client.js`**: The wrapper for the Hedera SDK.
-   **`frontend/code/app/page.tsx`**: The main component for the frontend application.
-   **`frontend/code/lib/api-client.ts`**: The API client used by the frontend to communicate with the backend.
