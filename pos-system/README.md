# POS System

A frontend-only Point of Sale (POS) application built with React, TypeScript, and Vite. It supports product management, inventory tracking, checkout, invoice generation, and basic sales reports.

## Features

- **Role-based UI:** Owner and Cashier views.
- **Product Management:** Add, edit, search, archive, and restore products.
- **Inventory Management:** Stock adjustments, movement history, and low-stock alerts.
- **Checkout:** Shopping cart, quantity controls, discounts, tax calculations, and payment method recording.
- **Invoices:** Invoice history, invoice details, and printable receipts.
- **Reports:** Daily sales, total invoices, revenue, and low-stock products.
- **Data Persistence:** IndexedDB storage using Dexie.
- **Stock Validation:** Prevents sales when available stock is insufficient.

## Tech Stack

- React
- TypeScript
- Vite
- Dexie.js
- IndexedDB
- CSS

## Getting Started

### Prerequisites

Install Node.js and npm.

### Installation

```bash
git clone <https://github.com/gyawalisurakshya09/POS-Project.git>
cd pos-system
npm install
npm run dev
```

Open the local URL shown in your terminal.

### Production Build

```bash
npm run build
```

## Architecture

The application uses React components for the user interface, TypeScript types for data structures, and a service layer for checkout operations. IndexedDB stores products, stock movements, invoices, and invoice counters.


