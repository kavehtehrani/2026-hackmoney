import { NextRequest, NextResponse } from "next/server";
import { createPayment, getPaymentsByUser, updatePayment, deletePayment } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const payments = await getPaymentsByUser(userId);
  return NextResponse.json(payments);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = uuid();

    await createPayment({
      id,
      invoiceId: body.invoiceId,
      fromChain: body.fromChain,
      toChain: body.toChain,
      fromToken: body.fromToken,
      toToken: body.toToken,
      amount: body.amount,
      status: body.status || "pending",
    });

    // If txHash is provided, update it
    if (body.txHash) {
      await updatePayment(id, { txHash: body.txHash });
    }

    return NextResponse.json({ id });
  } catch (error) {
    console.error("Create payment error:", error);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    await updatePayment(body.id, {
      txHash: body.txHash,
      status: body.status,
      routeData: body.routeData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update payment error:", error);
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    await deletePayment(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete payment error:", error);
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
  }
}
