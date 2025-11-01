export interface Agent {
  id: string
  name: string
  description: string
  trustScore: number
  rating: number
  totalReviews: number
  category: string
  tags: string[]
  creator: string
  downloads: number
  lastUpdated: string
}

export const mockAgents: Agent[] = [
  {
    id: "agent-nexus-ai",
    name: "Agent Nexus AI",
    description: "Advanced neural network agent for data analysis and prediction. Specializes in financial market analysis and trend forecasting.",
    trustScore: 95,
    rating: 4.8,
    totalReviews: 1247,
    category: "Finance",
    tags: ["analysis", "prediction", "finance"],
    creator: "nexus-labs",
    downloads: 45678,
    lastUpdated: "2025-10-28"
  },
  {
    id: "quantum-trader",
    name: "Quantum Trader",
    description: "High-frequency trading agent with quantum-inspired algorithms. Optimizes trading strategies in real-time.",
    trustScore: 92,
    rating: 4.6,
    totalReviews: 892,
    category: "Trading",
    tags: ["trading", "automation", "finance"],
    creator: "quantum-systems",
    downloads: 32456,
    lastUpdated: "2025-10-30"
  },
  {
    id: "smart-audit-pro",
    name: "Smart Audit Pro",
    description: "Automated smart contract auditing agent. Detects vulnerabilities and provides security recommendations.",
    trustScore: 98,
    rating: 4.9,
    totalReviews: 2103,
    category: "Security",
    tags: ["security", "audit", "smart-contracts"],
    creator: "securechain",
    downloads: 67890,
    lastUpdated: "2025-10-25"
  },
  {
    id: "defi-optimizer",
    name: "DeFi Optimizer",
    description: "Yield farming and liquidity pool optimization agent. Maximizes returns across multiple DeFi protocols.",
    trustScore: 88,
    rating: 4.4,
    totalReviews: 1567,
    category: "DeFi",
    tags: ["defi", "yield", "optimization"],
    creator: "defi-labs",
    downloads: 54321,
    lastUpdated: "2025-10-29"
  },
  {
    id: "nft-curator",
    name: "NFT Curator",
    description: "AI-powered NFT discovery and valuation agent. Analyzes market trends and identifies valuable collections.",
    trustScore: 85,
    rating: 4.3,
    totalReviews: 734,
    category: "NFT",
    tags: ["nft", "art", "valuation"],
    creator: "nft-ai",
    downloads: 23456,
    lastUpdated: "2025-10-27"
  },
  {
    id: "chain-guardian",
    name: "Chain Guardian",
    description: "Real-time blockchain monitoring and alert system. Tracks suspicious activities and provides instant notifications.",
    trustScore: 94,
    rating: 4.7,
    totalReviews: 1890,
    category: "Security",
    tags: ["monitoring", "security", "alerts"],
    creator: "guardian-network",
    downloads: 78901,
    lastUpdated: "2025-10-31"
  },
  {
    id: "dao-governance-bot",
    name: "DAO Governance Bot",
    description: "Automated DAO proposal analysis and voting recommendations. Helps make informed governance decisions.",
    trustScore: 90,
    rating: 4.5,
    totalReviews: 1123,
    category: "Governance",
    tags: ["dao", "governance", "voting"],
    creator: "dao-tools",
    downloads: 34567,
    lastUpdated: "2025-10-26"
  },
  {
    id: "gas-optimizer",
    name: "Gas Optimizer",
    description: "Transaction gas optimization agent. Predicts optimal gas prices and execution times.",
    trustScore: 91,
    rating: 4.6,
    totalReviews: 2456,
    category: "Utility",
    tags: ["gas", "optimization", "ethereum"],
    creator: "gas-labs",
    downloads: 98765,
    lastUpdated: "2025-10-30"
  },
  {
    id: "cross-chain-bridge",
    name: "Cross-Chain Bridge AI",
    description: "Intelligent cross-chain asset transfer agent. Optimizes routes and minimizes fees across multiple chains.",
    trustScore: 87,
    rating: 4.4,
    totalReviews: 987,
    category: "Infrastructure",
    tags: ["cross-chain", "bridge", "interoperability"],
    creator: "bridge-protocol",
    downloads: 45678,
    lastUpdated: "2025-10-28"
  },
  {
    id: "token-sentinel",
    name: "Token Sentinel",
    description: "Token launch and rug pull detection agent. Analyzes smart contracts and team credentials for safety.",
    trustScore: 96,
    rating: 4.8,
    totalReviews: 3201,
    category: "Security",
    tags: ["security", "detection", "tokens"],
    creator: "sentinel-ai",
    downloads: 112345,
    lastUpdated: "2025-10-31"
  },
  {
    id: "liquidity-manager",
    name: "Liquidity Manager Pro",
    description: "Automated liquidity provision and rebalancing agent. Maintains optimal positions across AMMs.",
    trustScore: 89,
    rating: 4.5,
    totalReviews: 1678,
    category: "DeFi",
    tags: ["liquidity", "amm", "defi"],
    creator: "lp-systems",
    downloads: 56789,
    lastUpdated: "2025-10-29"
  },
  {
    id: "whale-tracker",
    name: "Whale Tracker",
    description: "Large wallet movement tracking and analysis agent. Provides insights into whale behavior and market impact.",
    trustScore: 86,
    rating: 4.3,
    totalReviews: 1234,
    category: "Analytics",
    tags: ["tracking", "analytics", "whales"],
    creator: "whale-watch",
    downloads: 67890,
    lastUpdated: "2025-10-27"
  }
]
