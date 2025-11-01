# 🟡🟠 Frontend Developer Guide
## Framework-Agnostic UI/UX Development (Developers 3 & 4)

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
| **0-6** | Choose framework, setup project, create structure | App running |
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

## 🛠️ Framework Choice (Hour 0-2)

**You decide**: Choose your preferred framework based on team expertise.

### Popular Options:
- **React** (Vite, CRA, or Next.js) - Most common
- **Vue.js** (Nuxt.js or standalone) - Progressive
- **Svelte/SvelteKit** - Fast and lightweight
- **Vanilla JS** - Maximum control
- **Angular** - Enterprise-ready

### Required Setup:
```bash
cd frontend
# Initialize your chosen framework
# Install dependencies: axios (or fetch API), wallet connection library
```

### Environment Variables:
Create `.env` (or framework equivalent):
```env
VITE_API_URL=http://localhost:3001  # or NEXT_PUBLIC_API_URL for Next.js
VITE_CHAIN_ID=296
VITE_HASHSCAN_URL=https://hashscan.io/testnet
VITE_WC_PROJECT_ID=your-walletconnect-project-id  # Get from https://cloud.walletconnect.com
```

---

## 📁 Recommended File Structure (Framework-Agnostic)

```
frontend/
├── src/ (or app/, pages/, etc based on framework)
│   ├── components/           # Reusable UI components
│   │   ├── Header.tsx/jsx/vue
│   │   ├── AgentCard.tsx/jsx/vue
│   │   ├── PaymentForm.tsx/jsx/vue
│   │   ├── StatusBadge.tsx/jsx/vue
│   │   └── TransactionList.tsx/jsx/vue
│   ├── pages/ (or views/, routes/)
│   │   ├── Dashboard.tsx/jsx/vue
│   │   ├── Agents.tsx/jsx/vue
│   │   └── Payments.tsx/jsx/vue
│   ├── lib/ (or utils/, services/)
│   │   ├── api-client.ts/js     # REQUIRED: Backend integration
│   │   ├── wallet.ts/js         # Wallet connection helper
│   │   └── types.ts/js          # TypeScript/JS types
│   └── styles/ (or CSS, global styles)
└── package.json
```

---

## 🔑 Wallet Connection & Signature (REQUIRED Integration)

**Purpose**: Connect Hedera-compatible wallets (HashPack/Blade) for identity verification and transactions.

### Integration Requirements

You must implement wallet connection that:
1. Connects to Hedera wallet (HashPack, Blade, or WalletConnect v2)
2. Gets user's `accountId` and `evmAddress`
3. Signs messages for agent registration
4. Signs transactions for payments

### Wallet Connection Helper (Stub)

Create `lib/wallet.ts` (or `.js`):

```typescript
// Framework-agnostic wallet connection interface

export interface WalletState {
  isConnected: boolean;
  accountId: string | null;      // Hedera Account ID (0.0.xxxxx)
  evmAddress: string | null;     // EVM address (0x...)
  provider: any;                  // Wallet provider instance
}

export interface WalletAdapter {
  connect(): Promise<WalletState>;
  disconnect(): Promise<void>;
  signMessage(message: string): Promise<string>;
  getAccountId(): Promise<string>;
  getEvmAddress(): Promise<string>;
}

// Example implementation stub - adapt to your wallet library
export class WalletService implements WalletAdapter {
  private state: WalletState = {
    isConnected: false,
    accountId: null,
    evmAddress: null,
    provider: null
  };

  async connect(): Promise<WalletState> {
    // Implement using your chosen wallet library:
    // - @hashgraph/wallet-connect
    // - HashPack SDK
    // - Blade Wallet SDK
    // - WalletConnect v2
    
    // After connection, update state
    return this.state;
  }

  async disconnect(): Promise<void> {
    this.state = {
      isConnected: false,
      accountId: null,
      evmAddress: null,
      provider: null
    };
  }

  async signMessage(message: string): Promise<string> {
    // Sign message using connected wallet
    // Return signature string
    throw new Error('Implement wallet signing');
  }

  async getAccountId(): Promise<string> {
    return this.state.accountId || '';
  }

  async getEvmAddress(): Promise<string> {
    return this.state.evmAddress || '';
  }
}
```

### Identity Verification Flow (REQUIRED)

1. **Connect wallet** → Get `accountId` and `evmAddress`
2. **Build message JSON**:
```json
{
  "action": "registerAgent",
  "name": "<agentName>",
  "capabilities": ["smart-contracts"],
  "timestamp": "<iso-8601>"
}
```
3. **Sign message** using wallet
4. **POST to backend**:
```typescript
const response = await fetch(`${API_URL}/api/auth/verify-signature`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    accountId,
    evmAddress,
    message: messageObject,
    signature
  })
});
```
5. **On success** → Call `apiClient.registerAgent(...)`

