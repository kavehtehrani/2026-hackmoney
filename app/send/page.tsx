"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useRouter, useSearchParams } from "next/navigation";
import { createPublicClient, http } from "viem";
import { normalize } from "viem/ens";
import { mainnet } from "viem/chains";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TokenIcon } from "@/components/TokenIcon";
import { BalanceGrid } from "@/components/BalanceGrid";
import { TokenSelect, ChainSelect } from "@/components/ui/token-select";
import { SUPPORTED_CHAINS } from "@/lib/chains";
import {
  getWalletBalances,
  formatTokenAmount,
  needsApproval,
  getTokenAllowance,
  buildApprovalTx,
  type WalletTokenBalance,
} from "@/lib/lifi";

// ENS resolution client (mainnet only)
const ensClient = createPublicClient({
  chain: mainnet,
  transport: http("https://eth.drpc.org"),
});

// Common tokens for receiving (can be different from what user has)
const RECEIVE_TOKENS = [
  { symbol: "ETH", address: "0x0000000000000000000000000000000000000000", decimals: 18 },
  { symbol: "USDC", address: "USDC", decimals: 6 },
  { symbol: "USDT", address: "USDT", decimals: 6 },
  { symbol: "DAI", address: "DAI", decimals: 18 },
  { symbol: "WBTC", address: "WBTC", decimals: 8 },
  { symbol: "ARB", address: "ARB", decimals: 18 },
  { symbol: "OP", address: "OP", decimals: 18 },
  { symbol: "POL", address: "POL", decimals: 18 },
  { symbol: "LINK", address: "LINK", decimals: 18 },
  { symbol: "UNI", address: "UNI", decimals: 18 },
  { symbol: "AAVE", address: "AAVE", decimals: 18 },
];

