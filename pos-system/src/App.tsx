
import { useEffect, useState } from "react";
import type { Product } from "./types/product";
import { db } from "./db/database";
import Checkout from "./components/Checkout";
import Reports from "./components/Reports";
import InvoiceHistory from "./components/InvoiceHistory";
import "./App.css";

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [stock, setStock] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState("");
const [refreshKey, setRefreshKey] = useState(0);
const [role, setRole] = useState<"OWNER" | "CASHIER">("OWNER");
  const [adjustProductId, setAdjustProductId] = useState("");
  const [adjustType, setAdjustType] = useState<"IN" | "OUT">("IN");
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [movements, setMovements] = useState<
    (typeof db extends never ? never : import("./db/database").StockMovement)[]
  >([]);
  const [activeSection, setActiveSection] = useState("dashboard");

  function navigateToSection(sectionId: string) {
  setActiveSection(sectionId);

  document.getElementById(sectionId)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

async function loadProducts() {
  setProducts(await db.products.toArray());
  setMovements(
    await db.stockMovements.orderBy("createdAt").reverse().toArray()
  );
  setRefreshKey((previous) => previous + 1);
}

  useEffect(() => {
    loadProducts().catch(() => setError("Could not load database data."));
  }, []);

  function resetForm() {
    setName("");
    setSku("");
    setCategory("");
    setSellingPrice("");
    setCostPrice("");
    setStock("");
    setEditingId(null);
  }

  async function saveProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

   if (role !== "OWNER") {
  setError("Access denied. Owner permission required.");
  return;
}

    try {
      const cleanSku = sku.trim();
      const existingSku = await db.products
        .where("sku")
        .equalsIgnoreCase(cleanSku)
        .first();

      if (existingSku && existingSku.id !== editingId) {
        setError("This SKU already exists.");
        return;
      }

      if (editingId) {
        const existing = await db.products.get(editingId);
        if (!existing) {
          setError("Product not found.");
          return;
        }

        // Stock changes must be made through Stock Adjustment.
        await db.products.update(editingId, {
          name: name.trim(),
          sku: cleanSku,
          category: category.trim(),
          sellingPrice: Math.round(Number(sellingPrice) * 100),
          costPrice: Math.round(Number(costPrice) * 100),
        });
      } else {
        const newProduct: Product = {
          id: crypto.randomUUID(),
          name: name.trim(),
          sku: cleanSku,
          category: category.trim(),
          sellingPrice: Math.round(Number(sellingPrice) * 100),
          costPrice: Math.round(Number(costPrice) * 100),
          stock: Number(stock),
          lowStockThreshold: 5,
          unit: "pcs",
          taxRate: 0,
          isArchived: false,
        };

        await db.products.add(newProduct);
      }

      await loadProducts();
      resetForm();
    } catch {
      setError("Could not save product.");
    }
  }

  function editProduct(product: Product) {
    if (role !== "OWNER") {
  setError("Access denied. Owner permission required.");
  return;
}
    setEditingId(product.id);
    setName(product.name);
    setSku(product.sku);
    setCategory(product.category);
    setSellingPrice((product.sellingPrice / 100).toString());
    setCostPrice((product.costPrice / 100).toString());
    // Stock is intentionally not edited here.
    setStock(product.stock.toString());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleArchive(product: Product) {
      if (role !== "OWNER") {
    setError("Access denied. Owner permission required.");
    return;
  }
    setError("");
    try {
      await db.products.update(product.id, {
        isArchived: !product.isArchived,
      });
      await loadProducts();
    } catch {
      setError("Could not update product status.");
    }
  }

  async function adjustStock(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

  if (role !== "OWNER") {
  setError("Access denied. Owner permission required.");
  return;
}

    const quantity = Number(adjustQuantity);
    const reason = adjustReason.trim();

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError("Quantity must be a positive whole number.");
      return;
    }

    if (!reason) {
      setError("Please enter a reason for the adjustment.");
      return;
    }

    try {
      await db.transaction("rw", db.products, db.stockMovements, async () => {
        const product = await db.products.get(adjustProductId);

        if (!product || product.isArchived) {
          throw new Error("Select an active product.");
        }

        const newStock =
          adjustType === "IN"
            ? product.stock + quantity
            : product.stock - quantity;

        if (newStock < 0) {
          throw new Error("Stock cannot be less than zero.");
        }

        await db.products.update(product.id, { stock: newStock });

        await db.stockMovements.add({
          id: crypto.randomUUID(),
          productId: product.id,
          productName: product.name,
          type: adjustType,
          quantity,
          previousStock: product.stock,
          newStock,
          reason,
          createdAt: new Date().toISOString(),
        });
      });

      setAdjustQuantity("");
      setAdjustReason("");
      await loadProducts();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Stock adjustment failed."
      );
    }
  }

  const categories = [
    ...new Set(
      products
        .filter((p) => !p.isArchived)
        .map((p) => p.category)
    ),
  ];

  const filteredProducts = products.filter((product) => {
    const matchesStatus = showArchived
      ? product.isArchived
      : !product.isArchived;

    const query = searchTerm.toLowerCase();
    const matchesSearch =
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query);

    const matchesCategory =
      selectedCategory === "All" ||
      product.category === selectedCategory;

    return matchesStatus && matchesSearch && matchesCategory;
  });

  const lowStockProducts = products.filter(
    (p) => !p.isArchived && p.stock <= p.lowStockThreshold
  );
