
import { useEffect, useState } from "react";
import { db } from "../db/database";
import type { Invoice } from "../types/invoice";
import type { Product } from "../types/product";

export default function Reports() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        const [invoiceData, productData] = await Promise.all([
          db.invoices.toArray(),
          db.products.toArray(),
        ]);

        setInvoices(invoiceData);
        setProducts(productData);
      } catch (error) {
        console.error("Failed to load reports:", error);
      } finally {
        setLoading(false);
      }
    }

    void loadReports();
  }, []);

  if (loading) return <p>Loading reports...</p>;

  const completedInvoices = invoices.filter(
    (invoice) => invoice.status === "COMPLETED"
  );

  const today = new Date().toDateString();

  const todayInvoices = completedInvoices.filter(
    (invoice) => new Date(invoice.createdAt).toDateString() === today
  );

  const todaySales = todayInvoices.reduce(
    (sum, invoice) => sum + invoice.total,
    0
  );

  const totalRevenue = completedInvoices.reduce(
    (sum, invoice) => sum + invoice.total,
    0
  );

  const lowStockProducts = products.filter(
    (product) =>
      !product.isArchived &&
      product.stock <= product.lowStockThreshold
  );

  const cardStyle: React.CSSProperties = {
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "16px",
    minWidth: "160px",
    flex: "1",
  };

  return (
    <section>
      <h2>Sales Reports</h2>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div style={cardStyle}>
          <h3>Today's Sales</h3>
          <p>Rs. {(todaySales / 100).toFixed(2)}</p>
        </div>

        <div style={cardStyle}>
          <h3>Total Invoices</h3>
          <p>{completedInvoices.length}</p>
        </div>

        <div style={cardStyle}>
          <h3>Total Revenue</h3>
          <p>Rs. {(totalRevenue / 100).toFixed(2)}</p>
        </div>

        <div style={cardStyle}>
          <h3>Low Stock Products</h3>
          <p>{lowStockProducts.length}</p>
        </div>
      </div>

      <h3>Low Stock Items</h3>

      {lowStockProducts.length === 0 ? (
        <p>No low-stock products.</p>
      ) : (
        <ul>
          {lowStockProducts.map((product) => (
            <li key={product.id}>
              {product.name} — Stock: {product.stock} {product.unit}
              {" (Threshold: "}
              {product.lowStockThreshold}
              {")"}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
