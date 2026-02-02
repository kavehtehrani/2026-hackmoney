"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { ready, authenticated, login } = usePrivy();
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center px-4 py-24">
      <div className="mx-auto max-w-2xl text-center space-y-8">
        <h1 className="text-5xl font-bold tracking-tight">
          Pay invoices
          <br />
          <span className="text-primary">across any chain</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-lg mx-auto">
          Upload an invoice. AI extracts the payment details. Pay cross-chain
          from wherever your funds are to wherever the recipient wants to be
          paid. ENS names supported.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {ready && authenticated ? (
            <>
              <Button size="lg" onClick={() => router.push("/upload")}>
                Pay an Invoice
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push("/dashboard")}
              >
                View Dashboard
              </Button>
            </>
          ) : ready ? (
            <Button size="lg" onClick={login}>
              Get Started
            </Button>
          ) : null}
        </div>

        <div className="grid gap-6 sm:grid-cols-3 pt-12">
          <div className="space-y-2">
            <h3 className="font-semibold">AI-Powered Parsing</h3>
            <p className="text-sm text-muted-foreground">
              Upload a PDF, image, or paste text. Gemini AI extracts recipient,
              amount, token, and chain automatically.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Cross-Chain Payments</h3>
            <p className="text-sm text-muted-foreground">
              LI.FI finds the best route from your funds on any chain to the
              recipient on their preferred chain.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">ENS Resolution</h3>
            <p className="text-sm text-muted-foreground">
              Invoices with ENS names like vitalik.eth are automatically
              resolved to wallet addresses.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
