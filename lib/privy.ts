import type { PrivyClientConfig } from "@privy-io/react-auth";

export const privyConfig: PrivyClientConfig = {
  loginMethods: ["email", "google", "wallet"],
  appearance: {
    theme: "dark",
    accentColor: "#6366f1",
    logo: undefined,
    walletList: ["metamask", "coinbase_wallet", "rainbow", "phantom"],
  },
  embeddedWallets: {
    ethereum: {
      createOnLogin: "users-without-wallets",
    },
  },
  supportedChains: [
    { id: 1, name: "Ethereum", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["https://eth.llamarpc.com"] } } },
    { id: 42161, name: "Arbitrum One", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["https://arb1.arbitrum.io/rpc"] } } },
    { id: 10, name: "OP Mainnet", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["https://mainnet.optimism.io"] } } },
    { id: 137, name: "Polygon", nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 }, rpcUrls: { default: { http: ["https://polygon-rpc.com"] } } },
    { id: 8453, name: "Base", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["https://mainnet.base.org"] } } },
  ],
};
