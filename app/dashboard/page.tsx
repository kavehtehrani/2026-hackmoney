"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WalletBalance from "@/components/WalletBalance";
import type { Invoice, Payment } from "@/lib/types";

export default function DashboardPage() {
  const { ready, authenticated, user } = usePrivy();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [invRes, payRes] = await Promise.all([
        fetch(`/api/invoices?userId=${encodeURIComponent(user.id)}`),
        fetch(`/api/payments?userId=${encodeURIComponent(user.id)}`),
      ]);
      if (invRes.ok) setInvoices(await invRes.json());
      if (payRes.ok) setPayments(await payRes.json());
    } catch {
      // Silently handle fetch errors
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
      return;
    }
    if (user?.id) fetchData();
  }, [ready, authenticated, user?.id, router, fetchData]);

  if (!ready || !authenticated) return null;

  const statusVariant = (s: string) => {
    switch (s) {
      case "paid":
      case "completed":
        return "default" as const;
      case "failed":
        return "destructive" as const;
      case "paying":
      case "executing":
        return "secondary" as const;
      default:
        return "outline" as const;
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your invoices, payments, and wallet overview.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/generate")}>
            Generate Invoice
          </Button>
          <Button onClick={() => router.push("/upload")}>Pay Invoice</Button>
        </div>
      </div>

      <WalletBalance />

      <Tabs defaultValue="invoices">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="invoices">
            Invoices ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="payments">
            Payments ({payments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4 space-y-3">
          {loading ? (
            <div className="flex items-center gap-3 py-12 justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : invoices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <p className="text-muted-foreground">No invoices yet.</p>
              <Button
                variant="link"
                onClick={() => router.push("/upload")}
                className="mt-1"
              >
                Upload your first invoice
              </Button>
            </div>
          ) : (
            invoices.map((inv) => (
              <Card key={inv.id} className="transition-colors hover:bg-muted/30">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {inv.parsedData?.recipientName || "Unnamed Invoice"}
                      </span>
                      <Badge variant={statusVariant(inv.status)}>
                        {inv.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {inv.parsedData
                        ? `${inv.parsedData.amount} ${inv.parsedData.token} on ${inv.parsedData.chain}`
                        : inv.rawFileName || "No data"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </span>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="payments" className="mt-4 space-y-3">
          {loading ? (
            <div className="flex items-center gap-3 py-12 justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : payments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <p className="text-muted-foreground">No payments yet.</p>
            </div>
          ) : (
            payments.map((pay) => (
              <Card key={pay.id} className="transition-colors hover:bg-muted/30">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {pay.amount} {pay.toToken}
                      </span>
                      <Badge variant={statusVariant(pay.status)}>
                        {pay.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {pay.fromChain} → {pay.toChain}
                    </p>
                    {pay.txHash && (
                      <p className="text-xs font-mono text-muted-foreground">
                        tx: {pay.txHash.slice(0, 10)}...{pay.txHash.slice(-8)}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(pay.createdAt).toLocaleDateString()}
                  </span>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
