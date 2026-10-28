
import { useEffect, useState } from "react";
import { db } from "../db/database";
import type { Invoice } from "../types/invoice";
import "./InvoiceHistory.css";

export default function InvoiceHistory() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] =
    useState<Invoice | null>(null);

  useEffect(() => {
    async function loadInvoices() {
      try {
        const data = await db.invoices
          .orderBy("createdAt")
          .reverse()
          .toArray();

        setInvoices(data);
      } catch (error) {
        console.error("Failed to load invoices:", error);
      } finally {
        setLoading(false);
      }
    }

    void loadInvoices();
  }, []);

  if (loading) return <p>Loading invoices...</p>;

  return (
    <section>
      <h2>Invoice History</h2>

      {invoices.length === 0 ? (
        <p>No invoices found. Complete a sale first.</p>
      ) : (
        <div className="invoice-history">
          <table>
            <thead>
              <tr>
                <th>Invoice No.</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.invoiceNumber}</td>
                  <td>
                    {new Date(invoice.createdAt).toLocaleString()}
                  </td>
                  <td>{invoice.items.length}</td>
                  <td>Rs. {(invoice.total / 100).toFixed(2)}</td>
                  <td>{invoice.paymentMethod}</td>
                  <td>{invoice.status}</td>
                  <td>
                    <button
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      View / Print
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedInvoice && (
        <div className="receipt-container">
          <div className="receipt" id="print-receipt">
            <h2>POS Store</h2>
            <p>Invoice: {selectedInvoice.invoiceNumber}</p>
            <p>
              Date:{" "}
              {new Date(selectedInvoice.createdAt).toLocaleString()}
            </p>
            <hr />

            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.items.map((item, index) => (
                  <tr key={`${item.productId}-${index}`}>
                    <td>{item.productName}</td>
                    <td>{item.quantity}</td>
                    <td>
                      Rs. {(item.unitPrice / 100).toFixed(2)}
                    </td>
                    <td>
                      Rs. {(item.lineTotal / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <hr />
            <p>
              Subtotal: Rs.{" "}
              {(selectedInvoice.subtotal / 100).toFixed(2)}
            </p>
            <p>
              Discount: Rs.{" "}
              {(selectedInvoice.discount / 100).toFixed(2)}
            </p>
            <p>
              Tax: Rs. {(selectedInvoice.tax / 100).toFixed(2)}
            </p>
            <h3>
              Total: Rs. {(selectedInvoice.total / 100).toFixed(2)}
            </h3>
            <p>Payment: {selectedInvoice.paymentMethod}</p>
            <p>Status: {selectedInvoice.status}</p>
            <p>Thank you!</p>
          </div>

          <div className="receipt-actions">
            <button onClick={() => window.print()}>
              Print Receipt
            </button>
            <button onClick={() => setSelectedInvoice(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
