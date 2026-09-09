# POS Locker Project Context

## Purpose

POS Locker is a single-store point-of-sale web application for an administrator. It supports retail checkout, inventory/catalog management, product expiry and inward-date filtering, customer details, held bills, and sales/profit reporting.

The UI is branded as `POS Vault Locker` / `POS Locker` and uses a dark, terminal-like interface. The implementation is a client-heavy Next.js App Router application. Firebase Authentication and Cloud Firestore are optional at runtime; when Firebase is not configured or a Firebase operation fails, browser storage is used as the operational fallback.

## Technology

- Next.js `16.3.4` with the App Router.
- React `19.2.8` and TypeScript `5.9.3`.
- Tailwind CSS `4.3.3` through `@tailwindcss/postcss`.
- Firebase `12.18.0` for Auth and Firestore.
- `lucide-react` for icons.
- ESLint 9 with `eslint-config-next`.
- TypeScript path alias: `@/*` maps to `src/*`.
- Package type is ESM (`"type": "module"`).

There are no automated tests in the repository. The package scripts are:

```bash
npm run dev      # Start the development server
npm run build    # Create a production build
npm run start    # Serve a production build
npm run lint     # Run ESLint
```

The usual local URL is `http://localhost:3000`.

## Repository Map

```text
src/
  app/
    globals.css             Global Tailwind import
    layout.tsx              Root layout and AuthProvider
    page.tsx                Login / vault unlock screen
    login/page.tsx          Alias route that renders the root login screen
    admin/
      layout.tsx            Authenticated admin shell and route gate
      page.tsx              POS checkout terminal
      inventory/page.tsx    Inventory CRUD and stock management
      products/page.tsx     Date/expiry and inward-date filtering
      sales/page.tsx        Sales analytics and receipt history
  lib/
    AuthContext.tsx         Firebase/session auth and locker state
    firebase.ts             Firebase app, Auth, and Firestore initialization
    store.ts                Domain types, defaults, persistence, and sale logic
firestore.rules             Current Firestore access rules
next.config.ts              Minimal Next.js configuration
postcss.config.mjs          Tailwind/PostCSS configuration
eslint.config.mjs           ESLint configuration
```

## Application Shell and Routing

`src/app/layout.tsx` is the root layout. It imports `globals.css` and wraps all pages in `AuthProvider` from `src/lib/AuthContext.tsx`.

`src/app/page.tsx` is the login screen. It redirects an already authenticated authorized admin to `/admin`. It also provides the visible login form, a demo-admin autofill action, a password visibility toggle, failed-attempt tracking, and a 30-second client-side lockout after four failed attempts.

`src/app/login/page.tsx` simply renders the root login screen, so `/` and `/login` have the same behavior.

`src/app/admin/layout.tsx` is a client component and the shared admin shell:

- Waits for authentication state to resolve.
- Renders nothing for unauthenticated or unauthorized users. The auth context separately redirects unauthorized admin routes to `/`.
- Provides desktop sidebar and mobile navigation.
- Links to `/admin`, `/admin/inventory`, `/admin/products`, and `/admin/sales`.
- Displays the current admin email and logout action.
- Provides a temporary terminal locker overlay. Locking hides the admin content until the locker passkey is entered or the user signs out.

The admin pages are all client components because they use browser state, browser storage, modal dialogs, keyboard events, and interactive forms.

## Authentication and Authorization

`src/lib/AuthContext.tsx` owns authentication and route protection.

Important constants:

- `AUTHORIZED_ADMIN_EMAIL` is the single allowed admin identity.
- `DEMO_ADMIN_PASSWORD` is a hard-coded demo password in source code. Treat this as development-only and do not add another plaintext credential or present it as production security.
- The local/session storage key is `pos_vault_admin_session`.

Behavior:

1. Initial user state is hydrated from `sessionStorage` or `localStorage` when running in a browser, but only if the stored email matches the authorized email.
2. A Firebase `onAuthStateChanged` listener updates the user. A signed-in non-authorized Firebase user is immediately signed out and local session entries are removed.
3. `login(email, password)` lowercases and trims the email, rejects any email other than the authorized one, and then:
   - Attempts Firebase sign-in when `NEXT_PUBLIC_FIREBASE_API_KEY` is configured and is not `dummy`.
   - Attempts to auto-provision the Firebase user for the demo password when Firebase reports `auth/user-not-found` or `auth/invalid-credential`.
   - Accepts the demo password locally even without a working Firebase configuration.
4. Successful login stores an `AuthUser` object in both session and local storage and routes to `/admin` from the calling page.
5. `logout()` signs out of Firebase when possible, clears both storage locations, clears the locker state, and routes to `/`.
6. `lockLocker()` only changes in-memory React state. `unlockLocker()` checks the same hard-coded demo password.
7. Route protection uses `usePathname()` and redirects unauthenticated `/admin/*` visitors to `/` and authenticated authorized users on `/` or `/login` to `/admin` unless the locker is currently locked.