---

## 📝 REQUIRED Integration Stubs (Both Devs Must Implement)

### API Client (REQUIRED - `lib/api-client.ts` or `.js`)

This is the **critical integration point** with the backend. You must implement this exactly as specified:

```typescript
const API_URL = import.meta.env.VITE_API_URL || 
                process.env.NEXT_PUBLIC_API_URL || 
                'http://localhost:3001';

// REQUIRED: Type definitions
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
  status: 'Active' | 'Completed' | 'Refunded' | 'Disputed';
  createdAt: string;
  completedAt: string | null;
  txHash?: string;  // Transaction hash for HashScan links
}

export interface TokenBalance {
  hbar: string;
  tokenBalance: number;
}

export interface x402Challenge {
  status: 402;
  payment: {
    network: string;
    asset: string;
    amount: string;
    memo?: string;
    payTo: string;
  };
}

// REQUIRED: API Client implementation
export const apiClient = {
  // ===== Agent Endpoints =====
  
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
    
    return response.json(); // { success, txHash, agentAddress, blockNumber }
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
    const response = await fetch(`${API_URL}/api/agents/search?capability=${encodeURIComponent(capability)}`);
    if (!response.ok) throw new Error('Search failed');
    return response.json();
  },

  // ===== Payment Endpoints =====
  
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
    
    return response.json(); // { success, escrowId, txHash, amount }
  },

  async releasePayment(escrowId: string) {
    const response = await fetch(`${API_URL}/api/payments/${escrowId}/release`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Release failed');
    return response.json(); // { success, txHash }
  },

  async refundPayment(escrowId: string) {
    const response = await fetch(`${API_URL}/api/payments/${escrowId}/refund`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Refund failed');
    return response.json(); // { success, txHash }
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

  // ===== Token Endpoints (HTS Stablecoin Support) =====
  
  async getBalances(accountId: string, tokenId: string): Promise<TokenBalance> {
    const res = await fetch(`${API_URL}/api/tokens/${accountId}/balances/${tokenId}`);
    if (!res.ok) throw new Error('Failed to fetch balances');
    return res.json();
  },

  async transferToken(params: {
    tokenId: string;
    fromId: string;
    fromKey: string;  // Private key - handle securely
    toId: string;
    amount: number;
  }) {
    const res = await fetch(`${API_URL}/api/tokens/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error('Token transfer failed');
    return res.json(); // { status, txHash }
  },

  // ===== x402 Payment Flow (HTTP 402) =====
  
  async x402Challenge(amountHbar: string, memo?: string): Promise<x402Challenge> {
    const res = await fetch(`${API_URL}/api/x402/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountHbar, memo })
    });
    const data = await res.json();
    return { status: res.status, ...data };
  },

  async x402Verify(txId: string) {
    const res = await fetch(`${API_URL}/api/x402/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txId })
    });
    if (!res.ok) throw new Error('Verification failed');
    return res.json(); // { verified: true, tx }
  },

  // ===== Health Check =====
  
  async healthCheck() {
    const response = await fetch(`${API_URL}/api/health`);
    return response.json(); // { status, timestamp, network, version }
  }
};
```

### Type Definitions (REQUIRED - `lib/types.ts` or `.js`)

```typescript
export type { Agent, Payment, TokenBalance, x402Challenge } from './api-client';

export interface AppState {
  walletAddress: string | null;
  isConnected: boolean;
  setWalletAddress: (address: string | null) => void;
}

