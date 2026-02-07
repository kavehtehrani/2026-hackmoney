import { NextRequest, NextResponse } from "next/server";
import { getContactsByUser, upsertContact, updateContact, deleteContact } from "@/lib/db";
import { isEnsName, resolveEnsName, getEnsProfile, lookupEnsName } from "@/lib/ens";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const contacts = await getContactsByUser(userId);
  return NextResponse.json(contacts);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.userId || !body.address) {
      return NextResponse.json(
        { error: "userId and address required" },
        { status: 400 }
      );
    }

    let address = body.address;
    let ensName = body.ensName || null;
    let ensAvatar: string | null = null;
    let ensProfile: object | null = null;

    // Check if input is an ENS name and resolve it
    if (isEnsName(body.address)) {
      ensName = body.address;
      const resolved = await resolveEnsName(body.address);
      if (!resolved) {
        return NextResponse.json(
          { error: "Could not resolve ENS name" },
          { status: 400 }
        );
      }
      address = resolved;

      // Fetch full ENS profile
      const profile = await getEnsProfile(body.address);
      ensAvatar = profile.avatar;
      ensProfile = profile;
    } else if (/^0x[a-fA-F0-9]{40}$/.test(body.address)) {
      // It's a valid address, try reverse lookup for ENS
      const name = await lookupEnsName(body.address as `0x${string}`);
      if (name) {
        ensName = name;
        const profile = await getEnsProfile(name);
        ensAvatar = profile.avatar;
        ensProfile = profile;
      }
    }

    // Create/update the contact
    const id = await upsertContact({
      userId: body.userId,
      address: address,
      ensName: ensName,
      name: body.name,
      notes: body.notes,
      lastPaidAt: body.lastPaidAt,
      incrementPayment: body.incrementPayment,
    });

    // Update ENS profile data separately if we have it
    if (ensAvatar || ensProfile) {
      await updateContact(id, {
        ensAvatar: ensAvatar || undefined,
        ensProfile: ensProfile ? JSON.stringify(ensProfile) : undefined,
      });
    }

    return NextResponse.json({ id });
  } catch (error) {
    console.error("Create contact error:", error);
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    await deleteContact(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete contact error:", error);
    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 }
    );
  }
}