This is application-level gating, not a secure server-side authorization boundary. A future production hardening pass should remove plaintext demo credentials, use server-enforced claims/roles, avoid trusting browser storage for identity, and restrict Firestore rules.

## Firebase Configuration

`src/lib/firebase.ts` initializes one Firebase app using public environment variables and exports `auth` and `db`:

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

Missing variables receive local/dummy defaults. The rest of the application treats a real Firebase setup as enabled only when `NEXT_PUBLIC_FIREBASE_API_KEY` exists and is not `dummy`.

## Data Model

The domain interfaces live in `src/lib/store.ts`.

### Product

A product has `id`, `name`, selling `price`, optional `purchaseRate` and `mrp`, `stock`, `category`, `barcode`, optional `unit`, `taxPercent`, `hsnCode`, `rackLocation`, `expiryDate`, `batchNo`, and `createdAt`.

### Customer

A customer has `id`, `name`, `phone`, and optional contact, GST, classification, address, credit, loyalty, date, and notes fields. Customer types are `Retail`, `Wholesale`, `VIP`, and `Corporate`.

### BillItem

A bill line stores product identity, barcode/name, available stock, unit, purchase/MRP/selling rates, quantity, item discount, tax, and net amount.

### PaymentDetails

Payment modes are `CASH`, `CARD`, `UPI`, `CREDIT`, and `SPLIT`. The record stores tendered cash, card, UPI, credit amounts, and change returned.

### HeldBill

A locally held bill stores a generated hold ID, time, selected customer summary, line items, item count, total, and optional note.

### Sale

A sale stores invoice/bill IDs, customer summary, items, subtotal, item discount total, bill discount, tax total, round-off, final total, payment details, ISO timestamp, and cashier email.

## Persistence Strategy

`src/lib/store.ts` is the main persistence and business-logic module.

Browser storage keys:

- `pos_vault_inventory`
- `pos_vault_sales`
- `pos_vault_customers`
- `pos_vault_held_bills`

Inventory and customers seed local storage with default demo records when no local record exists. The defaults include 11 products and 4 customers. `addMissingDefaultAttributes()` also restores selected missing attributes and appends default products that are absent from local inventory.

Firestore collections used by the code:

- `inventory`
- `customers`
- `sales`
- `held_bills` is named in the rules but the current store module does not persist held bills to Firestore; held bills are local-only.

Read/write pattern:

- Fetch functions try Firestore only when Firebase is configured.
- If Firestore is unavailable, empty, or errors, functions fall back to local storage.
- Add/update/delete functions generally attempt Firestore and then update local storage regardless.
- Local data is therefore the immediate UI source/fallback, while Firestore is best-effort synchronization rather than a transactional source of truth.

Exported store operations include:

- `fetchInventory`, `addProduct`, `updateProduct`, `removeProduct`
- `fetchCustomers`, `addCustomer`
- `getLocalCustomers`, `saveLocalCustomer`
- `getHeldBills`, `saveHeldBill`, `removeHeldBill`
- `processRetailSale`, `fetchSales`

## POS Terminal: `/admin`

`src/app/admin/page.tsx` implements the retail checkout screen.

Main workflow:

1. Load inventory from `fetchInventory()` and customers/held bills from local storage.
2. Generate a display bill number in the form `RE-YY-NNNN`.
3. Scan a barcode or search by item name. Exact barcode matches win; otherwise the first live search match is used.
4. Add a chosen product with a quick quantity, preventing quantities above available stock.
5. Edit line quantity and discount percentage. Item tax is calculated from the discounted taxable value, and tax is treated as included in the selling rate rather than added on top of the grand total.
6. Select or edit a customer by phone or customer modal. The default walk-in customer is phone `9999999999`.
7. Apply a percentage or fixed bill discount.
8. Hold a bill for later recall, reset the current bill, or quick-add a new SKU directly from the POS screen.
9. Open the tender modal and settle by cash, card, UPI, credit, or split payment. Non-credit payments must cover the grand total.
10. `processRetailSale()` stores the sale, reduces local stock, and asynchronously attempts to update Firestore inventory stock.
11. The current customer is saved locally and earns `floor(grandTotal / 10)` points.
12. The resulting sale is shown as the last invoice and the bill resets for the next transaction.

The screen calculates gross subtotal, item discounts, tax totals, bill discount, total quantity, total cost, and gross profit for display. Checkout totals use the discounted selling amounts; `processRetailSale()` computes the persisted total from subtotal, item discounts, and bill discount.

Keyboard shortcuts:

- `F1`: Open item/catalog lookup.
- `F2`: Open customer editor.
- `F3`: Hold current bill.
- `F4`: Open held bills.
- `F5`: Reset current bill.
- `F6`: Open payment/tender modal when items exist.
- `F7`: Open bill-discount modal.
- `F8`: Open quick-add SKU modal.
- `Delete`: Remove the selected bill row when no relevant modal is open.
- `Escape`: Close open modals/invoice and refocus the scan input.

## Inventory: `/admin/inventory`

