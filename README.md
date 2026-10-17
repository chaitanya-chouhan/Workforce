# WorkForce — AI-Powered Local Service Platform
### Utilizing Google Gemma 4 and Firebase Spark

WorkForce is an AI-powered local service platform that bridges household service needs with verified, local service professionals. By combining the official **Google Gemma 4** model (`@google/genai`) for multimodal problem interpretation with **Firebase Authentication** and **Cloud Firestore**, WorkForce provides honest diagnostics, transparent sample rate estimations, and cryptographic customer-controlled OTP job verification.

---

## 1. System Architecture

```
                                  +-----------------------------+
                                  |   React + Vite Frontend     |
                                  |   (Tailwind CSS, TS)        |
                                  +--------------+--------------+
                                                 |
                       +-------------------------+-------------------------+
                       | Firebase Client Auth                              | REST API (Bearer ID Token)
                       v                                                   v
         +-----------------------------+                     +-----------------------------+
         |   Firebase Authentication   |                     |     Express Backend         |
         |   (Email / Password)        |                     |     (TypeScript, Node.js)   |
         +-----------------------------+                     +--------------+--------------+
                                                                            |
                                 +------------------------------------------+------------------------------------------+
                                 |                                          |                                          |
                                 v                                          v                                          v
                   +---------------------------+              +---------------------------+              +---------------------------+
                   |  Google GenAI (Gemma 4)   |              |  Firebase Admin SDK       |              |  Deterministic Safety     |
                   |  - gemma-4-26b-a4b-it     |              |  - Cloud Firestore        |              |  - Gas Leak / Electrical  |
                   |  - In-Memory Temp Image   |              |  - Atomic Transactions    |              |  - Prohibit Unsafe DIY    |
                   +---------------------------+              +---------------------------+              +---------------------------+
```

---

## 2. Key Capabilities

1. **Multimodal Problem Interpretation with Gemma 4**: Customers describe problems in natural, conversational English and can optionally upload a photo. Gemma 4 analyzes the symptoms, suggests possible causes with likelihood indicators, notes uncertainty, and recommends the required trade skills.
2. **Deterministic Safety Gate**: Potentially dangerous issues (gas leaks, live electrical sparks, burning wires, structural cracks) trigger conservative backend safety rules before model output is rendered, restricting DIY instructions and mandating emergency precautions.
3. **Transparent Sample Rate Cards**: Approximate estimates are computed deterministically from Firestore rate cards (Base Labour + Travel + Materials) in Indian Rupees (₹) with clear disclaimers.
4. **Customer-Generated OTP Assignment**:
   - The customer selects a verified worker and clicks **Generate Assignment OTP**.
   - The backend cryptographically generates a 6-digit numeric OTP and stores only its salted SHA-256 hash.
   - The customer shares the code with the worker on site.
   - The worker enters the OTP to confirm assignment atomically via Firestore transactions.
5. **Zero Cloud Storage Cost**: Uploaded images are held in server memory (`Multer.memoryStorage`) solely for the duration of the Gemma 4 API call and are never permanently persisted, preserving the free Firebase Spark tier.
6. **Role-Based Workflows**: Independent dashboards for **Customer**, **Worker** (with real-time Availability Toggle), and **Admin** (worker verification and rate card management).

---

## 3. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, React Router, Tailwind CSS, Lucide Icons, Firebase JS SDK.
- **Backend**: Node.js, Express, TypeScript, Firebase Admin SDK, Google GenAI SDK (`@google/genai`), Zod, Multer.
- **AI Model**: Candidate model `gemma-4-26b-a4b-it` (configurable via `GEMMA_MODEL` env variable).
- **Database & Auth**: Google Cloud Firestore, Firebase Authentication.
- **Testing**: Vitest test runner.

---

## 4. Prerequisites

