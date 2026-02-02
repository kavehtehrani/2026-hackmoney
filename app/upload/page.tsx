"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import InvoiceUploader from "@/components/InvoiceUploader";
import InvoicePreview from "@/components/InvoicePreview";
import PaymentConfirmation from "@/components/PaymentConfirmation";
import PaymentStatus from "@/components/PaymentStatus";
import WalletBalance from "@/components/WalletBalance";
import type { ParsedInvoice, PaymentStatus as PaymentStatusType } from "@/lib/types";
import { isEnsName, resolveEnsName } from "@/lib/ens";
import {
  fetchQuote,
  executePayment,
  buildExecutionOptions,
  createViemWalletClient,
  formatTokenAmount,
  type QuoteParams,
} from "@/lib/lifi";
import { getChainByName, SUPPORTED_CHAINS } from "@/lib/chains";
import type { LiFiStep } from "@lifi/types";
import type { RouteExtended } from "@lifi/sdk";

type Step = "upload" | "preview" | "confirm" | "status";

export interface QuoteDisplay {
  fromChain: string;
  fromChainId: number;
  toChain: string;
  toChainId: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  toAmountMin: string;
  gasCostUSD: string;
  bridgeName: string;
  estimatedTime: string;
}

function extractQuoteDisplay(quote: LiFiStep): QuoteDisplay {
  const fromChainName =
    Object.values(SUPPORTED_CHAINS).find((c) => c.id === quote.action.fromChainId)?.displayName ||
    String(quote.action.fromChainId);
  const toChainName =
    Object.values(SUPPORTED_CHAINS).find((c) => c.id === quote.action.toChainId)?.displayName ||
    String(quote.action.toChainId);

  const gasCostUSD = quote.estimate?.gasCosts
    ?.reduce((sum, g) => sum + parseFloat(g.amountUSD || "0"), 0)
    .toFixed(2) || "0.00";

  const estimatedSeconds = quote.estimate?.executionDuration || 0;
  const estimatedTime =
    estimatedSeconds < 60
      ? `${estimatedSeconds}s`
      : `${Math.ceil(estimatedSeconds / 60)} min`;

  return {
    fromChain: fromChainName,
    fromChainId: quote.action.fromChainId,
    toChain: toChainName,
    toChainId: quote.action.toChainId,
    fromToken: quote.action.fromToken.symbol,
    toToken: quote.action.toToken.symbol,
    fromAmount: formatTokenAmount(quote.action.fromAmount, quote.action.fromToken.decimals),
    toAmount: formatTokenAmount(quote.estimate?.toAmount || "0", quote.action.toToken.decimals),
    toAmountMin: formatTokenAmount(quote.estimate?.toAmountMin || "0", quote.action.toToken.decimals),
    gasCostUSD: `$${gasCostUSD}`,
    bridgeName: quote.toolDetails?.name || quote.tool || "Unknown",
    estimatedTime,
  };
}

