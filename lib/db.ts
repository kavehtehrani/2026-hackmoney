import { createClient, Client } from "@libsql/client";

let db: Client | null = null;
let schemaInitialized = false;

export function getDb(): Client {
  if (!db) {
    db = createClient({
      url: process.env.TURSO_DATABASE_URL || "file:./payflow.db",
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return db;
}

async function initSchema(): Promise<void> {
  if (schemaInitialized) return;

  const db = getDb();
  await db.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        raw_file_name TEXT,
        raw_file_type TEXT,
        parsed_data TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        tx_hash TEXT,
        from_chain TEXT,
        to_chain TEXT,
        from_token TEXT,
        to_token TEXT,
        amount TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        route_data TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (invoice_id) REFERENCES invoices(id)
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        address TEXT NOT NULL,
        ens_name TEXT,
        name TEXT,
        notes TEXT,
        ens_avatar TEXT,
        ens_profile TEXT,
        last_paid_at TEXT,
        payment_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(user_id, address)
      )`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id)`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id)`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id)`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_contacts_address ON contacts(address)`,
      args: [],
    },
  ]);
  schemaInitialized = true;
}

// Ensure schema is initialized before any DB operation
async function ensureDb(): Promise<Client> {
  await initSchema();
  return getDb();
}

// Invoice CRUD
export async function createInvoice(invoice: {
  id: string;
  userId: string;
  rawFileName?: string;
  rawFileType?: string;
  parsedData?: object | null;
  status?: string;
}) {
  const db = await ensureDb();
  await db.execute({
    sql: `INSERT INTO invoices (id, user_id, raw_file_name, raw_file_type, parsed_data, status)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      invoice.id,
      invoice.userId,
      invoice.rawFileName || null,
      invoice.rawFileType || null,
      invoice.parsedData ? JSON.stringify(invoice.parsedData) : null,
      invoice.status || "draft",
    ],
  });
}

export async function updateInvoice(id: string, data: { parsedData?: object; status?: string }) {
  const db = await ensureDb();
  const sets: string[] = [];
  const values: (string | null)[] = [];

  if (data.parsedData !== undefined) {
    sets.push("parsed_data = ?");
    values.push(JSON.stringify(data.parsedData));
  }
  if (data.status !== undefined) {
    sets.push("status = ?");
    values.push(data.status);
  }

  if (sets.length === 0) return;

  values.push(id);
  await db.execute({
    sql: `UPDATE invoices SET ${sets.join(", ")} WHERE id = ?`,
    args: values,
  });
}

export async function getInvoicesByUser(userId: string) {
  const db = await ensureDb();
  const result = await db.execute({
    sql: "SELECT * FROM invoices WHERE user_id = ? ORDER BY created_at DESC",
    args: [userId],
  });

  return result.rows.map((row) => ({
    id: row.id as string,
    userId: row.user_id as string,
    rawFileName: row.raw_file_name as string | null,
    rawFileType: row.raw_file_type as string | null,
    parsedData: row.parsed_data ? JSON.parse(row.parsed_data as string) : null,
    status: row.status as string,
    createdAt: row.created_at as string,
  }));
}

export async function deleteInvoice(id: string) {
  const db = await ensureDb();
  // Delete associated payments first (due to foreign key constraint)
  await db.execute({
    sql: "DELETE FROM payments WHERE invoice_id = ?",
    args: [id],
  });
  await db.execute({
    sql: "DELETE FROM invoices WHERE id = ?",
    args: [id],
  });
}

export async function getInvoiceById(id: string) {
  const db = await ensureDb();
  const result = await db.execute({
    sql: "SELECT * FROM invoices WHERE id = ?",
    args: [id],
  });

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id as string,
    userId: row.user_id as string,
    rawFileName: row.raw_file_name as string | null,
    rawFileType: row.raw_file_type as string | null,
    parsedData: row.parsed_data ? JSON.parse(row.parsed_data as string) : null,
    status: row.status as string,
    createdAt: row.created_at as string,
  };
}

