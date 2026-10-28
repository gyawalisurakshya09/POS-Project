
import { useMemo, useState } from "react";
import type { Product } from "../types/product";
import type { InvoiceItem } from "../types/invoice";
import "./Checkout.css";
import { completeSale } from "../services/checkout";

interface CheckoutProps {
  products: Product[];
  onSaleComplete: () => Promise<void>;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function Checkout({
  products,
  onSaleComplete,
}: CheckoutProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [discount, setDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] =
    useState<"CASH" | "CARD" | "WALLET">("CASH");
  const [amountPaid, setAmountPaid] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const availableProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          !p.isArchived &&
          p.stock > 0 &&
          `${p.name} ${p.sku}`
            .toLowerCase()
            .includes(search.toLowerCase())
      ),
    [products, search]
  );

  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.quantity,
    0
  );

  const discountAmount = Math.min(
    subtotal,
    Math.max(0, Math.round(Number(discount || 0) * 100))
  );

  const taxableAmount = subtotal - discountAmount;

  const tax = cart.reduce((sum, item) => {
    const lineGross = item.product.sellingPrice * item.quantity;
    const lineDiscount =
      subtotal > 0
        ? Math.round((discountAmount * lineGross) / subtotal)
        : 0;

    return sum + Math.round(
      Math.max(0, lineGross - lineDiscount) *
        item.product.taxRate /
        100
    );
  }, 0);

  const total = taxableAmount + tax;
  const paid = Math.round(Number(amountPaid || 0) * 100);
  const change = Math.max(0, paid - total);

  function addProduct(product: Product) {
    setMessage("");

    setCart((current) => {
      const existing = current.find(
        (item) => item.product.id === product.id
      );

      if (existing) {
        if (existing.quantity >= product.stock) {
          setMessage(`Only ${product.stock} units are available.`);
          return current;
        }

        return current.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...current, { product, quantity: 1 }];
    });
  }

  function changeQuantity(productId: string, quantity: number) {
    const product = products.find((p) => p.id === productId);

    if (!product) return;

    if (quantity <= 0) {
      setCart((current) =>
        current.filter((item) => item.product.id !== productId)
      );
      return;
    }

    if (quantity > product.stock) {
      setMessage(`Only ${product.stock} units are available.`);
      return;
    }

    setCart((current) =>
      current.map((item) =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  }

  async function handleCheckout() {
    if (cart.length === 0) {
      setMessage("Add at least one product.");
      return;
    }

    if (!Number.isFinite(Number(discount)) || Number(discount) < 0) {
      setMessage("Enter a valid discount.");
      return;
    }

    if (
      !Number.isFinite(Number(amountPaid)) ||
      Number(amountPaid) < 0 ||
      (paymentMethod === "CASH" && paid < total)
    ) {
      setMessage("Enter a valid payment amount.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const invoiceItems: InvoiceItem[] = cart.map(({ product, quantity }) => {
        const lineTotal = product.sellingPrice * quantity;

        return {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity,
          unitPrice: product.sellingPrice,
          taxRate: product.taxRate,
          discount: subtotal > 0
            ? Math.round((discountAmount * lineTotal) / subtotal)
            : 0,
          lineTotal,
        };
      });

      const invoice = await completeSale({
        items: invoiceItems,
        subtotal,
        discount: discountAmount,
        tax,
        total,
        paymentMethod,
        amountPaid: paymentMethod === "CASH" ? paid : total,
        change: paymentMethod === "CASH" ? change : 0,
      });

      await onSaleComplete();
      setCart([]);
      setDiscount("0");
      setAmountPaid("");
      setMessage(`Sale completed. Invoice: ${invoice.invoiceNumber}`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Checkout failed."
      );
    } finally {
      setBusy(false);
    }
  }


  return (
    <section className="checkout-section">
      <div className="section-heading">
        <div>
          <h2>Checkout</h2>
          <p>Select products, manage your cart, and complete the sale.</p>
        </div>
        <span className="checkout-count">
          {cart.reduce((sum, item) => sum + item.quantity, 0)} items
        </span>
      </div>

      <div className="checkout-layout">
        <div className="checkout-main">
          <div className="checkout-panel">
            <h3>Select Products</h3>

            <input
              className="product-search"
              aria-label="Search products"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name or SKU..."
            />

            <div className="checkout-products">
              {availableProducts.map((product) => (
                <button
                  className="product-option"
                  key={product.id}
                  type="button"
                  onClick={() => addProduct(product)}
                >
                  <span className="product-option-name">
                    {product.name}
                  </span>
                  <strong>
                    Rs. {(product.sellingPrice / 100).toFixed(2)}
                  </strong>
                  <span className="product-stock">
                    {product.stock} in stock · {product.sku}
                  </span>
                </button>
              ))}

              {availableProducts.length === 0 && (
                <p className="empty-state">
                  No available products found.
                </p>
              )}
            </div>
          </div>

          <div className="checkout-panel">
            <div className="cart-heading">
              <h3>Shopping Cart</h3>
              <span>{cart.length} products</span>
            </div>

            {cart.length === 0 ? (
              <p className="empty-state">
                Your cart is empty. Select a product to get started.
              </p>
            ) : (
              <div className="cart-list">
                {cart.map(({ product, quantity }) => (
                  <div className="cart-item" key={product.id}>
                    <div className="cart-item-info">
                      <strong>{product.name}</strong>
                      <span>
                        Rs. {(product.sellingPrice / 100).toFixed(2)} each
                      </span>
                    </div>

                    <div className="quantity-controls">
                      <button
                        type="button"
                        aria-label={`Decrease ${product.name} quantity`}
                        onClick={() =>
                          changeQuantity(product.id, quantity - 1)
                        }
                      >
                        −
                      </button>
                      <span>{quantity}</span>
                      <button
                        type="button"
                        aria-label={`Increase ${product.name} quantity`}
                        onClick={() =>
                          changeQuantity(product.id, quantity + 1)
                        }
                      >
                        +
                      </button>
                    </div>

                    <strong className="cart-line-total">
                      Rs. {(
                        (product.sellingPrice * quantity) / 100
                      ).toFixed(2)}
                    </strong>

                    <button
                      className="remove-item"
                      type="button"
                      onClick={() => changeQuantity(product.id, 0)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="checkout-panel payment-panel">
          <h3>Payment Summary</h3>

          <label>
            Cart Discount (Rs.)
            <input
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </label>

          <div className="summary-row">
            <span>Subtotal</span>
            <span>Rs. {(subtotal / 100).toFixed(2)}</span>
          </div>

          <div className="summary-row">
            <span>Discount</span>
            <span>− Rs. {(discountAmount / 100).toFixed(2)}</span>
          </div>

          <div className="summary-row">
            <span>Tax</span>
            <span>Rs. {(tax / 100).toFixed(2)}</span>
          </div>

          <div className="summary-total">
            <span>Total</span>
            <strong>Rs. {(total / 100).toFixed(2)}</strong>
          </div>

          <label>
            Payment Method
            <select
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(
                  e.target.value as "CASH" | "CARD" | "WALLET"
                )
              }
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="WALLET">Wallet</option>
            </select>
          </label>

          <label>
            Amount Received (Rs.)
            <input
              type="number"
              min="0"
              step="0.01"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder="Enter amount"
            />
          </label>

          {paymentMethod === "CASH" && (
            <div className="change-display">
              <span>Change Due</span>
              <strong>Rs. {(change / 100).toFixed(2)}</strong>
            </div>
          )}

          <button
            className="complete-sale-button"
            type="button"
            onClick={handleCheckout}
            disabled={busy || cart.length === 0}
          >
            {busy ? "Processing Sale..." : "Complete Sale"}
          </button>

          {message && (
            <p className="checkout-message" role="status">
              {message}
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
    