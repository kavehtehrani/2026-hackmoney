"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Helvetica",
    fontSize: 12,
    color: "#111",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#6366f1",
  },
  invoiceNumber: {
    fontSize: 11,
    color: "#666",
    marginTop: 4,
  },
  senderName: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "right",
  },
  dueDate: {
    fontSize: 11,
    color: "#666",
    marginTop: 4,
    textAlign: "right",
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  billTo: {
    marginBottom: 32,
  },
  recipientName: {
    fontSize: 14,
    fontWeight: "bold",
  },
  recipientAddress: {
    fontSize: 11,
    fontFamily: "Courier",
    color: "#444",
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 8,
    marginBottom: 0,
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingVertical: 12,
  },
  descCol: {
    flex: 1,
  },
  amountCol: {
    width: 150,
    textAlign: "right",
  },
  totalSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
    marginBottom: 40,
  },
  totalBox: {
    width: 200,
    borderTopWidth: 2,
    borderTopColor: "#111",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "bold",
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  paymentDetails: {
    backgroundColor: "#f9fafb",
    borderRadius: 6,
    padding: 16,
  },
  paymentRow: {
    flexDirection: "row",
    marginBottom: 4,
    fontSize: 11,
  },
  paymentLabel: {
    color: "#666",
  },
  paymentValue: {
    fontWeight: "bold",
  },
  payToRow: {
    marginTop: 4,
    fontSize: 11,
  },
  payToAddress: {
    fontFamily: "Courier",
    fontWeight: "bold",
  },
  footer: {
    marginTop: 32,
    fontSize: 9,
    color: "#aaa",
    textAlign: "center",
  },
});

export interface InvoicePDFData {
  invoiceNumber: string;
  senderName: string;
  recipientName: string;
  recipientAddress: string;
  amount: string;
  token: string;
  chain: string;
  chainDisplay: string;
  memo: string;
  dueDate: string;
}

export default function InvoicePDF({ data }: { data: InvoicePDFData }) {
  const formattedDueDate = data.dueDate
    ? new Date(data.dueDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{data.invoiceNumber}</Text>
          </View>
          <View>
            {data.senderName ? (
              <Text style={styles.senderName}>{data.senderName}</Text>
            ) : null}
            {formattedDueDate ? (
              <Text style={styles.dueDate}>Due: {formattedDueDate}</Text>
            ) : null}
          </View>
        </View>

        {/* Bill To */}
        <View style={styles.billTo}>
          <Text style={styles.sectionLabel}>Bill To</Text>
          <Text style={styles.recipientName}>
            {data.recipientName || "Recipient"}
          </Text>
          <Text style={styles.recipientAddress}>
            {data.recipientAddress || "0x..."}
          </Text>
        </View>

        {/* Table Header */}
        <View style={styles.tableHeader}>
          <View style={styles.descCol}>
            <Text style={styles.tableHeaderText}>Description</Text>
          </View>
          <View style={styles.amountCol}>
            <Text style={styles.tableHeaderText}>Amount</Text>
          </View>
        </View>

        {/* Table Row */}
        <View style={styles.tableRow}>
          <View style={styles.descCol}>
            <Text>{data.memo || "Services rendered"}</Text>
          </View>
          <View style={styles.amountCol}>
            <Text style={{ fontWeight: "bold" }}>
              {data.amount || "0"} {data.token}
            </Text>
          </View>
        </View>

        {/* Total */}
        <View style={styles.totalSection}>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {data.amount || "0"} {data.token}
            </Text>
          </View>
        </View>

        {/* Payment Details */}
        <View style={styles.paymentDetails}>
          <Text style={styles.sectionLabel}>Payment Details</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Chain: </Text>
            <Text style={styles.paymentValue}>{data.chainDisplay}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Token: </Text>
            <Text style={styles.paymentValue}>{data.token}</Text>
          </View>
          <View style={styles.payToRow}>
            <Text style={styles.paymentLabel}>Pay to: </Text>
            <Text style={styles.payToAddress}>
              {data.recipientAddress || "0x..."}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Generated by PayFlow</Text>
      </Page>
    </Document>
  );
}
