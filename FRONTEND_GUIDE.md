# 🟡🟠 Frontend Developer Guide
## UI/UX Development (Developers 3 & 4)

---

## 👥 Your Roles

### 🟡 Developer 3 (Primary Focus)
**Focus**: Reusable components, agent UI, styling
- AgentCard component
- Header/Navigation
- Form components
- Styling system

### 🟠 Developer 4 (Primary Focus)
**Focus**: Pages, integration, dashboard
- Dashboard page
- Agent list page
- Payment page
- API integration

---

## ⏰ Your 48-Hour Timeline

### Day 1

| Hours | Tasks | Deliverables |
|-------|-------|--------------|
| **0-6** | Setup Next.js, create structure | App running |
| **6-12** | Build components (Dev 3), pages (Dev 4) | UI taking shape |
| **12-18** | Connect to backend API | Data flowing |
| **18-24** | Polish UI, add interactions | Looking good |

### Day 2

| Hours | Tasks | Focus |
|-------|-------|-------|
| **24-30** | Add animations, improve UX | Polish |
| **30-36** | Fix UI bugs, responsive design | Quality |
| **36-48** | Demo prep, final touches | Presentation |

---

## 📁 Your File Structure

```
frontend/
├── app/
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Dashboard (Dev 4)
│   ├── agents/
│   │   └── page.tsx              # Agent list (Dev 3)
│   └── payments/
│       └── page.tsx              # Payments (Dev 4)
├── components/
│   ├── Header.tsx                # Nav bar (Dev 3)
│   ├── AgentCard.tsx             # Agent display (Dev 3)
│   ├── PaymentForm.tsx           # Payment form (Dev 4)
│   ├── TransactionList.tsx       # Transaction history (Dev 4)
│   └── StatusBadge.tsx           # Status indicator (Dev 3)
├── lib/
│   ├── api-client.ts             # Backend API (Shared)
│   └── types.ts                  # TypeScript types (Shared)
└── package.json
```

---

## 🛠️ Setup (Hour 0-6)

### Create Next.js App

```bash
cd frontend
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir
# Answer yes to: App Router, TypeScript, Tailwind, ESLint

npm install ethers axios zustand
```