export interface PaymentFlow {
  step: 'idle' | 'challenge' | 'waiting' | 'verifying' | 'complete' | 'error';
  challenge?: x402Challenge;
  txId?: string;
  error?: string;
}
```

---

## 🎨 Component Specifications (Developer 3)

### Required Components (Framework-Agnostic Specs)

#### 1. Header Component
**Requirements**:
- Logo/branding
- Navigation links: Dashboard, Agents, Payments
- Wallet connection button/status
- Show connected address (truncated)

#### 2. AgentCard Component
**Props**:
```typescript
interface AgentCardProps {
  agent: Agent;
  onSelect?: (agent: Agent) => void;
}
```
**Display**:
- Agent name
- Trust score badge (color-coded: green ≥75, yellow ≥50, red <50)
- Address (truncated)
- Capabilities (tags/badges)
- Registration date
- Active status indicator

#### 3. StatusBadge Component
**Props**:
```typescript
interface StatusBadgeProps {
  status: 'Active' | 'Completed' | 'Refunded' | 'Disputed';
}
```
**Visual**: Color-coded badge per status

#### 4. PaymentForm Component
**Requirements**:
- Payee address input
- Amount input (HBAR)
- Description textarea
- Submit button (disabled during loading)
- Success/error feedback

#### 5. TransactionList Component (Optional but Recommended)
**Requirements**:
- List of payments/transactions
- Status badges
- HashScan links for transactions
- Filtering/sorting

---

## 📄 Page Specifications (Developer 4)

### Required Pages

#### 1. Dashboard Page (`/` or `dashboard`)
**Requirements**:
- Hero section with title/description
- Stats cards:
  - Total active agents
  - Highly trusted agents (trustScore ≥ 75)
  - Unique capabilities count
- Recent agents grid (show 6-9 agents)
- Loading states
- Error handling

#### 2. Agents Page (`/agents`)
**Requirements**:
- Search bar (by capability)
- Agent grid/list
- Loading states
- Empty states
- Agent detail modal/page (optional)

#### 3. Payments Page (`/payments`)
**Requirements**:
- Payment creation form
- Payment history/list
- x402 payment flow UI (optional but recommended)
- HashScan transaction links
- Release/refund buttons

---

## 🔗 HashScan Integration (REQUIRED)

All transaction hashes must link to HashScan:

```typescript
const HASHSCAN_BASE = 'https://hashscan.io/testnet';

export function getHashScanTxLink(txHash: string): string {
  return `${HASHSCAN_BASE}/transaction/${txHash}`;
}

export function getHashScanAccountLink(accountId: string): string {
  return `${HASHSCAN_BASE}/account/${accountId}`;
}
```

Display as external link with icon.

---

## ✅ Integration Checklist

### Hour 0-6: Setup & API Client
- [ ] Choose framework
- [ ] Setup project structure
- [ ] Implement `api-client.ts` (copy exactly from spec)
- [ ] Implement `types.ts`
- [ ] Test API connection (`healthCheck()`)
- [ ] Setup wallet connection library

### Hour 6-12: Core Components
- [ ] Header with wallet connection
- [ ] AgentCard component
- [ ] StatusBadge component
- [ ] PaymentForm component
- [ ] Basic styling system

### Hour 12-18: Pages & Integration
- [ ] Dashboard page with stats
- [ ] Agents page with search
- [ ] Payments page with form
- [ ] Connect all pages to API client
- [ ] Implement wallet signature flow
- [ ] Add HashScan links

### Hour 18-24: Polish & Features
- [ ] Loading states everywhere
- [ ] Error handling
- [ ] Responsive design
- [ ] Payment history view
- [ ] x402 flow UI (if time permits)
- [ ] Token balance display (if time permits)

### Day 2: Enhancement
- [ ] Animations and transitions
- [ ] Mobile optimization
- [ ] Real-time updates (polling or WebSocket)
- [ ] Trust score visualizations
- [ ] Agent capability filtering
- [ ] Demo preparation

---

## 🚨 Common Issues & Solutions

### "API call failed"
- Check backend is running: `curl http://localhost:3001/api/health`
- Verify `VITE_API_URL` or `NEXT_PUBLIC_API_URL` in `.env`
- Check CORS settings (backend should allow your frontend origin)

### "Wallet not connecting"
- Verify wallet extension is installed (HashPack/Blade)
- Check network (must be Hedera testnet)
- Review wallet library documentation

### "Signature verification fails"
- Ensure message JSON string matches exactly
- Check wallet is signing with correct account
- Verify backend signature verification endpoint

### "TypeScript/ESLint errors"
- Ensure `lib/api-client.ts` exports match spec exactly
- Check framework-specific type imports
- Verify environment variable types

---

## 💡 Framework-Specific Tips

### React (Vite/Next.js)
- Use `useState` and `useEffect` for API calls
- Consider `react-query` for caching
- Use `react-router-dom` or Next.js routing

### Vue.js
- Use `ref()` and `computed()` for reactive state
- Vue Router for navigation
- `axios` or `fetch` for API calls

### Svelte/SvelteKit
- Use reactive `$:` statements
- SvelteKit file-based routing
- Fetch API directly in load functions

### Vanilla JS
- Use fetch API directly
- Consider lightweight router (page.js, navigo)
- State management with simple objects/classes

---

## 📚 Resources

### Wallet Connection
- **HashPack**: https://www.hashpack.app/
- **Blade Wallet**: https://www.blade-wallet.com/
- **WalletConnect**: https://docs.walletconnect.com/

