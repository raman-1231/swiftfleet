# SwiftFleet — Autonomous Crowdsourced Logistics OS

> **A high-integrity MERN platform orchestrating on-demand hyperlocal delivery workforces with verified couriers, proximity dispatching, atomic order locking, and auditable earnings ledgers.**

Designed and engineered as a university evaluation and placement portfolio project. SwiftFleet combines the clarity of premium enterprise SaaS with the operational precision of modern logistics tech.

---

## 1. Non-Negotiable System Priorities

1. **Art-Directed Visual Hierarchy & Usability**: Slate ink typography (`#0F172A`), electric cobalt primary (`#3457E5`), mint operational states (`#16865C`), and zero generic AI dashboard tropes.
2. **Complete End-to-End Functionality**: Working merchant order creation, proximity dispatch cascade (45s deadline), courier HUD, live GPS telemetry beacons, and exactly-once earnings ledger credits.
3. **Secure MERN Architecture**: JWT-guarded REST endpoints, authorized Socket.IO rooms, rate limiting, and password hashing.
4. **Responsive Across Viewports**: Dedicated task-oriented mobile HUD for couriers and high-density multi-column data workspaces for merchants and operations coordinators.
5. **Zero-Friction Local Execution**: Boots instantly without external database setup via auto-fallback to embedded MongoMemoryServer and automated seed initialization.

---

## 2. Core Business Rules & State Machine

Every lifecycle transition is enforced on the server:

```
[Created] ──► [Offered (45s Timer)] ──► [Assigned] ──► [Picked Up] ──► [Delivered]
                     │                                                      │
                     ▼ (Timeout/Decline)                                    ▼
       [Re-offered to Next Courier]                            [Exactly-Once Ledger]
```

- **Courier Verification Gate**: Only couriers with `approved` verification status can receive or accept delivery offers.
- **Atomic Concurrency Protection**: Offer acceptance is guarded via conditional atomic updates (`$set: status='assigned' WHERE status='offered' AND offeredPartnerId=partnerId`), eliminating double-acceptance race conditions.
- **Linear State Transitions**: Orders must progress strictly: `assigned` → `picked_up` → `delivered`. Direct skips are rejected with `400 Bad Request`.
- **Exactly-Once Settlement**: Handover to customer triggers an upsert with unique index on `orderId` in `EarningsLedger`, ensuring couriers are credited once and only once.
- **Urban Grid Pricing Formula**: Transparent road calculation using a 1.28x urban grid coefficient over straight-line distance, disclosing base fare, per-km charge ($1.80/km), weight surcharges, and the guaranteed 78% courier payout share.

---

## 3. Technology Stack

### Frontend Client
- **Framework**: React 18, Vite SPA
- **Styling & Design System**: Tailwind CSS, Lucide React Iconography, Inter typography
- **Maps & Telemetry**: Leaflet with CartoDB Positron / OpenStreetMap tiles
- **Data Visualizations**: Recharts
- **Realtime**: Socket.IO Client
- **Delight & Feedback**: Canvas Confetti, custom toast notifications

### Backend Server
- **Runtime**: Node.js & Express
- **Database**: MongoDB (Mongoose ORM with 2dsphere proximity indexes)
- **Zero-Config Standalone Engine**: Built-in MongoMemoryServer fallback (works offline or out of the box without local MongoDB daemon)
- **Realtime Gateway**: Socket.IO (JWT authenticated handshakes, personal user rooms, role channels, and order telemetry rooms)
- **Security & Headers**: Helmet, CORS, Express-Rate-Limit, bcryptjs, jsonwebtoken
- **Testing**: Jest & Supertest

---

## 4. Pre-Seeded Demonstration Personas

SwiftFleet includes a one-click **"Switch Demo Persona"** dropdown in the navigation header so evaluators can switch between roles instantly without typing credentials:

| Persona Role | Account Name | Email | Password | Key Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Merchant (Business)** | Artisan Roast Co. | `roast@artisan.demo` | `Password123!` | Create deliveries, live order tracking, spend ledger |
| **Merchant (Business)** | GreenLeaf Organics | `contact@greenleaf.demo` | `Password123!` | Multi-stop grocery order management |
| **Merchant (Business)** | Midtown Express Rx | `orders@midtownrx.demo` | `Password123!` | Prescription priority handling |
| **Courier (Approved)** | Marcus Vance | `marcus.vance@courier.demo` | `Password123!` | Online/Offline toggle, accept offers, active mission HUD |
| **Courier (Approved)** | Elena Rostova | `elena.rostova@courier.demo` | `Password123!` | E-bike courier, in-transit telemetry updates |
| **Courier (Pending)** | Devon Thorne | `devon.thorne@courier.demo` | `Password123!` | Demonstrates onboarding state awaiting admin approval |
| **Admin Operations** | Sarah Lin (Ops Director)| `admin@swiftfleet.io` | `Password123!` | Workforce verification, live fleet radar, disputes & audit |

