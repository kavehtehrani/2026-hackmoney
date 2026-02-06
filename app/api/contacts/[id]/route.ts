import { NextRequest, NextResponse } from "next/server";
import { updateContact } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    updateContact(id, {
      name: body.name,
      notes: body.notes,
      ensName: body.ensName,
      ensAvatar: body.ensAvatar,
      ensProfile: body.ensProfile,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update contact error:", error);
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    );
  }
}
