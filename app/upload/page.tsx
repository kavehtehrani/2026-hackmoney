"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import InvoiceUploader from "@/components/InvoiceUploader";
import InvoicePreview from "@/components/InvoicePreview";
import PaymentConfirmation from "@/components/PaymentConfirmation";
import PaymentStatus from "@/components/PaymentStatus";
import WalletBalance from "@/components/WalletBalance";
import type { ParsedInvoice, PaymentStatus as PaymentStatusType } from "@/lib/types";
import { isEnsName, resolveEnsName } from "@/lib/ens";
import { getPaymentQuote, type PaymentQuoteParams } from "@/lib/lifi";
import { getChainByName, SUPPORTED_CHAINS } from "@/lib/chains";

type Step = "upload" | "preview" | "confirm" | "status";

export default function UploadPage() {
  const { ready, authenticated, user, sendTransaction } = usePrivy();
  const { wallets } = useWallets();
  const router = useRouter();

  const [step, setStep] = useState<Step>("upload");
  const [parsedData, setParsedData] = useState<ParsedInvoice | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [quote, setQuote] = useState<{
    fromChain: string;
    toChain: string;
    fromToken: string;
    toToken: string;
    fromAmount: string;
    toAmount: string;
    estimatedGas: string;
    toolName: string;
    transactionRequest: Record<string, unknown>;
  } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusType>("pending");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

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
      alert("Failed to parse invoice. Please try again or enter details manually.");
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      alert("Failed to parse invoice. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

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

      // Get LI.FI quote
      const toChain = getChainByName(parsedData.chain);
      if (!toChain) {
        alert(`Unsupported chain: ${parsedData.chain}`);
        setIsLoading(false);
        return;
      }

      // Default: try to pay from the same chain with the same token
      // If user has funds elsewhere, LI.FI handles the bridging
      const fromChain = toChain; // Start with same chain
      const decimals = parsedData.token === "ETH" ? 18 : 6;
      const amountInSmallest = BigInt(
        Math.round(parseFloat(parsedData.amount) * 10 ** decimals)
      ).toString();

      const quoteParams: PaymentQuoteParams = {
        fromAddress: user.wallet.address,
        fromChainId: fromChain.id,
        toChainId: toChain.id,
        fromTokenAddress: toChain.usdcAddress,
        toTokenAddress: toChain.usdcAddress,
        toAddress: recipientAddr,
        amount: amountInSmallest,
      };

      const lifiQuote = await getPaymentQuote(quoteParams);

      setQuote({
        fromChain: Object.values(SUPPORTED_CHAINS).find(c => c.id === lifiQuote.action.fromChainId)?.displayName || String(lifiQuote.action.fromChainId),
        toChain: Object.values(SUPPORTED_CHAINS).find(c => c.id === lifiQuote.action.toChainId)?.displayName || String(lifiQuote.action.toChainId),
        fromToken: lifiQuote.action.fromToken.symbol,
        toToken: lifiQuote.action.toToken.symbol,
        fromAmount: (
          parseFloat(lifiQuote.action.fromAmount) /
          10 ** lifiQuote.action.fromToken.decimals
        ).toFixed(4),
        toAmount: (
          parseFloat(lifiQuote.estimate.toAmount) /
          10 ** lifiQuote.action.toToken.decimals
        ).toFixed(4),
        estimatedGas: lifiQuote.estimate.gasCosts
          ? lifiQuote.estimate.gasCosts
              .reduce((acc, g) => acc + parseFloat(g.amountUSD || "0"), 0)
              .toFixed(4) + " USD"
          : "Unknown",
        toolName: lifiQuote.toolDetails?.name || lifiQuote.tool || "Unknown",
        transactionRequest: lifiQuote.transactionRequest as Record<string, unknown>,
      });

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
      alert("Failed to get payment quote. Check that the chain and token are supported.");
    } finally {
      setIsLoading(false);
    }
  }, [parsedData, user?.wallet?.address, invoiceId]);

  const handleExecutePayment = useCallback(async () => {
    if (!quote?.transactionRequest || !parsedData) return;

    setIsExecuting(true);
    setPaymentStatus("executing");
    setStep("status");

    try {
      const wallet = wallets.find(
        (w) => w.walletClientType === "privy" || w.connectorType === "embedded"
      ) || wallets[0];

      if (!wallet) {
        throw new Error("No wallet found");
      }

      // Switch to the right chain
      const toChain = getChainByName(parsedData.chain);
      if (toChain) {
        try {
          await wallet.switchChain(toChain.id);
        } catch {
          // May already be on the right chain
        }
      }

      const provider = await wallet.getEthereumProvider();
      const txReq = quote.transactionRequest;

      const hash = await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: txReq.from,
            to: txReq.to,
            data: txReq.data,
            value: txReq.value ? `0x${BigInt(txReq.value as string).toString(16)}` : "0x0",
            gasLimit: txReq.gasLimit
              ? `0x${BigInt(txReq.gasLimit as string).toString(16)}`
              : undefined,
          },
        ],
      });

      setTxHash(hash as string);
      setPaymentStatus("completed");

      // Save payment record
      await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          txHash: hash,
          fromChain: quote.fromChain,
          toChain: quote.toChain,
          fromToken: quote.fromToken,
          toToken: quote.toToken,
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
    } finally {
      setIsExecuting(false);
    }
  }, [quote, parsedData, wallets, invoiceId]);

  const handleReset = useCallback(() => {
    setStep("upload");
    setParsedData(null);
    setInvoiceId(null);
    setQuote(null);
    setPaymentStatus("pending");
    setTxHash(null);
  }, []);

  if (!ready || !authenticated) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Pay an Invoice</h1>

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

      {step === "confirm" && parsedData && (
        <PaymentConfirmation
          invoice={parsedData}
          quote={quote}
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
          onReset={handleReset}
        />
      )}
    </div>
  );
}