### Hedera
- **HashScan**: https://hashscan.io/testnet
- **Hedera Docs**: https://docs.hedera.com/

### Your Chosen Framework Docs
- React: https://react.dev/
- Vue: https://vuejs.org/
- Svelte: https://svelte.dev/
- etc.

---

## 🗺️ Roadmap & Team TODOs (Scoring-Aligned)

### Day 1 (Foundation: Feasibility, Technical Depth)
- [x] Choose framework and scaffold project (Completed: Next.js with TypeScript and shadcn/ui)
- [x] Implement `lib/api-client` exactly per spec; test `/api/health` (Completed: Comprehensive api-client.ts with all endpoints)
- [ ] Implement wallet connect + signed message flow for agent registration (Pending: Wallet integration not implemented)
- [x] Pages: Dashboard, Agents, Payments (basic data fetch + render) (Completed: Home page with payment flow, marketplace page with agents)
- [ ] HashScan links for tx hashes; environment variables wired (Partial: HashScan URL in types, but env vars not fully configured)

### Day 2 (Creativity, Visual Design, Reachability)
- [x] Agent directory: multi-capability filters, sort by trust/date (Completed: Marketplace with category filters and search)
- [x] Trust visuals: badges/charts; hover/transition animations; mobile fixes (Completed: Trust score progress bars, rating stars, hover effects)
- [ ] Real-time polling (10s) for new agents/payments; toasts for updates (Pending: Using mock data, no polling implemented)
- [ ] x402 UI: clear steps (challenge → pay → verify) with status states (Pending: Payment flow UI exists but x402 specific flow not implemented)
- [ ] HCS interaction timeline (if backend endpoint available) (Pending: Not implemented)

### Stretch (If Time)
- [ ] Payment templates (prefill form)
- [ ] Agent detail modal with extended info and history
- [ ] Token balances display and simple transfer form

### Dev 3 (Components) – Detailed TODOs
- [x] `Header` with wallet connect state + nav (Completed: Navigation between home and marketplace implemented)
- [x] `AgentCard` with trust visualization + capability chips (Completed: Agent cards in marketplace with trust scores, ratings, tags)
- [x] `StatusBadge` with consistent colors/icons (Completed: Badge component from shadcn/ui used throughout)
- [x] Loading skeletons and error states across pages (Completed: shadcn/ui skeleton component available)

### Dev 4 (Pages) – Detailed TODOs
- [ ] Dashboard stats: total agents, high trust, unique capabilities (Pending: Home page shows payment flow but not agent stats)
- [x] Agents page: search + multi-filter + sort; empty/loading states (Completed: Marketplace page with search, category filter, empty states)
- [x] Payments page: create escrow, result panel with HashScan link (Completed: Payment request, processing, and result screens implemented)
- [ ] x402 flow UI: request challenge, accept payment, verify (Pending: Not implemented)

## 🎯 Winning Features (Low-Hanging Fruit)

Based on scoring criteria, here are quick wins:

### Creativity (20%)
- [ ] **Agent interaction timeline** - Visual timeline showing agent-to-agent interactions logged via HCS
- [ ] **Trust score visualization** - Animated charts showing trust score changes over time
- [ ] **Agent capability marketplace** - Visual browsing by capability with filtering

### Visual Design (10%)
- [ ] **Modern UI animations** - Smooth transitions, loading skeletons, hover effects
- [ ] **Trust score badges** - Beautiful gradient badges for different trust levels
- [ ] **Transaction flow diagrams** - Visual representation of payment/escrow flows
- [ ] **Mobile-responsive design** - Test on multiple screen sizes

### Feasibility (20%)
- [ ] **Real-time updates** - Polling or WebSocket for new agents/payments
- [ ] **Payment history with filters** - Filter by status, date, amount
- [ ] **Agent detail views** - Expandable cards showing full agent info

### Reachability (20%)
- [ ] **Capability filtering** - Multi-select capability filter on agents page
- [ ] **Agent search enhancements** - Search by name AND capability
- [ ] **Payment templates** - Pre-filled payment forms for common services

### Technical Depth (30%)
- [ ] **HCS message viewing** - Display messages from Hedera Consensus Service
- [ ] **x402 full flow** - Complete UI for challenge → payment → verification
- [ ] **Token balance integration** - Show HBAR and token balances
- [ ] **Transaction verification** - Real-time status checking via mirror node
- [ ] **Agent performance metrics** - Show transaction count, success rate, etc.

---

**You're building the face of the agentic economy! 🎨✨**

Choose your tools wisely and focus on smooth integration with the backend API.
