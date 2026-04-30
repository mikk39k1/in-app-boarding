# Architecture Decision Record (ADR): In-App Product Onboarding Platform

## 1. Title and Context
**System:** In-App Product Onboarding Platform (SDK + Dashboard)
**Status:** Proposed / Active
**Date:** April 2026

**Context:** We are building a product adoption and onboarding platform. The core value proposition is a "one-time developer install" via an npm SDK, after which marketing, product, or commercial teams can visually construct, edit, and publish onboarding flows directly on top of their live application without requiring code changes. 

To achieve this, we need a robust, environment-aware SDK, a secure authentication handshake to launch a visual builder overlay on client sites, and an incredibly resilient system for targeting dynamic DOM elements across various modern web frameworks.

---

## 2. Technical Stack Decisions

### 2.1 Core Infrastructure & Monorepo
* **Decision:** Use **TypeScript** within a **Turborepo** monorepo.
* **Reasoning:** A monorepo ensures that database schemas, API response types, and SDK configuration types are shared flawlessly between the backend, dashboard, and client-side SDK. TypeScript enforces strict type safety across the entire surface area.

### 2.2 Dashboard & Backend
* **Decision:** Use **Next.js (App Router)** as the unified frontend and backend (via API routes).
* **UI Components:** **ShadCN UI** paired with Tailwind CSS for rapid, accessible, and clean dashboard development.
* **Reasoning:** Minimizes the number of deployed services. Next.js API routes are perfectly capable of handling the REST/GraphQL endpoints required by the SDK.

### 2.3 Database & Authentication
* **Decision:** **Supabase** (PostgreSQL, Auth, RLS) + **Prisma ORM**.
* **Reasoning:** Supabase provides an enterprise-ready PostgreSQL instance with built-in Auth and Row Level Security. Prisma offers exceptional developer ergonomics and type-safety. (Requires Supavisor connection pooling for serverless environments).

---

## 3. SDK Architecture & The Builder Overlay

### 3.1 CSS Isolation (Preventing Style Bleed)
* **Decision:** The SDK must inject the Builder UI and End-User Tooltips using the **Shadow DOM**.
* **Reasoning:** Client applications have unpredictable global CSS. Shadow DOM encapsulates the SDK's styles, ensuring the client's CSS does not corrupt the Builder UI, and the Builder's CSS does not break the client application.

### 3.2 Secure Builder Handshake (Authentication)
* **Decision:** Implement a URL-Token-to-JWT exchange mechanism.
* **Flow:**
  1. Marketing user logs into the Next.js Dashboard.
  2. User clicks "Edit Flow" for a specific environment.
  3. Dashboard redirects user to the configured App URL (e.g., `https://clientapp.com/` or `http://localhost:3000/`) with a short-lived token: `?builder_token=xyz123`.
  4. The SDK initializes, intercepts the `builder_token`, and calls the Next.js backend.
  5. The backend validates the token and returns an in-memory **JWT**.
  6. SDK uses the JWT as a `Bearer` token for all subsequent configuration API calls and injects the Builder Shadow DOM.
* **Reasoning:** Circumvents third-party cookie blocking mechanisms in modern browsers (like Safari's ITP) while keeping the overlay highly secure.

---

## 4. Element Targeting & Anchoring Engine

### 4.1 Heuristic Element Profiling System
* **Decision:** Instead of saving a single CSS selector, the Builder will record a "profile" of an element and use a cascading fallback mechanism during execution.
* **Targeting Hierarchy (Priority 1 to 5):**
  1. **Custom Data Attributes:** `[data-onboarding="save-btn"]` (The gold standard, encouraged in docs).
  2. **Stable IDs:** `#submit-checkout`
  3. **Accessibility / Semantic:** `button[aria-label="Save Profile"]`
  4. **Inner Text:** `button:contains("Save")`
  5. **Structural DOM Path:** `div > main > form > button:nth-child(2)` (Highly brittle fallback).

### 4.2 Positioning Engine
* **Decision:** Use **Floating UI** (formerly Popper.js).
* **Reasoning:** Offloads the complex mathematics of viewport boundaries, scroll contexts, and dynamic layout shifts to an industry-standard library to prevent tooltip "drift".

### 4.3 Handling Dynamic SPAs (React/Vue/Angular)
* **Decision:** Utilize the browser's native **`MutationObserver`** API.
* **Reasoning:** Elements required for onboarding steps may not exist on initial page load (e.g., inside unclicked dropdowns or behind loading states). The SDK will observe the DOM and attach the tooltip instantly once the target element renders.

---

## 5. Environments and Localhost Development

### 5.1 Environment Isolation (The "Stripe Model")
* **Decision:** Issue distinct API Keys for Development (`dev_xxx`) and Production (`prod_xxx`).
* **Reasoning:** Database entities (Flows, Analytics, Users) will be strictly partitioned by environment keys. This ensures developers can safely test the SDK locally without polluting production metrics or overwriting live flows.

### 5.2 Localhost Detection & Warnings
* **Decision:** SDK must perform origin checks (`window.location.hostname`).
* **Implementation:** * If `localhost` is detected using a `prod_` key, throw a loud console error/warning.
  * If `localhost` is detected using a `dev_` key, enable verbose Debug Mode for developers.

### 5.3 Localhost Dashboard Routing & CORS
* **Decision:** Allow users to define distinct Base URLs for Dev and Prod in their Dashboard settings (e.g., `Prod URL = https://app.com`, `Dev URL = http://localhost:3000`). 
* **CORS Configuration:** The Next.js API backend must explicitly allow cross-origin requests from `http://localhost:*` combined with the Bearer JWT auth to enable a seamless local builder experience.
