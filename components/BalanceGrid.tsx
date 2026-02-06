"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TokenIcon, ChainIcon } from "@/components/TokenIcon";
import { formatTokenAmount, type WalletTokenBalance } from "@/lib/lifi";
import { SUPPORTED_CHAINS } from "@/lib/chains";

interface BalanceGridProps {
  balances: WalletTokenBalance[];
  loading?: boolean;
  selectedBalance?: WalletTokenBalance | null;
  onSelect?: (balance: WalletTokenBalance) => void;
  emptyMessage?: string;
}

function getChainName(chainId: number) {
  return Object.values(SUPPORTED_CHAINS).find((c) => c.id === chainId)?.displayName || String(chainId);
}

export function BalanceGrid({
  balances,
  loading = false,
  selectedBalance,
  onSelect,
  emptyMessage = "No tokens found.",
}: BalanceGridProps) {
  const isSelectable = !!onSelect;

  if (loading) {
    return (
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-16 hidden sm:block" />
        <Skeleton className="h-16 hidden lg:block" />
      </div>
    );
  }

  if (balances.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        {emptyMessage}
      </p>
    );
  }

  const isSelected = (b: WalletTokenBalance) =>
    selectedBalance?.address === b.address && selectedBalance?.chainId === b.chainId;

  return (
    <>
      {/* Mobile: Dropdown style (only when selectable) */}
      {isSelectable && (
        <MobileBalanceSelect
          balances={balances}
          selectedBalance={selectedBalance}
          onSelect={onSelect}
          getChainName={getChainName}
        />
      )}

      {/* Desktop grid (or mobile grid when not selectable) */}
      <div className={`${isSelectable ? "hidden sm:grid" : "grid"} gap-2 sm:grid-cols-2 lg:grid-cols-3`}>
        {balances.map((b, i) => {
          const Wrapper = isSelectable ? "button" : "div";
          return (
            <Wrapper
              key={i}
              onClick={isSelectable ? () => onSelect(b) : undefined}
              className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors text-left ${
                isSelectable && isSelected(b)
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : isSelectable
                  ? "border-border hover:border-primary/50 hover:bg-muted/50"
                  : "border-border"
              }`}
            >
              <TokenIcon symbol={b.symbol} address={b.address} size={28} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-medium text-sm">{b.symbol}</span>
                  <span className="font-mono text-xs truncate">
                    {formatTokenAmount(b.amount, b.decimals)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <ChainIcon chainId={b.chainId} size={10} />
                  {getChainName(b.chainId)}
                </div>
              </div>
            </Wrapper>
          );
        })}
      </div>
    </>
  );
}

// Mobile dropdown for selectable mode
function MobileBalanceSelect({
  balances,
  selectedBalance,
  onSelect,
  getChainName,
}: {
  balances: WalletTokenBalance[];
  selectedBalance?: WalletTokenBalance | null;
  onSelect: (balance: WalletTokenBalance) => void;
  getChainName: (chainId: number) => string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 rounded-lg border border-border bg-background"
      >
        {selectedBalance ? (
          <div className="flex items-center gap-3">
            <TokenIcon symbol={selectedBalance.symbol} address={selectedBalance.address} size={28} />
            <div className="text-left">
              <div className="font-medium text-sm">{selectedBalance.symbol}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <ChainIcon chainId={selectedBalance.chainId} size={10} />
                {getChainName(selectedBalance.chainId)}
              </div>
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">Select token</span>
        )}
        <div className="flex items-center gap-2">
          {selectedBalance && (
            <span className="font-mono text-sm">
              {formatTokenAmount(selectedBalance.amount, selectedBalance.decimals)}
            </span>
          )}
          <svg
            className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-background p-1">
          {balances.map((b, i) => (
            <button
              key={i}
              onClick={() => {
                onSelect(b);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between p-2 rounded-md text-left transition-colors ${
                selectedBalance?.address === b.address && selectedBalance?.chainId === b.chainId
                  ? "bg-primary/10"
                  : "hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-2">
                <TokenIcon symbol={b.symbol} address={b.address} size={24} />
                <div>
                  <div className="font-medium text-sm">{b.symbol}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <ChainIcon chainId={b.chainId} size={10} />
                    {getChainName(b.chainId)}
                  </div>
                </div>
              </div>
              <span className="font-mono text-xs">
                {formatTokenAmount(b.amount, b.decimals)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
