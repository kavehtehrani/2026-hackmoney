import type { ChainConfig } from "./types";

export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  ethereum: {
    id: 1,
    name: "ethereum",
    displayName: "Ethereum",
    nativeCurrency: "ETH",
    rpcUrl: "https://eth.llamarpc.com",
    explorerUrl: "https://etherscan.io",
    lifiChainId: 1,
    usdcAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  },
  arbitrum: {
    id: 42161,
    name: "arbitrum",
    displayName: "Arbitrum",
    nativeCurrency: "ETH",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://arbiscan.io",
    lifiChainId: 42161,
    usdcAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  },
  optimism: {
    id: 10,
    name: "optimism",
    displayName: "Optimism",
    nativeCurrency: "ETH",
    rpcUrl: "https://mainnet.optimism.io",
    explorerUrl: "https://optimistic.etherscan.io",
    lifiChainId: 10,
    usdcAddress: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
  },
  polygon: {
    id: 137,
    name: "polygon",
    displayName: "Polygon",
    nativeCurrency: "MATIC",
    rpcUrl: "https://polygon-rpc.com",
    explorerUrl: "https://polygonscan.com",
    lifiChainId: 137,
    usdcAddress: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  },
  base: {
    id: 8453,
    name: "base",
    displayName: "Base",
    nativeCurrency: "ETH",
    rpcUrl: "https://mainnet.base.org",
    explorerUrl: "https://basescan.org",
    lifiChainId: 8453,
    usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
};

export const SUPPORTED_TOKENS: Record<string, { symbol: string; name: string; decimals: number }> = {
  USDC: { symbol: "USDC", name: "USD Coin", decimals: 6 },
  USDT: { symbol: "USDT", name: "Tether USD", decimals: 6 },
  DAI: { symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
  ETH: { symbol: "ETH", name: "Ethereum", decimals: 18 },
};

export function getChainByName(name: string): ChainConfig | undefined {
  const normalized = name.toLowerCase().trim();
  return SUPPORTED_CHAINS[normalized];
}

export function getChainById(id: number): ChainConfig | undefined {
  return Object.values(SUPPORTED_CHAINS).find((c) => c.id === id);
}

export function getExplorerTxUrl(chainName: string, txHash: string): string {
  const chain = getChainByName(chainName);
  if (!chain) return "";
  return `${chain.explorerUrl}/tx/${txHash}`;
}
