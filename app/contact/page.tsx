"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ENSAvatar } from "@/components/ENSProfileCard";
import type { Contact } from "@/lib/types";
import type { ENSProfile } from "@/lib/ens";

export default function ContactPage() {
  const { ready, authenticated, user } = usePrivy();
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const fetchContacts = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts?userId=${encodeURIComponent(user.id)}`);
      if (res.ok) {
        setContacts(await res.json());
      }
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
      return;
    }
    if (user?.id) fetchContacts();
  }, [ready, authenticated, user?.id, router, fetchContacts]);

  const handleAddContact = async () => {
    if (!newAddress.trim() || !user?.id) return;
    setAdding(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          address: newAddress.trim(),
          name: newName.trim() || null,
        }),
      });
      if (res.ok) {
        setNewAddress("");
        setNewName("");
        setShowAddForm(false);
        fetchContacts();
      }
    } catch {
      // Handle error
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/contacts?id=${id}`, { method: "DELETE" });
      fetchContacts();
    } catch {
      // Handle error
    }
  };

  const handleUpdateName = async (id: string) => {
    try {
      await fetch(`/api/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() || null }),
      });
      setEditingId(null);
      fetchContacts();
    } catch {
      // Handle error
    }
  };

  const startEditing = (contact: Contact) => {
    setEditingId(contact.id);
    setEditName(contact.name || "");
  };

  if (!ready || !authenticated) return null;

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toISOString().split("T")[0];
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your address book for quick payments.
          </p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? "Cancel" : "Add Contact"}
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardContent className="py-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Wallet address or ENS name"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
              />
              <Input
                placeholder="Name (optional)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <Button onClick={handleAddContact} disabled={adding || !newAddress.trim()}>
              {adding ? "Adding..." : "Add Contact"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center gap-3 py-8 justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : contacts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p className="text-muted-foreground">No contacts yet.</p>
            <Button variant="link" onClick={() => setShowAddForm(true)} className="mt-1">
              Add your first contact
            </Button>
          </div>
        ) : (
          contacts.map((contact) => {
            const ensProfile = contact.ensProfile as ENSProfile | null;
            const hasProfile = ensProfile && (ensProfile.description || ensProfile.twitter || ensProfile.github || ensProfile.website);
            const isExpanded = !collapsedIds.has(contact.id);

            const toggleExpanded = () => {
              setCollapsedIds((prev) => {
                const next = new Set(prev);
                if (next.has(contact.id)) {
                  next.delete(contact.id);
                } else {
                  next.add(contact.id);
                }
                return next;
              });
            };

            return (
              <Card key={contact.id} className="transition-colors hover:bg-muted/30">
                <CardContent className="py-3">
                  <div className="flex items-center gap-3">
                    {/* Avatar - clickable to toggle if has profile */}
                    <button
                      onClick={() => hasProfile && toggleExpanded()}
                      className={`shrink-0 ${hasProfile ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                      disabled={!hasProfile}
                    >
                      <ENSAvatar
                        avatar={contact.ensAvatar}
                        name={contact.name || contact.ensName || contact.address}
                        size={80}
                      />
                    </button>

                    <div className="flex-1 min-w-0">
                      {editingId === contact.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-7 w-40"
                            placeholder="Name"
                            onKeyDown={(e) => e.key === "Enter" && handleUpdateName(contact.id)}
                          />
                          <Button size="sm" variant="ghost" onClick={() => handleUpdateName(contact.id)}>
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 flex-wrap">
                            {contact.name && (
                              <span
                                className="font-medium cursor-pointer hover:underline"
                                onClick={() => startEditing(contact)}
                                title="Click to edit name"
                              >
                                {contact.name}
                              </span>
                            )}
                            {contact.ensName && (
                              <span
                                className={`font-mono text-blue-500 ${!contact.name ? 'font-medium cursor-pointer hover:underline' : 'text-sm'}`}
                                onClick={!contact.name ? () => startEditing(contact) : undefined}
                                title={!contact.name ? "Click to edit name" : undefined}
                              >
                                {contact.ensName}
                              </span>
                            )}
                            {!contact.name && !contact.ensName && (
                              <span
                                className="font-mono font-medium cursor-pointer hover:underline sm:hidden"
                                onClick={() => startEditing(contact)}
                                title="Click to edit name"
                              >
                                {truncateAddress(contact.address)}
                              </span>
                            )}
                            {!contact.name && !contact.ensName && (
                              <span
                                className="font-mono font-medium cursor-pointer hover:underline hidden sm:inline"
                                onClick={() => startEditing(contact)}
                                title="Click to edit name"
                              >
                                {contact.address}
                              </span>
                            )}
                            {contact.paymentCount > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {contact.paymentCount} payment{contact.paymentCount > 1 ? "s" : ""}
                              </Badge>
                            )}
                            {hasProfile && (
                              <button
                                onClick={toggleExpanded}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <svg
                                  className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            {(contact.name || contact.ensName) && (
                              <>
                                <span className="font-mono text-xs italic sm:hidden">
                                  {truncateAddress(contact.address)}
                                </span>
                                <span className="font-mono text-xs italic hidden sm:inline">
                                  {contact.address}
                                </span>
                              </>
                            )}
                            {contact.lastPaidAt && (
                              <span className="text-xs">
                                {(contact.name || contact.ensName) && "·"} Last paid {formatDate(contact.lastPaidAt)}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const recipient = contact.ensName || contact.address;
                          router.push(`/send?to=${encodeURIComponent(recipient)}`);
                        }}
                      >
                        Pay
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(contact.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                      </Button>
                    </div>
                  </div>

                  {/* Expanded ENS Profile */}
                  {isExpanded && ensProfile && (
                    <div className="mt-3 pt-3 border-t border-border">
                      {/* Description */}
                      {ensProfile.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {ensProfile.description}
                        </p>
                      )}

                      {/* Social Links */}
                      <div className="flex items-center gap-3">
                        {ensProfile.twitter && (
                          <a
                            href={`https://twitter.com/${(ensProfile.twitter as string).replace("@", "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                            <span>@{(ensProfile.twitter as string).replace("@", "")}</span>
                          </a>
                        )}
                        {ensProfile.github && (
                          <a
                            href={`https://github.com/${ensProfile.github}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            <span>{ensProfile.github}</span>
                          </a>
                        )}
                        {ensProfile.website && (
                          <a
                            href={(ensProfile.website as string).startsWith("http") ? ensProfile.website as string : `https://${ensProfile.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                            </svg>
                            <span>{(ensProfile.website as string).replace(/^https?:\/\//, "")}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