// Payment CRUD
export async function createPayment(payment: {
  id: string;
  invoiceId: string;
  fromChain?: string;
  toChain?: string;
  fromToken?: string;
  toToken?: string;
  amount?: string;
  status?: string;
}) {
  const db = await ensureDb();
  await db.execute({
    sql: `INSERT INTO payments (id, invoice_id, from_chain, to_chain, from_token, to_token, amount, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      payment.id,
      payment.invoiceId,
      payment.fromChain || null,
      payment.toChain || null,
      payment.fromToken || null,
      payment.toToken || null,
      payment.amount || null,
      payment.status || "pending",
    ],
  });
}

export async function updatePayment(id: string, data: { txHash?: string; status?: string; routeData?: object }) {
  const db = await ensureDb();
  const sets: string[] = [];
  const values: (string | null)[] = [];

  if (data.txHash !== undefined) {
    sets.push("tx_hash = ?");
    values.push(data.txHash);
  }
  if (data.status !== undefined) {
    sets.push("status = ?");
    values.push(data.status);
  }
  if (data.routeData !== undefined) {
    sets.push("route_data = ?");
    values.push(JSON.stringify(data.routeData));
  }

  if (sets.length === 0) return;

  values.push(id);
  await db.execute({
    sql: `UPDATE payments SET ${sets.join(", ")} WHERE id = ?`,
    args: values,
  });
}

export async function deletePayment(id: string) {
  const db = await ensureDb();
  await db.execute({
    sql: "DELETE FROM payments WHERE id = ?",
    args: [id],
  });
}

export async function getPaymentsByInvoice(invoiceId: string) {
  const db = await ensureDb();
  const result = await db.execute({
    sql: "SELECT * FROM payments WHERE invoice_id = ? ORDER BY created_at DESC",
    args: [invoiceId],
  });

  return result.rows.map((row) => ({
    id: row.id as string,
    invoiceId: row.invoice_id as string,
    txHash: row.tx_hash as string | null,
    fromChain: row.from_chain as string | null,
    toChain: row.to_chain as string | null,
    fromToken: row.from_token as string | null,
    toToken: row.to_token as string | null,
    amount: row.amount as string | null,
    status: row.status as string,
    routeData: row.route_data ? JSON.parse(row.route_data as string) : null,
    createdAt: row.created_at as string,
  }));
}

export async function getPaymentsByUser(userId: string) {
  const db = await ensureDb();
  const result = await db.execute({
    sql: `SELECT p.* FROM payments p
          JOIN invoices i ON p.invoice_id = i.id
          WHERE i.user_id = ?
          ORDER BY p.created_at DESC`,
    args: [userId],
  });

  return result.rows.map((row) => ({
    id: row.id as string,
    invoiceId: row.invoice_id as string,
    txHash: row.tx_hash as string | null,
    fromChain: row.from_chain as string | null,
    toChain: row.to_chain as string | null,
    fromToken: row.from_token as string | null,
    toToken: row.to_token as string | null,
    amount: row.amount as string | null,
    status: row.status as string,
    routeData: row.route_data ? JSON.parse(row.route_data as string) : null,
    createdAt: row.created_at as string,
  }));
}

// Contact CRUD
export async function createContact(contact: {
  id: string;
  userId: string;
  address: string;
  ensName?: string;
  name?: string;
  notes?: string;
}) {
  const db = await ensureDb();
  await db.execute({
    sql: `INSERT INTO contacts (id, user_id, address, ens_name, name, notes)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      contact.id,
      contact.userId,
      contact.address.toLowerCase(),
      contact.ensName || null,
      contact.name || null,
      contact.notes || null,
    ],
  });
}