---

## 5. Quickstart & Installation

### Prerequisites
- Node.js v18+ and npm

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/swiftfleet.git
cd swiftfleet

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Environment Variables (Optional)
The server works out-of-the-box with zero configuration. If you wish to connect to a cloud MongoDB Atlas cluster, create `server/.env`:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=swiftfleet_ultra_secure_jwt_secret_dev_2026_key
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:5173
OFFER_TIMEOUT_SECONDS=45
BASE_DELIVERY_FARE=5.00
PER_KM_RATE=1.80
PARTNER_PAYOUT_RATIO=0.78
# MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/swiftfleet?retryWrites=true&w=majority
```

### 3. Build & Run Application
```bash
# In client/ directory: Build the production bundle
npm run build

# In server/ directory: Start the unified full-stack server
npm start
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser!

### Running in Concurrent Development Mode
To run client with Vite Hot-Module-Reloading:
- **Terminal 1**: `cd server && npm run dev` (Runs backend on port 5000)
- **Terminal 2**: `cd client && npm run dev` (Runs Vite on port 5173 with proxy)

---

## 6. Automated Testing

Run the automated integration and business rule test suite:
```bash
cd server
npm test
```

### Test Suite Coverage:
- `Pricing Engine & Transparent Disclosures`: Validates road grid coefficient, driver payout calculation, and ETA approximation.
- `Authentication & Role Boundaries`: Rejects unauthenticated requests and forbids couriers from creating merchant orders.
- `Order Creation & Proximity Matching`: Verifies auto-quote pricing and automated dispatch queuing.
- `Verification Gating`: Enforces that pending/unapproved couriers cannot accept live delivery offers.
- `Atomic Concurrency Lock`: Guarantees single-partner acceptance and rejects concurrent duplicate acceptance attempts.
- `Sequential State Machine`: Rejects invalid state transitions (`assigned` straight to `delivered`).
- `Exactly-Once Ledger Settlement`: Validates that completed deliveries credit the earnings ledger exactly once.

---

## 7. REST API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register-business` — Register merchant and store profile
- `POST /api/auth/register-partner` — Register courier and driver license details (sets status to `pending`)
- `POST /api/auth/login` — Authenticate and return signed JWT
- `GET /api/auth/me` — Return session details and verified profile status

### Orders (`/api/orders`)
- `POST /api/orders/estimate` — Server-calculated transparent route quote and duration
- `POST /api/orders` — Create new delivery and trigger proximity dispatch
- `GET /api/orders` — Filterable orders list with status and search parameters
- `GET /api/orders/:id` — Full order detail, timeline, and assigned partner contact
- `POST /api/orders/:id/cancel` — Cancel active order (guarded if already picked up)

### Dispatch & Courier HUD (`/api/dispatch`)
- `GET /api/dispatch/offers` — Retrieve pending 45s delivery offer for courier
- `POST /api/dispatch/accept/:orderId` — Atomic conditional acceptance of delivery offer
- `POST /api/dispatch/reject/:orderId` — Decline offer and trigger immediate next-courier cascade
- `POST /api/dispatch/status-update` — Transition delivery state (`picked_up` → `delivered`)
- `POST /api/dispatch/availability` — Toggle online/offline status
- `POST /api/dispatch/location` — Courier GPS beacon coordinate update

### Operations Administration (`/api/admin`)
- `GET /api/admin/metrics` — Aggregate ops statistics (active fleet, revenue, margin, SLA)
- `GET /api/admin/partners` — Courier directory with compliance status
- `PUT /api/admin/partners/:partnerId/verify` — Approve, reject, or suspend partner verification
- `GET /api/admin/fleet-live` — Live geospatial telemetry of all online partners and in-flight orders
- `GET /api/admin/disputes` & `PUT /api/admin/disputes/:id` — Incident queue and resolution
- `GET /api/admin/audit-logs` — Immutable administrative event audit trail

### Earnings & Analytics (`/api/earnings`)
- `GET /api/earnings/partner` — Ledger history, daily payout chart data, and verified totals
- `GET /api/earnings/business` — Merchant fulfillment analytics and spend metrics

---

## 8. Placement & Evaluation Highlights

- **No Placeholder Buttons**: Every button, status toggle, filter dropdown, and modal has concrete backend event handling and persistence.
- **Genuine OpenStreetMap Telemetry**: Real coordinates in Midtown Manhattan with interactive pin pickers, custom SVG status markers, and route polyline calculation.
- **Zero Hallucinated Metrics**: Ledger entries and analytics are derived strictly from database records.
- **Production Error Handling**: Centralized Express error handler, secure HTTP headers, sanitization, and graceful database disconnections.

---

© 2026 SwiftFleet Logistics Platform. Built with professional product design and production-grade full-stack engineering.