- **Windows 10 / 11** with PowerShell.
- **Node.js** (v18+ or v20+ recommended).
- **Google AI Studio API Key** (for Gemma 4): [https://aistudio.google.com/](https://aistudio.google.com/)
- **Firebase Account** on the free Spark plan: [https://console.firebase.google.com/](https://console.firebase.google.com/)

---

## 5. Step-by-Step Firebase & Setup Guide

### Step 1: Firebase Project Setup

1. Open the [Firebase Console](https://console.firebase.google.com/) and click **Add project**.
2. Name your project (e.g. `workforce-platform`).
3. Disable or enable Google Analytics (optional), then click **Create project**.

### Step 2: Enable Firebase Authentication

1. In your Firebase Console, navigate to **Build** -> **Authentication**.
2. Click **Get started**.
3. Under the **Sign-in method** tab, click **Email/Password**.
4. Enable the first toggle (**Email/Password**). Leave Email link (passwordless sign-in) disabled.
5. Click **Save**.

### Step 3: Create Cloud Firestore Database

1. In the console left sidebar, navigate to **Build** -> **Firestore Database**.
2. Click **Create database**.
3. Choose Database ID `(default)` and select standard edition.
4. Select location: **Mumbai (`asia-south1`)** or your nearest region.
5. Select **Start in production mode** (or test mode, but production rules are provided in `firestore.rules`).
6. Click **Enable**.

### Step 4: Register React Web App (Frontend Configuration)

1. In Project Overview, click the Web icon (`</>`) to add an app.
2. Enter App nickname: `WorkForce Web`. Do not check Firebase Hosting.
3. Click **Register app**.
4. Copy the `firebaseConfig` keys into `frontend/.env`:

```env
VITE_FIREBASE_API_KEY=AIzaSyYourActualApiKey...
VITE_FIREBASE_AUTH_DOMAIN=workforce-platform.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=workforce-platform
VITE_FIREBASE_STORAGE_BUCKET=workforce-platform.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef123456
VITE_API_URL=http://localhost:5000/api
```

### Step 5: Configure Firebase Admin SDK (Backend Configuration)

1. In the Firebase Console, click the **Gear icon (Project settings)** -> **Service accounts** tab.
2. Under "Firebase Admin SDK", select **Node.js**.
3. Click **Generate new private key**, then click **Generate key**.
4. Rename the downloaded JSON file to `serviceAccountKey.json`.
5. Place this file inside the `backend/` directory:
   `WorkForce/backend/serviceAccountKey.json`
   *(Note: This file is already added to `.gitignore` and is never committed).*
6. In `backend/.env`, set your project ID and Google AI Studio key:

```env
PORT=5000
FRONTEND_ORIGIN=http://localhost:5173
FIREBASE_PROJECT_ID=workforce-platform
GOOGLE_API_KEY=your_google_ai_studio_api_key_here
GEMMA_MODEL=gemma-4-26b-a4b-it
```

---

## 6. Installation & Execution Guide (PowerShell)

Open two PowerShell terminal windows:

### Terminal 1: Backend

```powershell
# Navigate to backend
cd c:\Users\Chaitanya\OneDrive\Desktop\WorkForce\backend

# Run automated test suite
npm test

# Seed initial skills and sample rate cards to Firestore
npm run seed

# Start development backend
npm run dev
```

*The backend will start at `http://localhost:5000`.*
*Health Check endpoint: `http://localhost:5000/api/health`*

### Terminal 2: Frontend

```powershell
# Navigate to frontend
cd c:\Users\Chaitanya\OneDrive\Desktop\WorkForce\frontend

# Start Vite development server
npm run dev
```

*Open your browser at `http://localhost:5173`.*

---

## 7. Granting Administrator Privileges

Public registration restricts users to **Customer** or **Worker** roles to prevent privilege escalation.
To grant an account administrator privileges:

1. Register an account through the web app (e.g., `admin@workforce.local`).
2. Run the secure server-side seed script from the backend directory:

```powershell
npm run seed:admin admin@workforce.local
```

3. Sign out and sign back in to access the `/admin` console.

---

## 8. Verification & Test Suite

The project includes unit and integration tests covering:
- Cryptographic OTP generation, salted SHA-256 hashing, timing-safe verification, expiration, and attempt limits.
- Deterministic safety gate evaluation (gas leaks, electrical sparks, structural damage).
- Worker matching and multi-factor scoring (skills, availability, locality, rating, and capacity).
- Rate-card calculations and INR formatting.
- Gemma 4 Zod schema validation and missing API key error handling.

To run tests:
```powershell
cd backend
npm test
```

---

## 9. Security Considerations

- **No Plaintext OTPs**: OTPs are generated on the server and hashed immediately with a server-side salt. Only the hash is stored in Firestore.
- **Timing-Safe Comparison**: `crypto.timingSafeEqual` prevents side-channel timing attacks during OTP validation.
- **Atomic State Transitions**: Firestore transactions guarantee that concurrent attempts cannot double-assign an exclusive task.
- **Production Firestore Security Rules**: `firestore.rules` prohibits clients from modifying roles, verification status, or reading sensitive OTP hashes.
- **Zero Cloud Storage Persistence**: Images are passed as memory buffers to the Gemma 4 API and garbage-collected immediately.