const activeProducts = products.filter(
  (p) => !p.isArchived
).length;

const totalStockUnits = products
  .filter((p) => !p.isArchived)
  .reduce((total, p) => total + p.stock, 0);

return (

<div className="app-shell">
 <aside className="app-sidebar">
      <h2 className="sidebar-brand">Pointly POS</h2>

 <nav className="sidebar-nav" aria-label="Main navigation">
         <button
  type="button"
  className={activeSection === "dashboard" ? "active" : ""}
  onClick={() => navigateToSection("dashboard")}
>
  Dashboard
</button>

       <button
  type="button"
  className={activeSection === "checkout" ? "active" : ""}
  onClick={() => navigateToSection("checkout")}
>
 Checkout
</button>

        {role === "OWNER" && (
          <>
          <button
  type="button"
  className={activeSection === "products" ? "active" : ""}
  onClick={() => navigateToSection("products")}
>
  Products
</button>

           <button
  type="button"
  className={activeSection === "inventory" ? "active" : ""}
  onClick={() => navigateToSection("inventory")}
>
  Inventory
</button>

       <button
  type="button"
  className={activeSection === "reports" ? "active" : ""}
  onClick={() => navigateToSection("reports")}
>
  Reports
</button>
</>
 )}

       <button
  type="button"
  className={activeSection === "invoices" ? "active" : ""}
  onClick={() => navigateToSection("invoices")}
>
  Invoices
</button>

  </nav>


    </aside>

    <div className="app-content">
      <header className="topbar">
        <div>
          <h2>POS Dashboard</h2>
          <p>Manage your store efficiently</p>
        </div>

        <div className="role-control">
          <label htmlFor="role-select">Role: </label>
          <select
            id="role-select"
            value={role}
            onChange={(e) =>
              setRole(e.target.value as "OWNER" | "CASHIER")
            }
          >
            <option value="OWNER">Owner</option>
            <option value="CASHIER">Cashier</option>
          </select>
        </div>
      </header>

      <main className="dashboard-content">
        <h1>POS System</h1>

<div id="dashboard" className="dashboard-header">
  <div>
    <h2>Dashboard Overview</h2>
    <p>Monitor your store's inventory and operations.</p>
  </div>
</div>

{role === "OWNER" && (
  <div className="dashboard-cards">
    <div className="dashboard-card">
      <p>Active Products</p>
      <h2>{activeProducts}</h2>
    </div>

    <div className="dashboard-card">
      <p>Total Stock Units</p>
      <h2>{totalStockUnits}</h2>
    </div>

    <div className="dashboard-card">
      <p>Low Stock Items</p>
      <h2>{lowStockProducts.length}</h2>
    </div>

    <div className="dashboard-card">
      <p>Current Role</p>
      <h2>{role === "OWNER" ? "Owner" : "Cashier"}</h2>
    </div>
  </div>
)}

      {error && (
        <p role="alert" style={{ color: "crimson" }}>{error}</p>
      )}
{role === "OWNER" && (
  <>
      <h2>{editingId ? "Edit Product" : "Add Product"}</h2>

      <form
        onSubmit={saveProduct}
        style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}
      >
        <input placeholder="Product Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} required />
        <input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} required />
        <input type="number" placeholder="Selling Price (Rs.)" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} min="0" step="0.01" required />
        <input type="number" placeholder="Cost Price (Rs.)" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} min="0" step="0.01" required />
        {!editingId && (
          <input type="number" placeholder="Opening Stock" value={stock} onChange={(e) => setStock(e.target.value)} min="0" step="1" required />
        )}
        <button type="submit">{editingId ? "Save Changes" : "Add Product"}</button>
        {editingId && <button type="button" onClick={resetForm}>Cancel Edit</button>}
      </form>



      <h2 id="inventory">Inventory Management</h2>

      <form
        onSubmit={adjustStock}
        style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}
      >
        <select value={adjustProductId} onChange={(e) => setAdjustProductId(e.target.value)} required>
          <option value="">Select product</option>
          {products.filter((p) => !p.isArchived).map((p) => (
            <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
          ))}
        </select>

        <select value={adjustType} onChange={(e) => setAdjustType(e.target.value as "IN" | "OUT")}>
          <option value="IN">Stock In (+)</option>
          <option value="OUT">Stock Out (-)</option>
        </select>

        <input type="number" placeholder="Quantity" value={adjustQuantity} onChange={(e) => setAdjustQuantity(e.target.value)} min="1" step="1" required />
        <input placeholder="Reason (e.g. New delivery)" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} required />
        <button type="submit">Adjust Stock</button>
      </form>

 
      <h3>Low Stock Alerts ({lowStockProducts.length})</h3>
      {lowStockProducts.length === 0 ? (
        <p>No low-stock products.</p>
      ) : (
        <ul>
          {lowStockProducts.map((p) => (
            <li key={p.id}>{p.name}: {p.stock} remaining (threshold: {p.lowStockThreshold})</li>
          ))}
        </ul>
      )}
  </>
)}


