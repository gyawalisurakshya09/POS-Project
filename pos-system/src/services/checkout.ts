
import { db } from "../db/database";
import type { Invoice } from "../types/invoice";

type SaleDetails = Omit<
  Invoice,
  "id" | "invoiceNumber" | "status" | "createdAt"
>;

export async function completeSale(
  sale: SaleDetails
): Promise<Invoice> {
  const date = new Date();
  const year = date.getFullYear();

  return db.transaction(
    "rw",
    db.products,
    db.stockMovements,
    db.invoices,
    db.counters,
    async () => {
      // Combine quantities if a product appears more than once.
      const quantities = new Map<string, number>();

      for (const item of sale.items) {
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
          throw new Error("Quantity must be a positive whole number.");
        }

        quantities.set(
          item.productId,
          (quantities.get(item.productId) ?? 0) + item.quantity
        );
      }

      // Validate every product before changing stock.
      for (const [productId, quantity] of quantities) {
        const product = await db.products.get(productId);

        if (!product) {
          throw new Error("A product in the cart no longer exists.");
        }

        if (product.isArchived) {
          throw new Error(`${product.name} is archived.`);
        }

        if (product.stock < quantity) {
          throw new Error(
            `Not enough stock for ${product.name}. Available: ${product.stock}`
          );
        }
      }

      // Allocate the invoice number inside this transaction.
      const counterId = String(year);
      const counter = await db.counters.get(counterId);
      const sequence = counter?.value ?? 1;

      await db.counters.put({
        id: counterId,
        value: sequence + 1,
      });

      const invoice: Invoice = {
        ...sale,
        id: crypto.randomUUID(),
        invoiceNumber: `INV-${year}-${String(sequence).padStart(4, "0")}`,
        status: "COMPLETED",
        createdAt: date.toISOString(),
      };

      // Deduct stock and record inventory movements.
      for (const [productId, quantity] of quantities) {
        const product = await db.products.get(productId);

        if (!product) {
          throw new Error("Product not found.");
        }

        const previousStock = product.stock;
        const newStock = previousStock - quantity;

        await db.products.update(productId, {
          stock: newStock,
        });

        await db.stockMovements.add({
          id: crypto.randomUUID(),
          productId,
          productName: product.name,
          type: "OUT",
          quantity,
          previousStock,
          newStock,
          reason: `Sale ${invoice.invoiceNumber}`,
          createdAt: date.toISOString(),
        });
      }

      await db.invoices.add(invoice);

      return invoice;
    }
  );
}
