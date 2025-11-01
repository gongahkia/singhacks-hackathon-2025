// lib/x402-payment.ts
// x402 payment utilities for Hedera

import { AccountId, Client, PrivateKey, TransferTransaction, Hbar, TransactionId, TokenId } from "@hashgraph/sdk";

const FACILITATOR_URL = process.env.NEXT_PUBLIC_X402_FACILITATOR_URL || 'https://x402-hedera-production.up.railway.app';
const NETWORK = 'hedera-testnet';

export interface PaymentRequirements {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  asset: string;
  payTo: string;
  resource?: string;
  description?: string;
  maxTimeoutSeconds?: number;
  extra?: {
    feePayer?: string;
  };
}

export interface PaymentPayload {
  scheme: string;
  network: string;
  x402Version: number;
  payload: {
    transaction: string; // base64 encoded
  };
}

/**
 * Creates a Hedera client connected to testnet
 */
export function createHederaClient(): Client {
  return Client.forTestnet();
}

/**
 * Creates a Hedera signer from private key and account ID
 * Note: In production, you'd get this from wallet connection (HashConnect, Blade, etc.)
 */
export function createHederaSigner(
  privateKeyString: string,
  accountId: string
): { client: Client; accountId: AccountId; privateKey: PrivateKey } {
  const client = createHederaClient();
  const privateKey = PrivateKey.fromStringECDSA(privateKeyString);
  const hederaAccountId = AccountId.fromString(accountId);
  client.setOperator(hederaAccountId, privateKey);

  return {
    client,
    accountId: hederaAccountId,
    privateKey
  };
}

/**
 * Get payment requirements from backend
 */
export async function getPaymentRequirements(
  amount: number,
  currency: 'HBAR' | 'USDC',
  payTo: string,
  memo?: string
): Promise<PaymentRequirements> {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const asset = currency === 'USDC' ? (process.env.NEXT_PUBLIC_USDC_TOKEN_ID || '0.0.429274') : 'HBAR';
  
  // Convert amount to tinybars (HBAR) or token units
  const amountInTinybars = currency === 'HBAR' 
    ? Math.floor(amount * 100000000) // 1 HBAR = 100,000,000 tinybars
    : Math.floor(amount * 1000000); // USDC has 6 decimals
  
  const response = await fetch(`${BASE_URL}/api/x402/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: amountInTinybars.toString(),
      currency,
      payTo,
      memo: memo || 'Agent payment'
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to get payment requirements: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Extract payment requirements from x402 challenge
  if (data.accepts && data.accepts.length > 0) {
    const accept = data.accepts[0];
    return {
      scheme: accept.scheme || 'exact',
      network: accept.network || NETWORK,
      maxAmountRequired: accept.maxAmountRequired || amountInTinybars.toString(),
      asset: accept.asset || asset,
      payTo: accept.payTo || payTo,
      resource: accept.resource,
      description: accept.description || memo,
      maxTimeoutSeconds: accept.maxTimeoutSeconds || 300,
      extra: {
        feePayer: accept.extra?.feePayer || process.env.NEXT_PUBLIC_FACILITATOR_ACCOUNT_ID || '0.0.2961788'
      }
    };
  }

  throw new Error('Invalid payment requirements response');
}

/**
 * Creates and signs a Hedera payment transaction for x402
 */
export async function createAndSignPayment(
  signer: { client: Client; accountId: AccountId; privateKey: PrivateKey },
  paymentRequirements: PaymentRequirements
): Promise<PaymentPayload> {
  const { accountId, privateKey, client } = signer;
  const facilitatorAccountId = AccountId.fromString(
    paymentRequirements.extra?.feePayer || '0.0.2961788'
  );
  const toAccount = AccountId.fromString(paymentRequirements.payTo);
  const amount = paymentRequirements.maxAmountRequired;

  // Generate transaction ID with facilitator as fee payer
  const transactionId = TransactionId.generate(facilitatorAccountId);

  let transaction: TransferTransaction;

  if (paymentRequirements.asset === 'HBAR' || paymentRequirements.asset === '0.0.0') {
    // HBAR transfer
    transaction = new TransferTransaction()
      .setTransactionId(transactionId)
      .addHbarTransfer(accountId, Hbar.fromTinybars(-parseInt(amount)))
      .addHbarTransfer(toAccount, Hbar.fromTinybars(parseInt(amount)));
  } else {
    // Token transfer
    const tokenId = TokenId.fromString(paymentRequirements.asset);
    transaction = new TransferTransaction()
      .setTransactionId(transactionId)
      .addTokenTransfer(tokenId, accountId, -parseInt(amount))
      .addTokenTransfer(tokenId, toAccount, parseInt(amount));
  }

  // Freeze and sign transaction
  const frozenTx = transaction.freezeWith(client);
  const signedTx = await frozenTx.sign(privateKey);

  // Serialize to base64
  const serialized = signedTx.toBytes();
  // Use browser-compatible base64 encoding
  // Convert Uint8Array to string for btoa
  const uint8Array = new Uint8Array(serialized);
  const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
  const base64 = btoa(binaryString);

  return {
    scheme: paymentRequirements.scheme,
    network: paymentRequirements.network,
    x402Version: 1,
    payload: {
      transaction: base64
    }
  };
}

/**
 * Verify payment with facilitator
 */
export async function verifyPayment(
  payload: PaymentPayload,
  paymentRequirements: PaymentRequirements
): Promise<{ verified: boolean; txId?: string }> {
  const response = await fetch(`${FACILITATOR_URL}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      x402Version: payload.x402Version,
      paymentPayload: payload,
      paymentRequirements: paymentRequirements
    })
  });

  if (!response.ok) {
    throw new Error(`Payment verification failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Settle payment with facilitator
 */
export async function settlePayment(
  payload: PaymentPayload,
  paymentRequirements: PaymentRequirements
): Promise<{ txId: string; txHash: string }> {
  const response = await fetch(`${FACILITATOR_URL}/settle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      x402Version: payload.x402Version,
      paymentPayload: payload,
      paymentRequirements: paymentRequirements
    })
  });

  if (!response.ok) {
    throw new Error(`Payment settlement failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Complete x402 payment flow: create, verify, and settle
 * Note: This requires Hedera account ID and private key
 * For wagmi wallets, you'd need to use HashConnect/Blade or convert EVM address to Account ID
 */
export async function completeX402Payment(
  amount: number,
  currency: 'HBAR' | 'USDC',
  payTo: string,
  hederaAccountId: string,
  hederaPrivateKey: string,
  memo?: string
): Promise<{ txId: string; txHash: string }> {
  // Get payment requirements
  const requirements = await getPaymentRequirements(amount, currency, payTo, memo);
  
  // Create signer
  const signer = createHederaSigner(hederaPrivateKey, hederaAccountId);
  
  // Create and sign payment
  const payload = await createAndSignPayment(signer, requirements);
  
  // Verify payment
  await verifyPayment(payload, requirements);
  
  // Settle payment
  const result = await settlePayment(payload, requirements);
  
  return result;
}