// Token addresses per chain (0x0 means not available on that chain)
const TOKEN_BY_CHAIN: Record<string, Record<number, string>> = {
  USDC: {
    1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    10: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    137: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
  USDT: {
    1: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    42161: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    10: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    137: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    8453: "0x0000000000000000000000000000000000000000",
  },
  DAI: {
    1: "0x6B175474E89094C44Da98b954EesdfCD86dFB820",
    42161: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    10: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    137: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    8453: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
  },
  WBTC: {
    1: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    42161: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
    10: "0x68f180fcCe6836688e9084f035309E29Bf0A2095",
    137: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
    8453: "0x0000000000000000000000000000000000000000",
  },
  ARB: {
    1: "0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1",
    42161: "0x912CE59144191C1204E64559FE8253a0e49E6548",
    10: "0x0000000000000000000000000000000000000000",
    137: "0x0000000000000000000000000000000000000000",
    8453: "0x0000000000000000000000000000000000000000",
  },
  OP: {
    1: "0x0000000000000000000000000000000000000000",
    42161: "0x0000000000000000000000000000000000000000",
    10: "0x4200000000000000000000000000000000000042",
    137: "0x0000000000000000000000000000000000000000",
    8453: "0x0000000000000000000000000000000000000000",
  },
  POL: {
    1: "0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6",
    42161: "0x0000000000000000000000000000000000000000",
    10: "0x0000000000000000000000000000000000000000",
    137: "0x0000000000000000000000000000000000000000", // Native on Polygon
    8453: "0x0000000000000000000000000000000000000000",
  },
  LINK: {
    1: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    42161: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
    10: "0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6",
    137: "0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39",
    8453: "0x0000000000000000000000000000000000000000",
  },
  UNI: {
    1: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    42161: "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
    10: "0x6fd9d7AD17242c41f7131d257212c54A0e816691",
    137: "0xb33EaAd8d922B1083446DC23f610c2567fB5180f",
    8453: "0x0000000000000000000000000000000000000000",
  },
  AAVE: {
    1: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
    42161: "0xba5DdD1f9d7F570dc94a51479a000E3BCE967196",
    10: "0x76FB31fb4af56892A25e32cFC43De717950c9278",
    137: "0xD6DF932A45C0f255f85145f286eA0b292B21C90B",
    8453: "0x0000000000000000000000000000000000000000",
  },
};

// Legacy mappings for backward compatibility
const USDC_BY_CHAIN = TOKEN_BY_CHAIN.USDC;
const USDT_BY_CHAIN = TOKEN_BY_CHAIN.USDT;

interface Quote {
  id: string;
  tool: string;
  action: {
    fromChainId: number;
    toChainId: number;
    fromToken: { symbol: string; decimals: number; address: string };
    toToken: { symbol: string; decimals: number; address: string };
    fromAmount: string;
    toAddress: string;
  };
  estimate: {
    toAmount: string;
    toAmountMin: string;
    approvalAddress: string;
    executionDuration: number;
    feeCosts: Array<{ amountUSD: string }>;
    gasCosts: Array<{ amountUSD: string }>;
  };
  transactionRequest: {
    to: string;
    data: string;
    value: string;
    chainId: number;
    gasLimit: string;
  };
}

type TxStatus = "idle" | "approving" | "sending" | "confirming" | "success" | "error";

function SendPageContent() {
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get active wallet
  const activeWallet = wallets.find((w) => w.walletClientType !== "privy") || wallets[0];
  const walletAddress = activeWallet?.address;

  // User balances
  const [balances, setBalances] = useState<WalletTokenBalance[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(false);

  // Form state
  const [selectedBalance, setSelectedBalance] = useState<WalletTokenBalance | null>(null);
  const [toAddress, setToAddress] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolvingEns, setResolvingEns] = useState(false);
  const [toChainId, setToChainId] = useState<number>(8453); // Default to Base
  const [toTokenSymbol, setToTokenSymbol] = useState("USDC");
  const [amount, setAmount] = useState("");

  // Quote state
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Transaction state
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  // URL params tracking
  const [urlParamsApplied, setUrlParamsApplied] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  // Handle URL params on mount
  useEffect(() => {
    if (urlParamsApplied) return;

    const amountParam = searchParams.get("amount");
    const tokenParam = searchParams.get("token");
    const toParam = searchParams.get("to");
    const chainParam = searchParams.get("chain");
    const fromParam = searchParams.get("from");

    if (amountParam || tokenParam || toParam || chainParam || fromParam) {
      if (amountParam) setAmount(amountParam);
      if (toParam) setToAddress(toParam);
      if (tokenParam) setToTokenSymbol(tokenParam.toUpperCase());
      if (chainParam) {
        const chain = Object.values(SUPPORTED_CHAINS).find(
          (c) => c.name.toLowerCase() === chainParam.toLowerCase()
        );
        if (chain) setToChainId(chain.id);
      }
      // fromParam will be handled when balances load
      setUrlParamsApplied(true);
    }
  }, [searchParams, urlParamsApplied]);

  // Apply fromParam when balances are available
  useEffect(() => {
    const fromParam = searchParams.get("from");
    const tokenParam = searchParams.get("token");

    if (fromParam && balances.length > 0 && !selectedBalance) {
      const targetChain = Object.values(SUPPORTED_CHAINS).find(
        (c) => c.name.toLowerCase() === fromParam.toLowerCase()
      );
      if (targetChain) {
        const targetToken = tokenParam?.toUpperCase() || "USDC";
        const matchingBalance = balances.find(
          (b) =>
            b.chainId === targetChain.id &&
            b.symbol.toUpperCase() === targetToken
        );
        if (matchingBalance) {
          setSelectedBalance(matchingBalance);
        }
      }
    }
  }, [searchParams, balances, selectedBalance]);

  // Fetch balances
  const fetchBalances = useCallback(async () => {
    if (!walletAddress) return;
    setLoadingBalances(true);
    try {
      const chainIds = Object.values(SUPPORTED_CHAINS).map((c) => c.id);
      const result = await getWalletBalances(walletAddress, chainIds);
      setBalances(result);
      // Auto-select first balance if none selected
      if (result.length > 0 && !selectedBalance) {
        setSelectedBalance(result[0]);
      }
    } catch (err) {
      console.error("Failed to fetch balances:", err);
    } finally {
      setLoadingBalances(false);
    }
  }, [walletAddress, selectedBalance]);

  useEffect(() => {
    if (walletAddress) fetchBalances();
  }, [walletAddress, fetchBalances]);

  // Resolve ENS names
  useEffect(() => {
    const resolveAddress = async () => {
      // Check if it's already a valid hex address
      if (/^0x[a-fA-F0-9]{40}$/.test(toAddress)) {
        setResolvedAddress(toAddress);
        return;
      }

      // Check if it looks like an ENS name
      if (toAddress.includes(".")) {
        setResolvingEns(true);
        try {
          const resolved = await ensClient.getEnsAddress({
            name: normalize(toAddress),
          });
          setResolvedAddress(resolved);
        } catch (err) {
          console.error("ENS resolution failed:", err);
          setResolvedAddress(null);
        } finally {
          setResolvingEns(false);
        }
      } else {
        setResolvedAddress(null);
      }
    };

    const timer = setTimeout(resolveAddress, 300);
    return () => clearTimeout(timer);
  }, [toAddress]);

  // Get quote when form changes
  const getQuote = useCallback(async () => {
    if (!selectedBalance || !resolvedAddress || !amount || !walletAddress) {
      setQuote(null);
      return;
    }

    // Validate resolved address
    if (!/^0x[a-fA-F0-9]{40}$/.test(resolvedAddress)) {
      setQuote(null);
      return;
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setQuote(null);
      return;
    }

    // Resolve toToken address and decimals
    const tokenConfig = RECEIVE_TOKENS.find((t) => t.symbol === toTokenSymbol);
    const toTokenDecimals = tokenConfig?.decimals ?? 18;

    let toTokenAddress = "0x0000000000000000000000000000000000000000";
    if (toTokenSymbol !== "ETH") {
      const chainAddresses = TOKEN_BY_CHAIN[toTokenSymbol];
      if (chainAddresses) {
        toTokenAddress = chainAddresses[toChainId] || "0x0000000000000000000000000000000000000000";
      }
      if (toTokenAddress === "0x0000000000000000000000000000000000000000") {
        setQuoteError(`${toTokenSymbol} not available on this chain`);
        return;
      }
    }

    // Convert amount to smallest unit of DESTINATION token (receive exact mode)
    const toAmountWei = BigInt(
      Math.floor(amountNum * 10 ** toTokenDecimals)
    ).toString();

    setLoadingQuote(true);
    setQuoteError(null);

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromChain: selectedBalance.chainId,
          toChain: toChainId,
          fromToken: selectedBalance.address,
          toToken: toTokenAddress,
          toAmount: toAmountWei, // Use toAmount for "receive exact" mode
          fromAddress: walletAddress,
          toAddress: resolvedAddress,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to get quote");
      }

      const data = await res.json();
      setQuote(data);
    } catch (err) {
      console.error("Quote error:", err);
      setQuoteError(err instanceof Error ? err.message : "Failed to get quote");
      setQuote(null);
    } finally {
      setLoadingQuote(false);
    }
  }, [selectedBalance, resolvedAddress, toChainId, toTokenSymbol, amount, walletAddress]);

  // Debounced quote fetching
  useEffect(() => {
    const timer = setTimeout(() => {
      getQuote();
    }, 500);
    return () => clearTimeout(timer);
  }, [getQuote]);

  // Execute transaction
  const executeSend = async () => {
    if (!quote || !activeWallet || !selectedBalance) return;

    setTxStatus("idle");
    setTxError(null);
    setTxHash(null);

    try {
      // Get provider from wallet
      const provider = await activeWallet.getEthereumProvider();

      // Switch to the correct chain first
      const requiredChainId = selectedBalance.chainId;
      const currentChainIdHex = await provider.request({ method: "eth_chainId" });
      const currentChainId = parseInt(currentChainIdHex, 16);

      if (currentChainId !== requiredChainId) {
        setTxStatus("approving"); // Reuse status for "switching chain"
        try {
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${requiredChainId.toString(16)}` }],
          });
        } catch (switchError: any) {
          // Chain not added to wallet, try to add it
          if (switchError.code === 4902) {
            const chainConfig = Object.values(SUPPORTED_CHAINS).find(c => c.id === requiredChainId);
            if (chainConfig) {
              await provider.request({
                method: "wallet_addEthereumChain",
                params: [{
                  chainId: `0x${requiredChainId.toString(16)}`,
                  chainName: chainConfig.displayName,
                  nativeCurrency: {
                    name: chainConfig.nativeCurrency,
                    symbol: chainConfig.nativeCurrency,
                    decimals: 18,
                  },
                  rpcUrls: [chainConfig.rpcUrl],
                  blockExplorerUrls: [chainConfig.explorerUrl],
                }],
              });
            }
          } else {
            throw switchError;
          }
        }
      }

      // Check if we need approval for non-native tokens
      if (needsApproval(selectedBalance.address)) {
        const currentAllowance = await getTokenAllowance(
          selectedBalance.address,
          walletAddress!,
          quote.estimate.approvalAddress,
          selectedBalance.chainId
        );

        const requiredAmount = BigInt(quote.action.fromAmount);

        if (currentAllowance < requiredAmount) {
          setTxStatus("approving");

          // Build and send approval tx
          const approvalTx = buildApprovalTx(
            selectedBalance.address,
            quote.estimate.approvalAddress
          );

          const approveTxHash = await provider.request({
            method: "eth_sendTransaction",
            params: [
              {
                from: walletAddress,
                to: approvalTx.to,
                data: approvalTx.data,
              },
            ],
          });

          // Wait for approval confirmation
          await waitForTx(provider, approveTxHash);
        }
      }

      // Send the main transaction
      setTxStatus("sending");

      const txHashResult = await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: walletAddress,
            to: quote.transactionRequest.to,
            data: quote.transactionRequest.data,
            value: quote.transactionRequest.value,
            gas: quote.transactionRequest.gasLimit,
          },
        ],
      });

      setTxHash(txHashResult);
      setTxStatus("confirming");

      // Wait for confirmation
      await waitForTx(provider, txHashResult);

      setTxStatus("success");

      // Refresh balances
      setTimeout(() => fetchBalances(), 2000);
    } catch (err) {
      console.error("Transaction error:", err);
      setTxError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus("error");
    }
  };

  // Helper to wait for transaction
  async function waitForTx(provider: any, txHash: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkReceipt = async () => {
        try {
          const receipt = await provider.request({
            method: "eth_getTransactionReceipt",
            params: [txHash],
          });
          if (receipt) {
            if (receipt.status === "0x1" || receipt.status === 1) {
              resolve();
            } else {
              reject(new Error("Transaction reverted"));
            }
          } else {
            setTimeout(checkReceipt, 2000);
          }
        } catch {
          setTimeout(checkReceipt, 2000);
        }
      };
      checkReceipt();
    });
  }

  // Get explorer URL for transaction
  const getExplorerTxUrl = (chainId: number, hash: string) => {
    const chain = Object.values(SUPPORTED_CHAINS).find((c) => c.id === chainId);
    if (!chain) return null;
    return `${chain.explorerUrl}/tx/${hash}`;
  };

  if (!ready || !authenticated) return null;

  return (
    <div className="mx-auto max-w-xl px-4 py-6 space-y-4">
      {/* Source Token Selection */}
      <fieldset className="relative rounded-lg border border-border p-4 pt-3">
        <legend className="px-2 text-sm font-medium text-muted-foreground">
          Send from
        </legend>
        <BalanceGrid
          balances={balances}
          loading={loadingBalances}
          selectedBalance={selectedBalance}
          onSelect={setSelectedBalance}
          emptyMessage="No tokens found. Fund your wallet to send."
        />
      </fieldset>

      {/* Recipient */}
      <fieldset className="relative rounded-lg border border-border p-4 pt-3">
        <legend className="px-2 text-sm font-medium text-muted-foreground">
          Send to
        </legend>
        <div className="space-y-3">
          <div>
            <Input
              id="toAddress"
              placeholder="0x... or vitalik.eth"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              className="font-mono"
            />
            {resolvingEns && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span className="h-3 w-3 animate-spin rounded-full border border-muted-foreground border-t-transparent" />
                Resolving ENS name...
              </p>
            )}
            {!resolvingEns && toAddress.includes(".") && resolvedAddress && (
              <p className="text-xs text-green-600 mt-1">
                Resolved: {resolvedAddress.slice(0, 6)}...{resolvedAddress.slice(-4)}
              </p>
            )}
            {!resolvingEns && toAddress.includes(".") && !resolvedAddress && toAddress.length > 3 && (
              <p className="text-xs text-destructive mt-1">
                Could not resolve ENS name
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Chain</Label>
              <div className="mt-1">
                <ChainSelect
                  value={toChainId}
                  onChange={setToChainId}
                  options={Object.values(SUPPORTED_CHAINS).map((chain) => ({
                    value: chain.id,
                    label: chain.displayName,
                    chainId: chain.id,
                  }))}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Token</Label>
              <div className="mt-1">
                <TokenSelect
                  value={toTokenSymbol}
                  onChange={setToTokenSymbol}
                  options={RECEIVE_TOKENS.map((token) => ({
                    value: token.symbol,
                    label: token.symbol,
                    symbol: token.symbol,
                  }))}
                />
              </div>
            </div>
          </div>
        </div>
      </fieldset>

      {/* Amount Input */}
      <fieldset className="relative rounded-lg border border-border p-4 pt-3">
        <legend className="px-2 text-sm font-medium text-muted-foreground">
          Recipient receives ({toTokenSymbol})
        </legend>
        <div className="space-y-2">
          <Input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="font-mono"
          />
          {selectedBalance && (
            <p className="text-xs text-muted-foreground">
              Paying from: {formatTokenAmount(selectedBalance.amount, selectedBalance.decimals)} {selectedBalance.symbol} available
            </p>
          )}
        </div>
      </fieldset>

      {/* Quote Preview */}
      {(loadingQuote || quote || quoteError) && (
        <fieldset className="relative rounded-lg border border-border p-4 pt-3">
          <legend className="px-2 text-sm font-medium text-muted-foreground">
            Quote
          </legend>
          <div>
            {loadingQuote ? (
              <div className="flex items-center gap-2 py-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground">Finding best route...</span>
              </div>
            ) : quoteError ? (
              <div className="py-2 text-center">
                <p className="text-sm text-destructive">{quoteError}</p>
              </div>
            ) : quote ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">You send</span>
                  <span className="font-mono font-medium flex items-center gap-1">
                    <TokenIcon symbol={quote.action.fromToken.symbol} size={14} />
                    {(parseFloat(quote.action.fromAmount) / 10 ** quote.action.fromToken.decimals).toFixed(
                      quote.action.fromToken.decimals > 8 ? 6 : 4
                    )}{" "}
                    {quote.action.fromToken.symbol}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Recipient gets</span>
                  <span className="font-mono font-medium flex items-center gap-1 text-green-600">
                    <TokenIcon symbol={quote.action.toToken.symbol} size={14} />
                    {(parseFloat(quote.estimate.toAmountMin) / 10 ** quote.action.toToken.decimals).toFixed(
                      quote.action.toToken.decimals > 8 ? 6 : 2
                    )}{" "}
                    {quote.action.toToken.symbol}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Route</span>
                  <Badge variant="outline" className="text-xs">{quote.tool}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Fees</span>
                  <span>
                    ${(
                      quote.estimate.feeCosts.reduce((sum, f) => sum + parseFloat(f.amountUSD || "0"), 0) +
                      quote.estimate.gasCosts.reduce((sum, g) => sum + parseFloat(g.amountUSD || "0"), 0)
                    ).toFixed(2)}
                  </span>
                </div>
                {quote.estimate.executionDuration > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Time</span>
                    <span>~{Math.ceil(quote.estimate.executionDuration / 60)} min</span>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </fieldset>
      )}

      {/* Transaction Status */}
      {txStatus !== "idle" && (
        <div className="rounded-lg border border-border p-4">
            {txStatus === "approving" && (
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span>Approving token spend...</span>
              </div>
            )}
            {txStatus === "sending" && (
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span>Sending transaction...</span>
              </div>
            )}
            {txStatus === "confirming" && (
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span>Waiting for confirmation...</span>
              </div>
            )}
            {txStatus === "success" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">Transaction successful!</span>
                </div>
                {txHash && selectedBalance && (
                  <a
                    href={getExplorerTxUrl(selectedBalance.chainId, txHash) || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <span className="font-mono">
                      {txHash.slice(0, 10)}...{txHash.slice(-8)}
                    </span>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            )}
            {txStatus === "error" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-destructive">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="font-medium">Transaction failed</span>
                </div>
                {txError && <p className="text-sm text-muted-foreground">{txError}</p>}
              </div>
            )}
        </div>
      )}

      {/* Send Button */}
      <Button
        size="lg"
        className="w-full"
        disabled={!quote || loadingQuote || txStatus === "approving" || txStatus === "sending" || txStatus === "confirming"}
        onClick={executeSend}
      >
        {txStatus === "approving"
          ? "Approving..."
          : txStatus === "sending"
          ? "Sending..."
          : txStatus === "confirming"
          ? "Confirming..."
          : quote
          ? `Send ${(parseFloat(quote.action.fromAmount) / 10 ** quote.action.fromToken.decimals).toFixed(4)} ${quote.action.fromToken.symbol}`
          : `Send ${amount || "0"} ${toTokenSymbol}`}
      </Button>
    </div>
  );
}

export default function SendPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-xl px-4 py-6"><Skeleton className="h-96" /></div>}>
      <SendPageContent />
    </Suspense>
  );
}
