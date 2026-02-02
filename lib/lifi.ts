import {
  createConfig,
  EVM,
  getQuote,
  getRoutes,
  executeRoute,
  convertQuoteToRoute,
  getStatus,
  type ExecutionOptions,
  type RouteExtended,
} from "@lifi/sdk";
import type { Route, LiFiStep, RoutesRequest, StatusResponse } from "@lifi/types";
import { createWalletClient, custom, type WalletClient } from "viem";
import { mainnet, arbitrum, optimism, polygon, base } from "viem/chains";
import { SUPPORTED_CHAINS } from "./chains";

// Map chain IDs to viem chain objects
const viemChains: Record<number, typeof mainnet> = {
  1: mainnet,
  42161: arbitrum,
  10: optimism,
  137: polygon,
  8453: base,
};

// Initialize LI.FI SDK once
let initialized = false;

function ensureInitialized() {
  if (initialized) return;
  createConfig({
    integrator: process.env.NEXT_PUBLIC_LIFI_INTEGRATOR || "payflow-hackathon",
    providers: [EVM()],
  });
  initialized = true;
}

// ---- Wallet integration ----

/**
 * Creates a viem WalletClient from a Privy EIP-1193 provider.
 * This is what LI.FI needs for transaction signing.
 */
export function createViemWalletClient(
  eip1193Provider: { request: (...args: unknown[]) => Promise<unknown> },
  chainId: number,
  account: `0x${string}`
): WalletClient {
  const chain = viemChains[chainId] || mainnet;
  return createWalletClient({
    account,
    chain,
    transport: custom(eip1193Provider),
  });
}

/**
 * Build execution options that connect LI.FI to the user's Privy wallet.
 */
export function buildExecutionOptions(
  getWalletClientForChain: (chainId: number) => Promise<WalletClient>,
  onStatusUpdate?: (route: RouteExtended) => void
): ExecutionOptions {
  return {
    switchChainHook: async (chainId: number) => {
      const client = await getWalletClientForChain(chainId);
      return client;
    },
    updateRouteHook: (updatedRoute: RouteExtended) => {
      onStatusUpdate?.(updatedRoute);
    },
    acceptExchangeRateUpdateHook: async () => {
      // Auto-accept rate updates for hackathon demo
      return true;
    },
  };
}

// ---- Quotes ----

export interface QuoteParams {
  fromAddress: string;
  fromChainId: number;
  toChainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  toAddress: string;
  fromAmount: string;
}

export async function fetchQuote(params: QuoteParams): Promise<LiFiStep> {
  ensureInitialized();
  const quote = await getQuote({
    fromAddress: params.fromAddress,
    fromChain: params.fromChainId,
    toChain: params.toChainId,
    fromToken: params.fromTokenAddress,
    toToken: params.toTokenAddress,
    toAddress: params.toAddress,
    fromAmount: params.fromAmount,
  });
  return quote;
}

// ---- Routes (multiple options) ----

export interface RouteParams {
  fromChainId: number;
  toChainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromAmount: string;
  fromAddress?: string;
  toAddress?: string;
}

export async function fetchRoutes(params: RouteParams) {
  ensureInitialized();
  const request: RoutesRequest = {
    fromChainId: params.fromChainId,
    toChainId: params.toChainId,
    fromTokenAddress: params.fromTokenAddress,
    toTokenAddress: params.toTokenAddress,
    fromAmount: params.fromAmount,
    fromAddress: params.fromAddress,
    toAddress: params.toAddress,
  };
  const result = await getRoutes(request);
  return result;
}

// ---- Execution ----

export async function executePayment(
  quote: LiFiStep,
  executionOptions: ExecutionOptions
): Promise<RouteExtended> {
  ensureInitialized();
  const route: Route = convertQuoteToRoute(quote);
  const result = await executeRoute(route, executionOptions);
  return result;
}

// ---- Status tracking ----

export async function checkTransactionStatus(
  txHash: string,
  fromChainId: number,
  toChainId: number,
  bridge?: string
): Promise<StatusResponse> {
  ensureInitialized();
  const status = await getStatus({
    txHash,
    fromChain: fromChainId,
    toChain: toChainId,
    bridge,
  });
  return status;
}

// ---- Balances ----

export interface WalletTokenBalance {
  symbol: string;
  name: string;
  amount: string;
  chainId: number;
  address: string;
  decimals: number;
  priceUSD: string;
}

export async function getWalletBalances(
  walletAddress: string,
  chainIds: number[]
): Promise<WalletTokenBalance[]> {
  const chainsParam = chainIds.join(",");
  const res = await fetch(
    `https://li.quest/v1/token/balances?walletAddress=${walletAddress}&chains=${chainsParam}`
  );

  if (!res.ok) return [];

  const data = await res.json();
  const balances: WalletTokenBalance[] = [];

  for (const [chainIdStr, tokens] of Object.entries(data)) {
    const chainId = parseInt(chainIdStr, 10);
    if (!Array.isArray(tokens)) continue;

    for (const token of tokens) {
      const t = token as Record<string, unknown>;
      const amount = t.amount?.toString() || "0";
      if (amount === "0") continue;

      balances.push({
        symbol: (t.symbol as string) || "???",
        name: (t.name as string) || "",
        amount,
        chainId,
        address: (t.address as string) || "",
        decimals: (t.decimals as number) || 18,
        priceUSD: (t.priceUSD as string) || "0",
      });
    }
  }

  return balances;
}

// ---- Helpers ----

export function getChainDisplayName(chainId: number): string {
  return (
    Object.values(SUPPORTED_CHAINS).find((c) => c.id === chainId)?.displayName ||
    String(chainId)
  );
}

export function formatTokenAmount(amount: string, decimals: number): string {
  const value = parseFloat(amount) / 10 ** decimals;
  if (value < 0.0001) return "<0.0001";
  return value.toFixed(4);
}