`src/app/admin/inventory/page.tsx` provides:

- Product count, total units, selling-price inventory valuation, and low-stock count.
- Search across product name, category, barcode, and rack location.
- Category filters: All, Beverages, Bakery, Food, Merchandise, Snacks.
- Add and edit product modal fields for rates, stock, unit, GST rate, category, barcode, HSN, rack, expiry, and batch.
- Quick stock changes of `-1`, `+1`, and `+10`.
- Product deletion after confirmation.
- A link to the date/expiry view.

Low stock means `stock <= 5`; out of stock means `stock <= 0`. Inventory valuation is selling price multiplied by stock, not purchase cost.

## Product Date and Expiry View: `/admin/products`

`src/app/admin/products/page.tsx` filters the inventory catalog by either:

- `expiry`: `Product.expiryDate`
- `created`: date derived from `Product.createdAt`

Presets are All Products, Today, This Month, Next Month, Expired, an exact custom date, and a custom inclusive date range. Search covers name, barcode, and batch number; categories are generated from the loaded product data.

The page displays expiry metrics for today, this month, next month, and already expired. It also computes matched product count, stock units, selling-price valuation, and potential profit based on purchase rate. Each row can edit expiry date, batch number, stock, selling price, and purchase rate.

Dates are compared as ISO `YYYY-MM-DD` strings. Be careful with timezone conversions if changing this logic. Some labels assume month lengths of 30 or 31 days even though filtering itself uses string prefixes.

## Sales and Receipts: `/admin/sales`

`src/app/admin/sales/page.tsx` loads sales and inventory and provides:

- All-time gross sales, profit, cash, UPI, order count, and units sold.
- Overall profit margin.
- Day-wise grouping by ISO date, including orders, total sales, cash, UPI, profit, and margin.
- Clickable day filters that also filter the transaction table.
- Search by bill ID, cashier, customer name, or item name.
- Transaction rows with customer, items, payment mode, cash/UPI breakdown, total, and estimated sale profit.
- Receipt detail modal with item lines, discounts, tax, totals, payment information, profit, and browser print support.

Cash and UPI figures are derived from stored payment details. Sale profit uses each line's purchase rate, then falls back to matching inventory purchase rate, then to `75%` of the selling rate when no cost is available. This fallback is an estimate, not an accounting-grade cost basis.

## Firestore Rules and Security State

`firestore.rules` currently allows unrestricted read and write access:

```text
allow read, write: if true;
```

The intended authenticated-admin rule is present only as a comment. This is acceptable only for local/development experimentation and must be changed before using real customer, inventory, or sales data. Rules should validate authenticated identity and collection-level data shape rather than relying only on the UI gate.

## Important Implementation Caveats

- There is no server-side route protection or server action/API layer; authorization is client-side.
- The demo admin email and password are source-controlled. Do not treat the current login flow as production authentication.
- Browser storage is writable by the user and is used as a fallback, so it must not be trusted for financial or identity-sensitive records.
- Firestore writes are best-effort and many errors are intentionally swallowed. A failed remote write can leave local and remote data divergent.
- `processRetailSale()` writes local sale data before the remote write and updates stock with independent asynchronous Firestore writes. It is not an atomic transaction and does not prevent concurrent stock races across clients.
- Held bills are local-only and are not shared between devices.
- `fetchCustomers()` can read Firestore, but the main POS flow primarily initializes customers from local storage and saves customer edits locally.
- The generated sale invoice ID and display bill number use random values and have no uniqueness transaction or server sequence.
- Tax is calculated and displayed, but the persisted total intentionally does not add tax on top of the selling rate. Preserve this convention unless the business requirement changes.
- There is no formal validation layer for barcode uniqueness, negative/invalid monetary values beyond basic form controls, GSTIN, phone formats, or credit limits.
- No automated tests are present. Changes to checkout calculations, stock mutation, authentication, and date boundaries deserve focused tests before production use.
- `README.md` is still the stock create-next-app README and does not document the POS application.

## Guidance for Future AI Agents

Before changing behavior, locate the owning path:

- Auth, redirects, session persistence, or locker state: `src/lib/AuthContext.tsx`.
- Firebase initialization or environment handling: `src/lib/firebase.ts`.
- Data models, local storage, Firestore calls, sale totals, or stock mutation: `src/lib/store.ts`.
- POS interactions and checkout UI: `src/app/admin/page.tsx`.
- Shared admin navigation/lock overlay: `src/app/admin/layout.tsx`.
- Catalog CRUD and stock adjustments: `src/app/admin/inventory/page.tsx`.
- Date lifecycle filtering: `src/app/admin/products/page.tsx`.
- Reporting, payment breakdown, profit fallback, or receipt rendering: `src/app/admin/sales/page.tsx`.

Keep edits scoped to the existing client-side patterns unless the task explicitly calls for an architectural change. After changing a calculation or persistence function, verify the narrow behavior first, then run `npm run lint` and `npm run build` when practical. Avoid exposing or expanding the hard-coded demo credential path in user-facing documentation.
