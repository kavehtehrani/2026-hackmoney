"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button onClick={() => router.push("/upload")}>Pay Invoice</Button>
      </div>

      <WalletBalance walletAddress={user?.wallet?.address} />

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : invoices.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No invoices yet.</p>
                <Button
                  variant="link"
                  onClick={() => router.push("/upload")}
                  className="mt-2"
                >
                  Upload your first invoice
                </Button>
              </CardContent>
            </Card>
          ) : (
            invoices.map((inv) => (
              <Card key={inv.id}>
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
                    <p className="text-xs text-muted-foreground">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : payments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No payments yet.</p>
              </CardContent>
            </Card>
          ) : (
            payments.map((pay) => (
              <Card key={pay.id}>
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
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