export default function UploadPage() {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const router = useRouter();

  const [step, setStep] = useState<Step>("upload");
  const [parsedData, setParsedData] = useState<ParsedInvoice | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [lifiQuote, setLifiQuote] = useState<LiFiStep | null>(null);
  const [quoteDisplay, setQuoteDisplay] = useState<QuoteDisplay | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusType>("pending");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const executionLogRef = useRef(executionLog);
  executionLogRef.current = executionLog;

  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  // File upload handler (calls parse-invoice API)
  const handleFileUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse-invoice", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to parse invoice");

      const result = await res.json();
      setParsedData(result.parsedData);
      setInvoiceId(result.invoiceId);
      setStep("preview");
    } catch (err) {
      console.error("Parse error:", err);
      alert("Failed to parse invoice. Try again or enter details manually.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Text submit handler
  const handleTextSubmit = useCallback(async (text: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/parse-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error("Failed to parse invoice");

      const result = await res.json();
      setParsedData(result.parsedData);
      setInvoiceId(result.invoiceId);
      setStep("preview");
    } catch (err) {
      console.error("Parse error:", err);
      alert("Failed to parse invoice.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // After user reviews parsed data, fetch a LI.FI quote
  const handleConfirmPreview = useCallback(async () => {
    if (!parsedData || !user?.wallet?.address) return;
    setIsLoading(true);

    try {
      let recipientAddr = parsedData.recipientAddress;

      // Resolve ENS if needed
      if (isEnsName(recipientAddr)) {
        setIsResolving(true);
        const resolved = await resolveEnsName(recipientAddr);
        setIsResolving(false);

        if (!resolved) {
          alert(`Could not resolve ENS name: ${recipientAddr}`);
          setIsLoading(false);
          return;
        }

        recipientAddr = resolved;
        setParsedData((prev) =>
          prev ? { ...prev, resolvedAddress: resolved } : prev
        );
      }

      // Determine destination chain
      const toChain = getChainByName(parsedData.chain);
      if (!toChain) {
        alert(`Unsupported chain: ${parsedData.chain}`);
        setIsLoading(false);
        return;
      }

      // Calculate amount in smallest unit
      const decimals = parsedData.token === "ETH" ? 18 : 6;
      const fromAmount = BigInt(
        Math.round(parseFloat(parsedData.amount) * 10 ** decimals)
      ).toString();

      // For now: same chain + same token (USDC on destination chain)
      // LI.FI will handle bridging if needed
      const quoteParams: QuoteParams = {
        fromAddress: user.wallet.address,
        fromChainId: toChain.id,
        toChainId: toChain.id,
        fromTokenAddress: toChain.usdcAddress,
        toTokenAddress: toChain.usdcAddress,
        toAddress: recipientAddr,
        fromAmount,
      };

      const quote = await fetchQuote(quoteParams);
      setLifiQuote(quote);
      setQuoteDisplay(extractQuoteDisplay(quote));

      // Save invoice with confirmed data
      if (invoiceId) {
        await fetch("/api/invoices", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: invoiceId,
            parsedData: { ...parsedData, resolvedAddress: recipientAddr },
            status: "confirmed",
          }),
        });
      }

      setStep("confirm");
    } catch (err) {
      console.error("Quote error:", err);
      alert("Failed to get payment quote. Check that the chain and token are supported and you have sufficient balance.");
    } finally {
      setIsLoading(false);
    }
  }, [parsedData, user?.wallet?.address, invoiceId]);

  // Execute payment via LI.FI SDK
  const handleExecutePayment = useCallback(async () => {
    if (!lifiQuote || !parsedData) return;

    const wallet = wallets.find(
      (w) => w.walletClientType === "privy" || w.connectorType === "embedded"
    ) || wallets[0];

    if (!wallet) {
      alert("No wallet connected. Please connect your wallet first.");
      return;
    }

    setIsExecuting(true);
    setPaymentStatus("executing");
    setStep("status");
    setExecutionLog(["Starting payment..."]);

    try {
      // Build a function that returns a viem WalletClient for any chain
      const getWalletClientForChain = async (chainId: number) => {
        // Switch the Privy wallet to the requested chain
        try {
          await wallet.switchChain(chainId);
        } catch {
          // May already be on the right chain
        }
        const provider = await wallet.getEthereumProvider();
        return createViemWalletClient(
          provider,
          chainId,
          wallet.address as `0x${string}`
        );
      };

      // Build execution options with status tracking
      const executionOptions = buildExecutionOptions(
        getWalletClientForChain,
        (updatedRoute: RouteExtended) => {
          // Track execution progress
          const lastStep = updatedRoute.steps[updatedRoute.steps.length - 1];
          if (lastStep?.execution) {
            const processes = lastStep.execution.process;
            const latest = processes[processes.length - 1];

            if (latest) {
              const msg = `${latest.type}: ${latest.status}${latest.txHash ? ` (tx: ${latest.txHash.slice(0, 10)}...)` : ""}`;
              setExecutionLog((prev) => [...prev, msg]);

              // Capture tx hash
              if (latest.txHash && !txHash) {
                setTxHash(latest.txHash);
              }
            }
          }
        }
      );

      // Execute the payment through LI.FI
      const result = await executePayment(lifiQuote, executionOptions);

      // Extract final tx hash from the result
      const finalStep = result.steps[result.steps.length - 1];
      const finalProcess = finalStep?.execution?.process;
      const finalTxHash = finalProcess?.[0]?.txHash || txHash;

      if (finalTxHash) setTxHash(finalTxHash);
      setPaymentStatus("completed");
      setExecutionLog((prev) => [...prev, "Payment completed successfully."]);

      // Save payment record
      await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          txHash: finalTxHash,
          fromChain: quoteDisplay?.fromChain,
          toChain: quoteDisplay?.toChain,
          fromToken: quoteDisplay?.fromToken,
          toToken: quoteDisplay?.toToken,
          amount: parsedData.amount,
          status: "completed",
        }),
      });

      // Update invoice status
      if (invoiceId) {
        await fetch("/api/invoices", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: invoiceId, status: "paid" }),
        });
      }
    } catch (err) {
      console.error("Payment error:", err);
      setPaymentStatus("failed");
      setExecutionLog((prev) => [
        ...prev,
        `Error: ${err instanceof Error ? err.message : "Payment failed"}`,
      ]);
    } finally {
      setIsExecuting(false);
    }
  }, [lifiQuote, parsedData, wallets, invoiceId, quoteDisplay, txHash]);

  const handleReset = useCallback(() => {
    setStep("upload");
    setParsedData(null);
    setInvoiceId(null);
    setLifiQuote(null);
    setQuoteDisplay(null);
    setPaymentStatus("pending");
    setTxHash(null);
    setExecutionLog([]);
  }, []);

  if (!ready || !authenticated) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pay an Invoice</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a file or paste text. AI will extract the payment details.
        </p>
      </div>

      {step === "upload" && (
        <>
          <InvoiceUploader
            onFileUpload={handleFileUpload}
            onTextSubmit={handleTextSubmit}
            isLoading={isLoading}
          />
          <WalletBalance walletAddress={user?.wallet?.address} />
        </>
      )}

      {step === "preview" && parsedData && (
        <InvoicePreview
          data={parsedData}
          onChange={setParsedData}
          onConfirm={handleConfirmPreview}
          isResolving={isResolving}
          isConfirming={isLoading}
        />
      )}

      {step === "confirm" && parsedData && quoteDisplay && (
        <PaymentConfirmation
          invoice={parsedData}
          quote={quoteDisplay}
          onConfirm={handleExecutePayment}
          onCancel={() => setStep("preview")}
          isExecuting={isExecuting}
        />
      )}

      {step === "status" && (
        <PaymentStatus
          status={paymentStatus}
          txHash={txHash}
          chainName={parsedData?.chain || ""}
          executionLog={executionLog}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
