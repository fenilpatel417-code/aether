# Aether Operations Portal — Technical & API Documentation

Aether is a role-based Enterprise Operations Portal integrating Customer Relationship Management (CRM), Real-time Inventory Control, and Commercial Sales Challan Workflows. 

---

## 🏗️ System Architecture

The following diagram illustrates the data flow and architectural design of the Aether portal:

```mermaid
graph TD
    User([Operations Team]) -->|Browser Interface| FE[React / Vite SPA]
    FE -->|API requests / JWT| BE[Express.js App]
    BE -->|Query / Mutate| ORM[Prisma Client]
    ORM -->|Read / Write| DB[(SQLite / PostgreSQL)]
    
    subgraph Frontend (Pure CSS + React)
        FE --> JS_PDF[jsPDF Client]
        FE --> UI_Tilt[Glassmorphic Parallax UI]
        FE --> Liquid_Mode[Circular Liquid Transitions]
    end
```

---

## 🗄️ Database Entity-Relationship Diagram (ERD)

Aether enforces snapshot integrity for historical transactions. Below is the relational database layout:

```mermaid
erDiagram
    USER {
        string id PK
        string username UNIQUE
        string passwordHash
        string name
        string role "Admin | Sales | Warehouse | Accounts"
        datetime createdAt
    }
    CUSTOMER {
        string id PK
        string name
        string mobile
        string email
        string businessName
        string gstNumber
        string customerType "Retail | Wholesale | Distributor"
        string address
        string status "Lead | Active | Inactive"
        datetime createdAt
    }
    CUSTOMER_NOTE {
        string id PK
        string customerId FK
        string note
        string createdBy
        datetime createdAt
    }
    PRODUCT {
        string id PK
        string name
        string sku UNIQUE
        string category
        float unitPrice
        int currentStock
        int minStockAlert
        string location
    }
    STOCK_LOG {
        string id PK
        string productId FK
        int quantityChanged
        string movementType "IN | OUT"
        string reason
        string createdBy
        datetime createdAt
    }
    SALES_CHALLAN {
        string id PK
        string challanNumber UNIQUE
        string customerId FK
        string customerSnapshot "JSON representation at bill time"
        string status "Draft | Confirmed | Cancelled"
        int totalQuantity
        float totalAmount
        string createdBy
        datetime createdAt
    }
    SALES_CHALLAN_ITEM {
        string id PK
        string challanId FK
        string productId FK
        string productSnapshot "JSON representation at bill time"
        int quantity
        float unitPrice
        float totalPrice
    }

    CUSTOMER ||--o{ CUSTOMER_NOTE : "has"
    CUSTOMER ||--o{ SALES_CHALLAN : "receives"
    PRODUCT ||--o{ STOCK_LOG : "audits"
    PRODUCT ||--o{ SALES_CHALLAN_ITEM : "ordered_in"
    SALES_CHALLAN ||--|{ SALES_CHALLAN_ITEM : "contains"
```

---

## 🔌 REST API Endpoint Reference

All endpoints (except Authentication) require a Bearer JWT Token passed in the `Authorization` header:
`Authorization: Bearer <your_jwt_token>`

### 🔑 Authentication Services
*   **`POST /api/auth/login`**
    *   *Description*: Logs in an operator and retrieves their user scope and JWT token.
    *   *Payload*:
        ```json
        { "username": "admin", "password": "admin123" }
        ```
    *   *Response*:
        ```json
        {
          "token": "eyJhbGciOi...",
          "user": { "id": "1", "username": "admin", "name": "System Administrator", "role": "Admin" }
        }
        ```

### 📊 Operations Dashboard
*   **`GET /api/dashboard/stats`**
    *   *Description*: Retrieves high-level KPI stats (revenue, active customers, low-stock warnings) based on user role permissions.

### 👥 Customer Relationship Management (CRM)
*   **`GET /api/customers`**
    *   *Query Parameters*: `q` (search string), `status` (filter), `page`, `limit`.
    *   *Description*: Retrieves a paginated list of accounts.
*   **`POST /api/customers`**
    *   *Description*: Registers a new customer profile.
*   **`PUT /api/customers/:id`**
    *   *Description*: Updates customer profile details.
*   **`POST /api/customers/:id/notes`**
    *   *Description*: Adds a progress note to the customer timeline ledger.

### 📦 Inventory Control
*   **`GET /api/products`**
    *   *Query Parameters*: `q` (SKU or name search), `lowStock` (boolean filter), `page`, `limit`.
    *   *Description*: Retrieves active product catalog.
*   **`POST /api/products`**
    *   *Description*: Adds a new product stock line item.
*   **`PUT /api/products/:id`**
    *   *Description*: Updates stock details. Auto-generates a safety audit log.
*   **`GET /api/products/:id/logs`**
    *   *Description*: Retrieves inventory movement logs for safety stock auditing.

### 📝 Commercial Sales Challans
*   **`GET /api/challans`**
    *   *Query Parameters*: `status`, `page`, `limit`.
    *   *Description*: Retrieves generated challans.
*   **`POST /api/challans`**
    *   *Description*: Creates a new sales challan (serial code `CHLN-YYYYMMDD-XXXX` is generated automatically).
*   **`PATCH /api/challans/:id/status`**
    *   *Description*: Modifies challan workflow status (`Draft` ➔ `Confirmed` (reduces stock) or `Confirmed` ➔ `Cancelled` (reverts stock)).

---

## 💡 Key Architectural Design Decisions

### 1. Snapshot Integrity Design Pattern
A common failure point in ERP systems is when a product's price or customer's address is updated, causing older invoices/challans to change value retroactively.
*   **Solution**: When a sales challan is confirmed, the system serializes a snapshot of the `Customer` and `Product` details as a frozen JSON string in the `customerSnapshot` and `productSnapshot` fields.
*   **Result**: Even if the customer details change or the product is deleted from the catalog, older invoices render historical price details.

### 2. Double-Transaction Stock Lock
*   **Draft Status**: Challans saved as `Draft` reserve zero inventory, allowing operators to build quotes without blocking real stock.
*   **Confirmed Status**: The moment status shifts to `Confirmed`, an atomic transaction verifies database availability. If stock is available, it decreases the count; otherwise, it throws a safe warning toast.
*   **Cancellation Reversion**: If a challan is cancelled, stock is automatically returned to the inventory log under the audit trail of the user who cancelled it.

### 3. Glassmorphic Notification Toast System
Instead of browser alerts, a custom React context tracks alerts, applies slide-in keyframe animations, and clears them automatically after 4 seconds to maintain a premium application flow.
