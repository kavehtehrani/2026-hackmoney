"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PaymentChatBot } from "@/components/PaymentChatBot";

export default function Home() {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();

  return (
    <div className="relative flex flex-col px-4 py-6 overflow-hidden">
      {/* Background gradient blobs */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute top-20 -right-40 h-[300px] w-[400px] rounded-full bg-accent/15 blur-3xl" />

      <div className="relative mx-auto max-w-3xl w-full text-center space-y-5">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.1]">
          Pay anyone{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            across any chain
          </span>
        </h1>

        <p className="text-base text-muted-foreground max-w-md mx-auto">
          Just tell me who to pay and how much. I'll handle the rest.
        </p>

        {/* Feature boxes */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 text-left pt-2">
          <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-2 sm:p-4 sm:space-y-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-md bg-primary/10 text-primary text-[10px] sm:text-xs font-bold shrink-0">
                AI
              </span>
              <h3 className="font-semibold text-xs sm:text-sm truncate">Smart Parsing</h3>
            </div>
            <p className="hidden sm:block text-xs text-muted-foreground leading-relaxed">
              Say "send 10 USDC to vitalik.eth" or upload a PDF/image invoice.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-2 sm:p-4 sm:space-y-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-md bg-primary/10 text-primary text-[10px] sm:text-xs font-bold shrink-0">
                LI
              </span>
              <h3 className="font-semibold text-xs sm:text-sm truncate">Cross-Chain</h3>
            </div>
            <p className="hidden sm:block text-xs text-muted-foreground leading-relaxed">
              LI.FI finds the cheapest route from your funds to the recipient.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-2 sm:p-4 sm:space-y-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-md bg-accent/20 text-accent-foreground text-[10px] sm:text-xs font-bold shrink-0">
                .eth
              </span>
              <h3 className="font-semibold text-xs sm:text-sm truncate">ENS Native</h3>
            </div>
            <p className="hidden sm:block text-xs text-muted-foreground leading-relaxed">
              ENS names are resolved to wallet addresses on the fly.
            </p>
          </div>
        </div>

        {/* Chat Bot - Main Feature */}
        <div className="pt-2 w-full">
          <PaymentChatBot />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {ready && authenticated ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push("/upload")}
              >
                Upload Invoice
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push("/send")}
              >
                Manual Send
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push("/dashboard")}
              >
                Dashboard
              </Button>
            </>
          ) : ready ? (
            <p className="text-sm text-muted-foreground">
              Connect your wallet to send payments
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
