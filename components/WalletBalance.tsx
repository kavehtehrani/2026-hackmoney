"use client";

import { useEffect, useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BalanceGrid } from "@/components/BalanceGrid";
import { SUPPORTED_CHAINS } from "@/lib/chains";
import { getWalletBalances, type WalletTokenBalance } from "@/lib/lifi";

export default function WalletBalance() {
  const { wallets, ready } = useWallets();
  const [balances, setBalances] = useState<WalletTokenBalance[]>([]);
  const [loading, setLoading] = useState(false);

  // Use the first connected wallet's address (external wallets like MetaMask take priority)
  const activeWallet = wallets.find(
    (w) => w.walletClientType !== "privy"
  ) || wallets[0];
  const walletAddress = activeWallet?.address;

  useEffect(() => {
    if (!ready || !walletAddress) return;

    let cancelled = false;

    async function fetchBalances() {
      setLoading(true);
      try {
        const chainIds = Object.values(SUPPORTED_CHAINS).map((c) => c.id);
        const result = await getWalletBalances(walletAddress!, chainIds);
        if (!cancelled) setBalances(result);
      } catch (err) {
        console.error("[WalletBalance] Error fetching balances:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBalances();
    return () => {
      cancelled = true;
    };
  }, [ready, walletAddress]);

  if (!ready || !walletAddress) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Your Balances</span>
          <span className="text-xs font-mono text-muted-foreground font-normal">
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            {activeWallet?.walletClientType && activeWallet.walletClientType !== "privy" && (
              <span className="ml-2 text-muted-foreground/70">
                ({activeWallet.walletClientType})
              </span>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <BalanceGrid
          balances={balances.slice(0, 9)}
          loading={loading}
          emptyMessage="No token balances found. Fund your wallet to make payments."
        />
      </CardContent>
    </Card>
  );
}
