# HOROLOGUE — Luxury Chronograph E-Commerce & Management Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.19-black.svg)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e.svg)](https://supabase.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-ffca28.svg)](https://firebase.google.com/)

> **HOROLOGUE** is a full-stack e-commerce application for luxury chronographs featuring interactive 3D WebGL watch visualizers, secured multi-payment workflows, tier subscription management, and an administrative analytics dashboard.

---

## 🖼️ Application Preview

> *Note: Place project screenshots or GIF demonstrations in the `docs/screenshots/` folder.*

| Interactive 3D Model Viewer | Administrative Dashboard |
| :---: | :---: |
| ![3D Watch Viewer](docs/screenshots/watch-3d-viewer.png) | ![Admin Dashboard](docs/screenshots/admin-dashboard.png) |

* **Live Demo:** [https://horologue-demo.example.com](https://horologue-demo.example.com) *(Demo Link Placeholder)*

---

## 🏗️ System Architecture

```mermaid
graph TD
    User["React 19 Frontend (Vite + TypeScript)"]
    Admin["Admin Control Panel"]
    R3F["Three.js / React Three Fiber (3D Canvas)"]
    PDF["jsPDF Engine (Invoices)"]

    Backend["Express.js Server (Node + TypeScript)"]
    Auth["Firebase Auth (ID Tokens)"]
    DB[("Supabase PostgreSQL")]
    Razorpay["Razorpay API (Payments)"]
    Email["Nodemailer (SMTP / Restock Alerts)"]

    User --> |Auth State| Auth
    User --> |REST API Requests| Backend
    Admin --> |Admin API Requests| Backend
    User --> R3F
    Admin --> PDF

    Backend --> |Token Verification| Auth
    Backend --> |Queries & Transactions| DB
    Backend --> |Order & Webhook Processing| Razorpay
    Backend --> |Transactional Emails| Email
```

---

## ✨ Features & Status

| Feature | Status | Description |
| :--- | :---: | :--- |
| **Interactive 3D Watch Inspection** | `Active` | Renders 3D watch models using WebGL via Three.js and `@react-three/fiber` with custom camera controls. |
| **Product Catalog & Details** | `Active` | Catalog filtering, detailed spec sheets, live stock status indicators, and ratings summary. |
| **Cart & Multi-Payment Checkout** | `Active` | Cart management supporting Credit/Debit Cards (Razorpay), Online UPI, and Cash on Delivery with stock validation. |
| **Tier Membership Program** | `Active` | Annual subscription workflow with auto-renewal scheduling and membership badge status. |
| **Admin Dashboard** | `Active` | 5 operational tabs (Summary, Orders, Inventory, Customer Directory, Subscribers) with analytics & CSV export. |
| **Automated PDF Invoices** | `Active` | Client-side official invoice PDF receipt generation via `jsPDF` & `jspdf-autotable`. |
| **Stock Notification System** | `Active` | Restock email subscription for out-of-stock items; triggers automated email notifications when stock is updated. |
| **Payment Webhook Backstop** | `Active` | Razorpay webhook processing with HMAC signature verification and idempotency handling. |
| **Automated E2E Test Suite** | `In Progress` | Expanding automated Playwright test scripts for full checkout flow coverage. |

---

## 🛡️ Security Controls & Defensive Practices

- **SQL Injection Defenses:** All database access is implemented via Supabase-js parameterized query builders (`.from()`, `.select()`, `.eq()`, `.insert()`). Raw string concatenation is avoided.
- **Access Control & IDOR Checks:** User-scoped endpoints (`orders`, `subscriptions`, `wishlists`) filter by `user_id = auth.uid` at the database query level. Admin endpoints enforce `requireAdmin` role checks on the backend.
- **Mass Assignment Protection:** Incoming `POST` and `PATCH` requests are validated through Zod schemas to strip unexpected or privileged fields (such as `role: 'admin'`).
- **XSS Prevention:** User-generated content (such as review comments) is rendered using standard React JSX syntax, relying on React's automatic string escaping.
- **Rate Limiting & Security Headers:** Request rate limiting is configured via `express-rate-limit` across authentication, public, and user route groups, alongside security headers via `helmet`.
- **Error Handling:** Centralized error middleware suppresses internal stack traces and database error codes when `NODE_ENV=production`.
- **Environment & Key Isolation:** Backend credentials are stored in `server/.env` and excluded from version control via `.gitignore`.

---

## 💡 Engineering Challenges & Solutions

### 1. 3D Model Rendering Performance
* **Challenge:** Rendering high-polygon 3D meshes without dropping frames or blocking main UI interaction.
* **Solution:** Used `@react-three/fiber` with deferred canvas loading, fallback loading spinners, and optimized lighting setups to maintain smooth interaction across device tiers.

### 2. Multi-Provider Authentication & Profile Syncing
* **Challenge:** Synchronizing user identity between Firebase Auth (client authentication) and Supabase PostgreSQL (application data & roles).
* **Solution:** Built an authenticated `/api/auth/sync` endpoint that verifies Firebase Bearer ID tokens on the backend and upserts profile rows cleanly while preventing unauthorized role escalation.

### 3. Payment Idempotency & Tab Closures
* **Challenge:** Ensuring orders and subscriptions are recorded accurately even if a customer closes their browser before the client-side checkout callback finishes.
* **Solution:** Implemented a Razorpay Webhook endpoint (`/api/payments/webhook`) using HMAC signature validation (`RAZORPAY_WEBHOOK_SECRET`) and status checks (`status !== 'verified'`) to safely process transactions idempotently.

---

## 🧪 Testing & Quality Assurance

- **Static Type Checking:** Strict TypeScript configuration across both frontend (`tsconfig.app.json`) and backend (`tsconfig.json`).
- **Build Verification:** Continuous compilation checks via `tsc -b` (frontend) and `tsc` (backend).
- **Backend Integration Diagnostics:** Node.js diagnostic scripts verifying role filtering, review duplicate logic, and webhook HMAC signature calculations.

---

## 🛠️ Technology Stack Overview

### **Frontend**
- **Core:** React 19, TypeScript 5.4, Vite 8
- **3D Rendering:** Three.js, `@react-three/fiber`, `@react-three/drei`
- **Animations & Smooth Scroll:** GSAP, Framer Motion, Lenis Smooth Scroll
- **Styling & UI:** Vanilla CSS (Custom Design System with CSS Variables), Lucide React Icons
- **Document Generation:** `jsPDF`, `jspdf-autotable`, `qrcode`

### **Backend**
- **Runtime & Server:** Node.js, Express, TypeScript
- **Database:** Supabase (PostgreSQL) via Service Role Client
- **Authentication:** Firebase Auth (`firebase-admin` & `firebase/auth`)
- **Payments:** Razorpay API (`razorpay`) with HMAC signature verification
- **Email Service:** Nodemailer
- **Middleware & Security:** Helmet, `express-rate-limit`, CORS, Zod schema validation

---

## 📁 Repository Structure

```
horologue/
├── server/                        # Express TypeScript Backend Server
│   ├── src/
│   │   ├── config/                # Supabase, Firebase Admin, Razorpay, Email configs
│   │   ├── controllers/           # Admin, Auth, Orders, Products, Subscriptions, Payments
│   │   ├── middleware/            # Auth, Admin Verification, Zod Validation, Rate Limiters
│   │   ├── routes/                # API Route Definitions
│   │   ├── services/              # Supabase Service Layer, Email Service, Razorpay Service
│   │   ├── app.ts                 # Express Application setup & Environment Validation
│   │   └── server.ts              # HTTP Server entry point
│   ├── .env                       # Backend Environment Variables (Ignored in Git)
│   ├── check-db-connection.js     # Database Connection Diagnostic Tool
│   └── package.json
│
├── src/                           # React Frontend Application
│   ├── components/
│   │   ├── AdminDashboard.tsx     # Admin Console (Summary, Orders, Inventory, Clients, Subscribers)
│   │   ├── UserDashboard.tsx      # Collector Profile & Order History
│   │   ├── Checkout.tsx           # Multi-step Checkout & Payment Gateway Integration
│   │   ├── SubscriptionCheckout.tsx # Tier Membership Checkout
│   │   ├── WatchModel.tsx         # 3D Interactive Watch Model Viewer (Three.js)
│   │   ├── Collection.tsx         # Filterable Product Catalog
│   │   ├── ProductDetails.tsx     # Product Specs & Restock Alert Signup
│   │   ├── Cart.tsx               # Shopping Cart Overlay
│   │   ├── WishlistPage.tsx       # Saved Wishlist Items
│   │   ├── Navbar.tsx             # Navigation Bar
│   │   └── Footer.tsx             # Footer & Newsletter Subscription
│   ├── services/
│   │   └── api.ts                 # Frontend API Service Layer
│   ├── lib/
│   │   └── firebaseClient.ts      # Firebase Auth Client Initialization
│   ├── App.tsx                    # Main App Controller & Hash Router
│   └── index.css                  # Global Styling System
│
├── .env.local                     # Frontend Environment Variables (Ignored in Git)
├── .gitignore                     # Git Exclusion Rules
└── package.json
```

---

## 🗄️ Database Schema Summary (Supabase PostgreSQL)

| Table | Key Columns | Description |
| :--- | :--- | :--- |
| **`profiles`** | `id`, `email`, `full_name`, `phone`, `country`, `role`, `created_at` | User account details and roles (`customer`, `admin`). |
| **`products`** | `id`, `name`, `reference`, `price`, `stock`, `image_url`, `description`, `created_at` | Product catalog items, stock counts, and reference codes. |
| **`orders`** | `id`, `order_ref`, `user_id`, `customer_name`, `email`, `phone`, `shipping_address`, `total`, `payment_method`, `status`, `razorpay_order_id` | Customer orders and fulfillment statuses (`pending`, `shipped`, `delivered`, `cancelled`). |
| **`subscriptions`** | `id`, `user_id`, `plan_name`, `fee`, `status`, `start_date`, `renewal_date`, `created_at` | Tier membership records (`active`, `inactive`). |
| **`newsletter_subscribers`** | `id`, `email`, `subscribed_at` | Newsletter subscriber emails. |
| **`stock_notifications`** | `id`, `product_id`, `email`, `notified`, `created_at` | Restock notification signups. |
| **`reviews`** | `id`, `product_id`, `user_id`, `rating`, `comment`, `verified_purchase`, `created_at` | Product reviews and ratings. |
| **`wishlists`** | `id`, `user_id`, `product_id`, `created_at` | Saved user wishlist items. |
| **`payments`** | `id`, `razorpay_order_id`, `amount`, `currency`, `status`, `user_id`, `type`, `metadata` | Payment transaction records (`created`, `verified`). |

---

## 🔌 API Reference Summary

### **Public Routes**
- `GET /health` / `GET /api/health` — System health checks
- `GET /api/products` — Fetch product catalog
- `GET /api/products/:id/reviews` — Fetch reviews summary for a product
- `POST /api/products/:id/notify-me` — Subscribe email for restock alerts
- `POST /api/newsletter/subscribe` — Subscribe email to newsletter

### **Authenticated User Routes** (Firebase Bearer Token required)
- `POST /api/auth/sync` — Sync Firebase user profile with Supabase `profiles` table
- `GET /api/orders` — Fetch orders for current user
- `GET /api/subscriptions/me` — Fetch subscription status for current user
- `POST /api/payments/create-order` — Create Razorpay order for checkout
- `POST /api/payments/verify` — Verify Razorpay payment signature & record order
- `POST /api/products/:id/reviews` — Submit review for a product (enforces 1 review per user/product)
- `GET /api/wishlist` & `POST /api/wishlist/toggle` — Manage user wishlist items

### **Admin Dashboard Routes** (Admin Bearer Token required)
- `GET /api/admin/stats` — Fetch dashboard metrics and chart analytics
- `GET /api/admin/orders` — Fetch all customer orders
- `PATCH /api/admin/orders/:id` — Update order status (`Pending`, `Shipped`, `Delivered`, `Cancelled`)
- `GET /api/admin/customers` — Fetch customer directory with membership status
- `GET /api/admin/newsletter` — Fetch newsletter subscribers list
- `POST /api/admin/products` — Add new product to catalog
- `PATCH /api/admin/products/:id` — Update stock levels or product details (triggers restock emails if restocked)
- `DELETE /api/admin/products/:id` — Delete product from catalog

### **Payment Webhooks**
- `POST /api/payments/webhook` — Razorpay webhook endpoint for `payment.captured` events with HMAC signature validation

---

## ⚙️ Environment Setup

### **Backend (`server/.env`)**
```env
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Supabase PostgreSQL Configuration
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Firebase Authentication Service Account
FIREBASE_PROJECT_ID=<your-firebase-project-id>
FIREBASE_CLIENT_EMAIL=<your-service-account-email>
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Razorpay Payment Gateway Keys
RAZORPAY_KEY_ID=rzp_test_<your-key-id>
RAZORPAY_KEY_SECRET=<your-key-secret>
RAZORPAY_WEBHOOK_SECRET=<your-webhook-secret>

# Email Notification Setup
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-email>
SMTP_PASS=<your-app-password>
```

### **Frontend (`.env.local`)**
```env
VITE_API_BASE_URL=http://localhost:4000
VITE_FIREBASE_API_KEY=<your-firebase-api-key>
VITE_FIREBASE_AUTH_DOMAIN=<your-project>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<your-project-id>
VITE_FIREBASE_STORAGE_BUCKET=<your-project>.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=<your-sender-id>
VITE_FIREBASE_APP_ID=<your-app-id>
VITE_RAZORPAY_KEY_ID=rzp_test_<your-key-id>
```

---

## 🚀 Running Locally & Building

### **1. Install Dependencies**
```bash
# Frontend
npm install

# Backend
cd server && npm install && cd ..
```

### **2. Development Mode**
```bash
npm run dev
```
- **Frontend App:** `http://localhost:5173`
- **Backend Server:** `http://localhost:4000`

### **3. Production Build**
```bash
# Frontend
npm run build

# Backend
cd server && npm run build
```

---

## 🔮 Future Improvements

- [ ] **Role-Based Granular Permissions:** Expand admin roles to include dedicated inventory manager vs support agent roles.
- [ ] **Automated End-to-End Test Coverage:** Implement full Playwright test scripts covering the complete payment & subscription checkout flows.
- [ ] **Webhook Event Queue:** Introduce Redis-backed queue processing for high-volume webhook events.
