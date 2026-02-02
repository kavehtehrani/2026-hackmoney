import { NextRequest, NextResponse } from "next/server";
import { parseInvoiceFromImage, parseInvoiceFromText } from "@/lib/invoice-parser";
import { createInvoice } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let parsedData;
    let rawFileName: string | undefined;
    let rawFileType: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      // File upload
      const formData = await request.formData();
      const file = formData.get("file") as File;
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      rawFileName = file.name;
      rawFileType = file.type;

      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString("base64");

      // For PDFs, we still send as-is to Gemini (it handles PDFs)
      const mimeType = file.type || "image/png";
      parsedData = await parseInvoiceFromImage(base64, mimeType);
    } else {
      // Text/JSON input
      const body = await request.json();
      if (!body.text) {
        return NextResponse.json({ error: "No text provided" }, { status: 400 });
      }
      parsedData = await parseInvoiceFromText(body.text);
    }

    // Get userId from headers or body (in production, from auth token)
    const userId = request.headers.get("x-user-id") || "anonymous";

    // Save to database
    const invoiceId = uuid();
    createInvoice({
      id: invoiceId,
      userId,
      rawFileName,
      rawFileType,
      parsedData,
      status: "parsed",
    });

    return NextResponse.json({ invoiceId, parsedData });
  } catch (error) {
    console.error("Invoice parse error:", error);
    return NextResponse.json(
      { error: "Failed to parse invoice" },
      { status: 500 }
    );
  }
}
