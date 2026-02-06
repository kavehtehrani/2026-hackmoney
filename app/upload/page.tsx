"use client";

import { Suspense } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import InvoiceUploader from "@/components/InvoiceUploader";
import InvoicePreview from "@/components/InvoicePreview";
import { EmbeddedSendForm, type PaymentResult } from "@/components/EmbeddedSendForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ParsedInvoice } from "@/lib/types";
import type { ParsedPaymentIntent } from "@/lib/types";

type Step = "upload" | "preview" | "pay";

function UploadPageContent() {
  const { ready, authenticated, user } = usePrivy();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>("upload");
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedInvoice | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  // Load existing invoice if invoiceId is provided - go directly to pay step
  useEffect(() => {
    const invoiceIdParam = searchParams.get("invoiceId");
    if (invoiceIdParam && ready && authenticated) {
      setLoadingInvoice(true);
      fetch(`/api/invoices/${invoiceIdParam}`)
        .then((res) => {
          if (!res.ok) throw new Error("Invoice not found");
          return res.json();
        })
        .then((invoice) => {
          if (invoice.parsedData) {
            setParsedData(invoice.parsedData);
            setInvoiceId(invoice.id);
            // Go directly to pay step - user already reviewed the invoice
            setStep("pay");
          }
        })
        .catch((err) => {
          console.error("Failed to load invoice:", err);
        })
        .finally(() => {
          setLoadingInvoice(false);
        });
    }
  }, [searchParams, ready, authenticated]);

  // File upload handler
  const handleFileUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse-invoice", {
        method: "POST",
        headers: user?.id ? { "x-user-id": user.id } : {},
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
  }, [user?.id]);

  // Text submit handler
  const handleTextSubmit = useCallback(async (text: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/parse-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user?.id && { "x-user-id": user.id }),
        },
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
  }, [user?.id]);

  // After preview confirmation, move to pay step
  const handleConfirmPreview = useCallback(async () => {
    if (!parsedData) return;

    // Update invoice status to confirmed
    if (invoiceId) {
      try {
        await fetch("/api/invoices", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: invoiceId,
            status: "confirmed",
          }),
        });
      } catch (err) {
        console.error("Failed to update invoice:", err);
      }
    }

    setStep("pay");
  }, [parsedData, invoiceId]);

  // Convert ParsedInvoice to ParsedPaymentIntent for EmbeddedSendForm
  const getPaymentIntent = (): ParsedPaymentIntent | null => {
    if (!parsedData) return null;
    return {
      recipient: parsedData.recipientAddress,
      amount: parsedData.amount,
      token: parsedData.token,
      fromChain: null,
      destinationChain: parsedData.chain,
      confidence: "high",
      missingFields: [],
      originalInput: "",
    };
  };

  // Handle successful payment
  const handlePaymentSuccess = useCallback(async (result: PaymentResult) => {
    // Update invoice status to paid
    if (invoiceId) {
      try {
        await fetch("/api/invoices", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: invoiceId, status: "paid" }),
        });
      } catch (err) {
        console.error("Failed to update invoice:", err);
      }
    }

    // Create payment record
    if (user?.id) {
      try {
        await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            invoiceId,
            txHash: result.txHash,
            fromChain: result.fromChain,
            toChain: result.toChain,
            fromToken: result.fromToken,
            toToken: result.toToken,
            amount: parsedData?.amount || "0",
            status: "completed",
          }),
        });
      } catch (err) {
        console.error("Failed to create payment:", err);
      }
    }

    // Add contact from payment
    if (user?.id && parsedData?.recipientAddress) {
      try {
        await fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            address: parsedData.recipientAddress,
            name: parsedData.recipientName || null,
            lastPaidAt: new Date().toISOString(),
            incrementPayment: true,
          }),
        });
      } catch (err) {
        console.error("Failed to add contact:", err);
      }
    }
  }, [invoiceId, user?.id, parsedData]);

  const handleReset = useCallback(() => {
    setStep("upload");
    setParsedData(null);
    setInvoiceId(null);
  }, []);

  if (!ready || !authenticated) return null;

  const paymentIntent = getPaymentIntent();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pay an Invoice</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a file or paste text. AI will extract the payment details.
        </p>
      </div>

      {loadingInvoice ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="ml-3 text-muted-foreground">Loading invoice...</span>
        </div>
      ) : step === "upload" && (
        <InvoiceUploader
          onFileUpload={handleFileUpload}
          onTextSubmit={handleTextSubmit}
          isLoading={isLoading}
        />
      )}

      {step === "preview" && parsedData && (
        <InvoicePreview
          data={parsedData}
          onChange={setParsedData}
          onConfirm={handleConfirmPreview}
          isResolving={false}
          isConfirming={isLoading}
        />
      )}

      {step === "pay" && paymentIntent && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Complete Payment</span>
              <Button variant="ghost" size="sm" onClick={() => setStep("preview")}>
                Edit
              </Button>
            </CardTitle>
            {parsedData && (
              <p className="text-sm text-muted-foreground">
                Paying {parsedData.amount} {parsedData.token} to {parsedData.recipientName || parsedData.recipientAddress}
              </p>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <EmbeddedSendForm
              intent={paymentIntent}
              onSuccess={handlePaymentSuccess}
              onCancel={handleReset}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl px-4 py-8 flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="ml-3 text-muted-foreground">Loading...</span>
        </div>
      }
    >
      <UploadPageContent />
    </Suspense>
  );
}
