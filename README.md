# AetherERP + CRM Operations Portal

A premium, highly secure, and role-based operations management system designed for wholesale and distribution enterprises. It manages customers, inventory, real-time stock logs, and commercial sales challan workflows with automatic document number serial generation and client-side PDF export.

## Technical Architecture

The application is structured as a monorepo consisting of:
- **Backend**: Node.js, Express.js, TypeScript, and Prisma ORM. Secure password storage is managed using bcrypt, and authentication is handled using JSON Web Tokens (JWT). Zod is used for runtime validation of API requests.
- **Frontend**: React, Vite, TypeScript, Lucide Icons, and jsPDF. Styled entirely with custom, high-end Vanilla CSS using CSS variables to handle dark/light themes, animations, grids, and responsive views (no Tailwind or third-party component libraries to ensure performance and clean CSS control).
- **Database**: SQLite by default for simple zero-dependency local running (connection points can be dynamically updated to **PostgreSQL** or **MySQL** in `schema.prisma`).

---

## Quick Start Guide (Local Setup)

Follow these steps to run the backend and frontend locally:

### 1. Prerequisites
- **Node.js**: v20 or later
- **npm**: v10 or later

### 2. Backend Setup
1. Open a terminal and navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Initialize the database and seed demo data (this automatically creates a local SQLite file `prisma/dev.db`):
   ```bash
   npx prisma migrate dev --name init
   ```
4. Start the backend development server:
   ```bash
   npm run dev
   ```
   The backend server will run at **`http://localhost:5000`**.

### 3. Frontend Setup
1. Open a second terminal and navigate to the `frontend/` directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
   The frontend application will be available at **`http://localhost:5173`** (or the port specified in terminal).

---

## Docker Setup (Alternative Running Method)

To run the entire system in isolated containers using Docker:
1. Make sure Docker is running on your machine.
2. In the root project directory, run:
   ```bash
   docker-compose up --build
   ```
3. Access the portal UI at **`http://localhost:3000`** (backend maps to port `5000`).

---

## Test Login Credentials

The system has seeded accounts representing four operational divisions. You can click on the quick demo buttons on the Login Screen or type manually:

| Username | Password | Role | Division Scope |
| :--- | :--- | :--- | :--- |
| **`admin`** | `admin123` | **Admin** | Full system administration, registration, full CRM/Inventory/Challan control. |
| **`sales`** | `sales123` | **Sales** | Customer CRM pipeline (leads, follow-ups), draft/confirm sales challans. Cannot edit stock levels directly or view valuation. |
| **`warehouse`** | `warehouse123` | **Warehouse** | Product inventory management, safety stock alerts, stock movement logs feed. Cannot edit customer CRM or bill invoices. |
| **`accounts`** | `accounts123` | **Accounts** | Financial dashboard overview, view sales challans, invoice PDF export, cancel transactions. Cannot edit inventory levels. |

---

## Switching to PostgreSQL / MySQL

To port the database to a production SQL instance:
1. Open [`backend/prisma/schema.prisma`](file:///c:/Users/Fenil/OneDrive/Desktop/placemenent/backend/prisma/schema.prisma).
2. Change the `provider` in `datasource db` from `"sqlite"` to `"postgresql"` or `"mysql"`.
3. In [`backend/.env`](file:///c:/Users/Fenil/OneDrive/Desktop/placemenent/backend/.env) (create if not present), update `DATABASE_URL` to point to your live database instance, e.g.:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/aether_db?schema=public"
   ```
4. Run migrations again to build tables on the SQL database:
   ```bash
   npx prisma migrate dev --name port_to_sql
   ```

---

## Core Operations Workflow Details

1. **Role Access Restriction**:
   - `Sales` agents can add new customers or log follow-up notes. If they construct a **Sales Challan** as `Confirmed`, the system checks inventory. If stock is insufficient, it throws an error.
   - `Warehouse` operators inspect the low-stock alert dashboard. They can increase stock via the inventory panel (which automatically writes a stock log entry showing who changed the quantity and why).
   - `Accounts` officers log in to print challans, export PDFs, or mark incorrect/disputed challans as `Cancelled` (which automatically reverts stock levels and logs a stock reversal transaction).
2. **Snapshot Integrity**:
   - A major business problem is product prices changing over time. If a product's price updates, historical invoices must not change.
   - This portal solves this by serializing and saving a **Customer Snapshot** and a **Product Snapshot** (containing names, SKUs, and pricing) directly into the `SalesChallan` and `SalesChallanItem` tables at the exact time of creation.
3. **Automated Serial Code Generation**:
   - Every sales challan is assigned a formatted identifier: `CHLN-YYYYMMDD-XXXX` (where `XXXX` represents a running sequence starting at `0001` each day).

---

## Assumptions Made

1. **Demo Deployment**: Local SQLite database is ideal for fast review and is portable.
2. **Sales Tax / VAT**: GST fields are captured for reporting, but calculations are based on net subtotal values.
3. **Draft Status**: Draft challans do not reserve inventory. Stock verification is only performed at the moment of status change to `Confirmed`.