### Update `tailwind.config.ts`

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
    },
  },
  plugins: [],
};
export default config;
```

---

## 📝 Shared Files (Both Devs)

### API Client

Create `lib/api-client.ts`:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Agent {
  name: string;
  address: string;
  capabilities: string[];
  metadata: string;
  trustScore: string;
  registeredAt: string;
  isActive: boolean;
}

export interface Payment {
  escrowId: string;
  payer: string;
  payee: string;
  amount: string;
  serviceDescription: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

export const apiClient = {
  // Agent endpoints
  async registerAgent(name: string, capabilities: string[], metadata?: string) {
    const response = await fetch(`${API_URL}/api/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, capabilities, metadata: metadata || '' })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }
    
    return response.json();
  },

  async getAllAgents(): Promise<{ agents: Agent[]; count: number }> {
    const response = await fetch(`${API_URL}/api/agents`);
    if (!response.ok) throw new Error('Failed to fetch agents');
    return response.json();
  },

  async getAgent(address: string): Promise<Agent> {
    const response = await fetch(`${API_URL}/api/agents/${address}`);
    if (!response.ok) throw new Error('Agent not found');
    return response.json();
  },

  async searchAgents(capability: string): Promise<{ agents: Agent[] }> {
    const response = await fetch(`${API_URL}/api/agents/search?capability=${capability}`);
    if (!response.ok) throw new Error('Search failed');
    return response.json();
  },

  // Payment endpoints
  async createPayment(payee: string, amount: string, description: string) {
    const response = await fetch(`${API_URL}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payee, amount, description })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Payment failed');
    }
    
    return response.json();
  },

  async releasePayment(escrowId: string) {
    const response = await fetch(`${API_URL}/api/payments/${escrowId}/release`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Release failed');
    return response.json();
  },

  async getPayment(escrowId: string): Promise<Payment> {
    const response = await fetch(`${API_URL}/api/payments/${escrowId}`);
    if (!response.ok) throw new Error('Payment not found');
    return response.json();
  },

  async getPayerPayments(address: string): Promise<{ escrows: Payment[] }> {
    const response = await fetch(`${API_URL}/api/payments/payer/${address}`);
    if (!response.ok) throw new Error('Failed to fetch payments');
    return response.json();
  },

  // Health check
  async healthCheck() {
    const response = await fetch(`${API_URL}/api/health`);
    return response.json();
  }
};
```

### Types

Create `lib/types.ts`:

```typescript
export type { Agent, Payment } from './api-client';

export interface AppState {
  walletAddress: string | null;
  isConnected: boolean;
  setWalletAddress: (address: string | null) => void;
}
```

---

## 🎨 Components (Developer 3 Focus)

### Header Component

Create `components/Header.tsx`:

```typescript
'use client';

import Link from 'next/link';
import { useState } from 'react';

export function Header() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState('');

  const connectWallet = async () => {
    // Simplified wallet connection
    // In real app, use ethers.js or similar
    setConnected(true);
    setAddress('0x' + Math.random().toString(16).slice(2, 10));
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">H</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                Hedera Agents
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link 
              href="/" 
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Dashboard
            </Link>
            <Link 
              href="/agents" 
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Agents
            </Link>
            <Link 
              href="/payments" 
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Payments
            </Link>
          </nav>

          {/* Wallet Connection */}
          <div>
            {connected ? (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600 font-mono">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
```

### Agent Card Component

Create `components/AgentCard.tsx`:

```typescript
'use client';

import { Agent } from '@/lib/api-client';

interface AgentCardProps {
  agent: Agent;
  onSelect?: (agent: Agent) => void;
}

export function AgentCard({ agent, onSelect }: AgentCardProps) {
  const trustLevel = parseInt(agent.trustScore);
  const trustColor = 
    trustLevel >= 75 ? 'text-green-600 bg-green-50' :
    trustLevel >= 50 ? 'text-yellow-600 bg-yellow-50' :
    'text-red-600 bg-red-50';

  return (
    <div 
      className="bg-white border rounded-lg p-5 hover:shadow-lg transition-all cursor-pointer hover:border-blue-300"
      onClick={() => onSelect?.(agent)}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900">
          {agent.name}
        </h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${trustColor}`}>
          {agent.trustScore}% Trust
        </span>
      </div>
      
      {/* Address */}
      <p className="text-sm text-gray-500 mb-3 font-mono truncate">
        {agent.address}
      </p>

      {/* Capabilities */}
      <div className="flex flex-wrap gap-2 mb-4">
        {agent.capabilities.map((cap, idx) => (
          <span 
            key={idx}
            className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium"
          >
            {cap}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center text-xs text-gray-500 pt-3 border-t">
        <span>
          Registered {new Date(agent.registeredAt).toLocaleDateString()}
        </span>
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${agent.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
          <span>{agent.isActive ? 'Active' : 'Inactive'}</span>
        </div>
      </div>
    </div>
  );
}
```

### Status Badge Component

Create `components/StatusBadge.tsx`:

```typescript
interface StatusBadgeProps {
  status: 'Active' | 'Completed' | 'Refunded' | 'Disputed';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    Active: 'bg-blue-100 text-blue-800',
    Completed: 'bg-green-100 text-green-800',
    Refunded: 'bg-gray-100 text-gray-800',
    Disputed: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}
```

---

## 📄 Pages (Developer 4 Focus)

### Root Layout

Update `app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hedera Agent Economy",
  description: "Autonomous agent discovery and payments on Hedera",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Header />
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  );
}
```

### Dashboard Page

Update `app/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { apiClient, Agent } from '@/lib/api-client';
import { AgentCard } from '@/components/AgentCard';

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAgents: 0,
    highTrust: 0,
    capabilities: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const data = await apiClient.getAllAgents();
      setAgents(data.agents);

      // Calculate stats
      setStats({
        totalAgents: data.agents.length,
        highTrust: data.agents.filter(a => parseInt(a.trustScore) >= 75).length,
        capabilities: new Set(data.agents.flatMap(a => a.capabilities)).size
      });
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Hedera Agent Economy
        </h1>
        <p className="text-xl text-gray-600">
          Discover autonomous AI agents and execute secure payments on Hedera
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-blue-600 mb-1">
            {stats.totalAgents}
          </div>
          <div className="text-sm text-gray-600">Active Agents</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-green-600 mb-1">
            {stats.highTrust}
          </div>
          <div className="text-sm text-gray-600">Highly Trusted</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-purple-600 mb-1">
            {stats.capabilities}
          </div>
          <div className="text-sm text-gray-600">Total Capabilities</div>
        </div>
      </div>

      {/* Recent Agents */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Recent Agents
        </h2>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-600">No agents registered yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.slice(0, 6).map((agent) => (
              <AgentCard 
                key={agent.address} 
                agent={agent}
                onSelect={(a) => console.log('Selected:', a)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Agents Page (Developer 3)

Create `app/agents/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { apiClient, Agent } from '@/lib/api-client';
import { AgentCard } from '@/components/AgentCard';

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  useEffect(() => {
    loadAgents();
  }, []);

  async function loadAgents() {
    try {
      const data = await apiClient.getAllAgents();
      setAgents(data.agents);
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) {
      loadAgents();
      return;
    }

    try {
      setLoading(true);
      const data = await apiClient.searchAgents(searchQuery);
      setAgents(data.agents);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Agent Directory
      </h1>

      {/* Search Bar */}
      <div className="mb-8">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search by capability (e.g., smart-contracts, auditing)..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Search
          </button>
          <button
            onClick={loadAgents}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Agent Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-gray-600 text-lg">No agents found</p>
          <p className="text-gray-500 text-sm mt-2">Try a different search term</p>
        </div>
      ) : (
        <div>
          <p className="text-gray-600 mb-4">
            Found {agents.length} agent{agents.length !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <AgentCard 
                key={agent.address} 
                agent={agent}
                onSelect={setSelectedAgent}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Payments Page (Developer 4)

Create `app/payments/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function PaymentsPage() {
  const [formData, setFormData] = useState({
    payee: '',
    amount: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const result = await apiClient.createPayment(
        formData.payee,
        formData.amount,
        formData.description
      );
      
      setResult(result);
      setFormData({ payee: '', amount: '', description: '' });
      alert('Payment created successfully!');
    } catch (error: any) {
      alert('Payment failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Create Payment
      </h1>

      {/* Payment Form */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payee Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Address
            </label>
            <input
              type="text"
              required
              placeholder="0x..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={formData.payee}
              onChange={(e) => setFormData({ ...formData, payee: e.target.value })}
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (HBAR)
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              placeholder="10"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Description
            </label>
            <textarea
              required
              rows={3}
              placeholder="Describe the service..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Payment...' : 'Create Escrow Payment'}
          </button>
        </form>

        {/* Result */}
        {result && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">
              Payment Created Successfully!
            </h3>
            <p className="text-sm text-green-800 mb-1">
              Escrow ID: <span className="font-mono">{result.escrowId}</span>
            </p>
            <p className="text-sm text-green-800">
              Transaction: <a 
                href={`https://hashscan.io/testnet/transaction/${result.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                View on HashScan
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## ✅ Your Checklists

### 🟡 Developer 3 Checklist

**Hour 0-6: Setup & Components**
- [ ] Setup Next.js project
- [ ] Configure Tailwind
- [ ] Create Header component
- [ ] Create AgentCard component
- [ ] Create StatusBadge component

**Hour 6-18: Pages & Styling**
- [ ] Build agents page
- [ ] Add search functionality
- [ ] Polish UI styling
- [ ] Add hover effects
- [ ] Test responsiveness

**Hour 18-30: Polish**
- [ ] Add animations
- [ ] Improve color scheme
- [ ] Fix UI bugs
- [ ] Mobile optimization

---

### 🟠 Developer 4 Checklist

**Hour 0-6: Setup & API**
- [ ] Setup Next.js project
- [ ] Create API client
- [ ] Create types file
- [ ] Test API connection

**Hour 6-18: Pages & Integration**
- [ ] Build dashboard page
- [ ] Build payments page
- [ ] Connect to backend API
- [ ] Handle loading states
- [ ] Handle errors

**Hour 18-30: Features**
- [ ] Add transaction list
- [ ] Add payment release
- [ ] Real-time updates
- [ ] Add notifications

---

## 🧪 Testing Your UI

```bash
# Start dev server
npm run dev

# Open browser
http://localhost:3000

# Test each page:
# - Dashboard: http://localhost:3000
# - Agents: http://localhost:3000/agents
# - Payments: http://localhost:3000/payments
```

---

## 🚨 Common Issues

### "Module not found"
```bash
npm install <missing-package>
```

### "API call failed"
- Check backend is running on port 3001
- Check NEXT_PUBLIC_API_URL in .env

### Styling not applying
```bash
# Restart dev server
npm run dev
```

---

## 💡 Tips

### For Dev 3 (Components)
- Focus on reusability
- Make components flexible
- Use Tailwind utilities
- Think mobile-first

### For Dev 4 (Pages)
- Handle loading states
- Show error messages
- Add user feedback
- Test edge cases

---

## 📚 Resources

- **Next.js**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **React**: https://react.dev/

---

**You're making it beautiful and functional! 🎨✨**