export async function upsertContact(contact: {
  userId: string;
  address: string;
  ensName?: string;
  name?: string;
  notes?: string;
  lastPaidAt?: string;
  incrementPayment?: boolean;
}): Promise<string> {
  const db = await ensureDb();
  const existingResult = await db.execute({
    sql: "SELECT id, payment_count FROM contacts WHERE user_id = ? AND address = ?",
    args: [contact.userId, contact.address.toLowerCase()],
  });

  const existing = existingResult.rows[0];

  if (existing) {
    const sets: string[] = ["updated_at = datetime('now')"];
    const values: (string | number | null)[] = [];

    if (contact.ensName !== undefined) {
      sets.push("ens_name = ?");
      values.push(contact.ensName);
    }
    if (contact.name !== undefined) {
      sets.push("name = ?");
      values.push(contact.name);
    }
    if (contact.notes !== undefined) {
      sets.push("notes = ?");
      values.push(contact.notes);
    }
    if (contact.lastPaidAt) {
      sets.push("last_paid_at = ?");
      values.push(contact.lastPaidAt);
    }
    if (contact.incrementPayment) {
      sets.push("payment_count = payment_count + 1");
    }

    values.push(existing.id as string);
    await db.execute({
      sql: `UPDATE contacts SET ${sets.join(", ")} WHERE id = ?`,
      args: values,
    });
    return existing.id as string;
  } else {
    const id = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO contacts (id, user_id, address, ens_name, name, notes, last_paid_at, payment_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        contact.userId,
        contact.address.toLowerCase(),
        contact.ensName || null,
        contact.name || null,
        contact.notes || null,
        contact.lastPaidAt || null,
        contact.incrementPayment ? 1 : 0,
      ],
    });
    return id;
  }
}

export async function updateContact(id: string, data: {
  name?: string;
  notes?: string;
  ensName?: string;
  ensAvatar?: string;
  ensProfile?: string;
}) {
  const db = await ensureDb();
  const sets: string[] = ["updated_at = datetime('now')"];
  const values: (string | null)[] = [];

  if (data.name !== undefined) {
    sets.push("name = ?");
    values.push(data.name);
  }
  if (data.notes !== undefined) {
    sets.push("notes = ?");
    values.push(data.notes);
  }
  if (data.ensName !== undefined) {
    sets.push("ens_name = ?");
    values.push(data.ensName);
  }
  if (data.ensAvatar !== undefined) {
    sets.push("ens_avatar = ?");
    values.push(data.ensAvatar);
  }
  if (data.ensProfile !== undefined) {
    sets.push("ens_profile = ?");
    values.push(data.ensProfile);
  }

  if (sets.length === 1) return; // Only updated_at

  values.push(id);
  await db.execute({
    sql: `UPDATE contacts SET ${sets.join(", ")} WHERE id = ?`,
    args: values,
  });
}

export async function deleteContact(id: string) {
  const db = await ensureDb();
  await db.execute({
    sql: "DELETE FROM contacts WHERE id = ?",
    args: [id],
  });
}

export async function getContactsByUser(userId: string) {
  const db = await ensureDb();
  const result = await db.execute({
    sql: `SELECT * FROM contacts WHERE user_id = ? ORDER BY payment_count DESC, updated_at DESC`,
    args: [userId],
  });

  return result.rows.map((row) => ({
    id: row.id as string,
    userId: row.user_id as string,
    address: row.address as string,
    ensName: row.ens_name as string | null,
    name: row.name as string | null,
    notes: row.notes as string | null,
    ensAvatar: row.ens_avatar as string | null,
    ensProfile: row.ens_profile ? JSON.parse(row.ens_profile as string) : null,
    lastPaidAt: row.last_paid_at as string | null,
    paymentCount: row.payment_count as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function getContactByAddress(userId: string, address: string) {
  const db = await ensureDb();
  const result = await db.execute({
    sql: "SELECT * FROM contacts WHERE user_id = ? AND address = ?",
    args: [userId, address.toLowerCase()],
  });

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id as string,
    userId: row.user_id as string,
    address: row.address as string,
    ensName: row.ens_name as string | null,
    name: row.name as string | null,
    notes: row.notes as string | null,
    ensAvatar: row.ens_avatar as string | null,
    ensProfile: row.ens_profile ? JSON.parse(row.ens_profile as string) : null,
    lastPaidAt: row.last_paid_at as string | null,
    paymentCount: row.payment_count as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
