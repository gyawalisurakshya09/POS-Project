
import Dexie, { type Table } from "dexie";
import type { Product } from "../types/product";
import type { Invoice } from "../types/invoice";

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: "IN" | "OUT";
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  createdAt: string;
}
export interface InvoiceCounter {
  id: string;
  value: number;
}


class POSDatabase extends Dexie {
  products!: Table<Product, string>;
  stockMovements!: Table<StockMovement, string>;
  invoices!: Table<Invoice, string>;
  counters!: Table<InvoiceCounter, string>;

  constructor() {
    super("POSDatabase");

    this.version(1).stores({
      products: "id, sku, name, category, isArchived",
    });

    this.version(2).stores({
      products: "id, sku, name, category, isArchived",
      stockMovements: "id, productId, createdAt, type",
    });

    this.version(3).stores({
  products: "id, sku, name, category, isArchived",
  stockMovements: "id, productId, createdAt, type",
  invoices: "id, invoiceNumber, createdAt, status",
});

this.version(4).stores({
  products: "id, sku, name, category, isArchived",
  stockMovements: "id, productId, createdAt, type",
  invoices: "id, &invoiceNumber, createdAt, status",
  counters: "id",
});

  }
}

export const db = new POSDatabase();