<section id="checkout" className="page-section">
  <Checkout
    products={products}
    onSaleComplete={loadProducts}
  />
</section>

{role === "OWNER" && (
  <>

      <h2 id="products">Product List</h2>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <input placeholder="Search name, SKU or category..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
          <option value="All">All Categories</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button type="button" onClick={() => {
          setShowArchived((previous) => !previous);
          setSelectedCategory("All");
          setSearchTerm("");
        }}>
          {showArchived ? "View Active Products" : "View Archived Products"}
        </button>
      </div>

      <p>{showArchived ? "Archived" : "Active"} products: {filteredProducts.length}</p>

      <div style={{ overflowX: "auto" }}>
        <table cellPadding={10} style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#e5e7eb", textAlign: "left" }}>
              <th>Name</th><th>SKU</th><th>Category</th><th>Selling Price</th><th>Cost Price</th><th>Stock</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.sku}</td>
                <td>{product.category}</td>
                <td>Rs. {(product.sellingPrice / 100).toFixed(2)}</td>
                <td>Rs. {(product.costPrice / 100).toFixed(2)}</td>
                <td>{product.stock}</td>
                <td>
                  {!showArchived && <button type="button" onClick={() => editProduct(product)}>Edit</button>}{" "}
                  <button type="button" onClick={() => toggleArchive(product)}>
                    {showArchived ? "Restore" : "Archive"}
                  </button>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr><td colSpan={7}>No products found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <h2>Stock Movement History</h2>
      <div style={{ overflowX: "auto" }}>
        <table cellPadding={8} style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#e5e7eb", textAlign: "left" }}>
              <th>Date</th><th>Product</th><th>Type</th><th>Quantity</th><th>Previous</th><th>New</th><th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((movement) => (
              <tr key={movement.id}>
                <td>{new Date(movement.createdAt).toLocaleString()}</td>
                <td>{movement.productName}</td>
                <td>{movement.type}</td>
                <td>{movement.quantity}</td>
                <td>{movement.previousStock}</td>
                <td>{movement.newStock}</td>
                <td>{movement.reason}</td>
              </tr>
            ))}
            {movements.length === 0 && (
              <tr><td colSpan={7}>No stock movements recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <hr style={{ margin: "32px 0" }} />
</>
)}

<section id="invoices" className="page-section">
  <InvoiceHistory key={`invoices-${refreshKey}`} />
</section>

<hr style={{ margin: "32px 0" }} />

{role === "OWNER" && (
  <section id="reports" className="page-section">
    <Reports key={`reports-${refreshKey}`} />
  </section>
)}

    </main>
    </div>
  </div>
  );
}
export default App;
