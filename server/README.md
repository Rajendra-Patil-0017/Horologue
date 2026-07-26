# Horologue Luxury Backend Service

This directory contains the Express + TypeScript backend for the Horologue Luxury Watch Club.

## Prerequisites

Ensure you have Node.js (version 18+ recommended) installed.

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   Create a `.env` file in this directory based on the `.env.example` file:
   ```bash
   cp .env.example .env
   ```
   Ensure you populate all variables:
   - `SUPABASE_SERVICE_ROLE_KEY`: Service-role key for backend admin database access.
   - `FIREBASE_PRIVATE_KEY`: Service account key from Firebase Console (ensure escaped newlines `\n` are preserved).
   - `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`: Test gateway keys.
   - `RESEND_API_KEY`: API key to send branded receipts.

3. **Database Setup**
   Ensure the database schema has been applied in your Supabase SQL Editor (`supabase-schema-v2.sql`). Do not initialize database tables from backend code.

4. **Run Server in Development**
   ```bash
   npm run dev
   ```
   The backend will start and listen at `http://localhost:4000`.

5. **Build for Production**
   ```bash
   npm run build
   ```
   Compiles TS files to the `dist/` directory.

6. **Start Compiled Server**
   ```bash
   npm start
   ```

## Key Technologies
- **Express.js**: Core HTTP framework.
- **Firebase Admin SDK**: Performs server-side validation of JWT tokens.
- **Supabase JS Client**: Connects to Postgres database using the service-role client bypass.
- **Razorpay SDK**: Handles payments creation and verifies HMAC signatures.
- **Resend**: Triggers clean, branded HTML email receipts.
