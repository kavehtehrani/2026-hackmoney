import { NextRequest, NextResponse } from "next/server";
import { getInvoicesByUser, updateInvoice, createInvoice, deleteInvoice } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const invoices = getInvoicesByUser(userId);
  return NextResponse.json(invoices);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = body.id || uuid();

    createInvoice({
      id,
      userId: body.userId,
      rawFileName: body.rawFileName,
      rawFileType: body.rawFileType,
      parsedData: body.parsedData,
      status: body.status || "draft",
    });

    return NextResponse.json({ id });
  } catch (error) {
    console.error("Create invoice error:", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    updateInvoice(body.id, {
      parsedData: body.parsedData,
      status: body.status,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update invoice error:", error);
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    deleteInvoice(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete invoice error:", error);
    return NextResponse.json({ error: "Failed to delete invoice" }, { status: 500 });
  }
}
