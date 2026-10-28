
export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  sellingPrice: number;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  unit: string;
  taxRate: number;
  isArchived: boolean;
}
