// Wallet adapter stub - implement with HashPack/Blade/WalletConnect
export interface WalletState {
  isConnected: boolean
  accountId: string | null
  evmAddress: string | null
  provider: any
}

export class WalletService {
  private state: WalletState = { isConnected: false, accountId: null, evmAddress: null, provider: null }
  async connect(): Promise<WalletState> { return this.state }
  async disconnect(): Promise<void> { this.state = { isConnected: false, accountId: null, evmAddress: null, provider: null } }
  async signMessage(_message: string): Promise<string> { throw new Error('Implement wallet signing') }
  async getAccountId(): Promise<string> { return this.state.accountId || '' }
  async getEvmAddress(): Promise<string> { return this.state.evmAddress || '' }
}
