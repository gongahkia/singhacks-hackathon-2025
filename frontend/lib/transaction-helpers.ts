// Transaction helpers for Phase 2 wallet integration
// These functions prepare and sign transactions using wagmi/viem

import { Address, encodeFunctionData, parseEther, type Chain } from 'viem'
import { wagmiConfig } from './wagmi-config'

export interface PrepareEscrowParams {
  payee: Address
  amountInHbar: string | number
  description: string
  expirationDays?: number
}

export interface PrepareAgentRegistrationParams {
  name: string
  capabilities: string[]
  metadata?: string
}

/**
 * Prepare transaction data for creating an escrow
 * Returns the encoded function data that can be signed and sent
 */
export async function prepareEscrowTransaction(
  params: PrepareEscrowParams
): Promise<{ to: Address; data: `0x${string}`; value: bigint }> {
  const paymentProcessorAddress = process.env.NEXT_PUBLIC_PAYMENT_PROCESSOR_ADDRESS as Address
  if (!paymentProcessorAddress) {
    throw new Error('NEXT_PUBLIC_PAYMENT_PROCESSOR_ADDRESS not configured')
  }

  // PaymentProcessor ABI for createEscrow function
  const abi = [
    {
      inputs: [
        { name: '_payee', type: 'address' },
        { name: '_serviceDescription', type: 'string' },
        { name: '_expirationDays', type: 'uint256' }
      ],
      name: 'createEscrow',
      outputs: [{ name: 'escrowId', type: 'bytes32' }],
      stateMutability: 'payable',
      type: 'function'
    }
  ] as const

  const data = encodeFunctionData({
    abi,
    functionName: 'createEscrow',
    args: [
      params.payee,
      params.description,
      BigInt(params.expirationDays || 0)
    ]
  })

  const value = parseEther(params.amountInHbar.toString())

  return {
    to: paymentProcessorAddress,
    data,
    value
  }
}

/**
 * Prepare transaction data for registering an agent
 */
export async function prepareAgentRegistrationTransaction(
  params: PrepareAgentRegistrationParams
): Promise<{ to: Address; data: `0x${string}`; value: bigint }> {
  const agentRegistryAddress = process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS as Address
  if (!agentRegistryAddress) {
    throw new Error('NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS not configured')
  }

  // AgentRegistry ABI for registerAgent function
  const abi = [
    {
      inputs: [
        { name: '_name', type: 'string' },
        { name: '_capabilities', type: 'string[]' },
        { name: '_metadata', type: 'string' }
      ],
      name: 'registerAgent',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function'
    }
  ] as const

  const data = encodeFunctionData({
    abi,
    functionName: 'registerAgent',
    args: [
      params.name,
      params.capabilities,
      params.metadata || ''
    ]
  })

  return {
    to: agentRegistryAddress,
    data,
    value: 0n
  }
}

/**
 * Helper to get contract addresses from environment or deployment.json
 */
export function getContractAddresses() {
  return {
    paymentProcessor: process.env.NEXT_PUBLIC_PAYMENT_PROCESSOR_ADDRESS as Address | undefined,
    agentRegistry: process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS as Address | undefined,
  }
}

