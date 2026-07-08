# SPOG Enterprise Turnaround Strategy

To successfully rescue the SPOG project and meet the CEO's milestones, we need a phased, risk-mitigated approach. This strategy ensures we do not break the existing "magic" of the UI while fundamentally replacing its brittle foundations.

## Phase 1: Securing the Core (Backend Authority)
**Goal:** Prevent unauthorized client-side manipulation.
**Timeline:** Weeks 1-3

1.  **Select the Backend Stack:**
    *   *Recommendation:* **Node.js with Express/Fastify**. This allows us to share TypeScript models and types (`src/model/index.ts`) directly between the frontend and backend, ensuring the `EditorPlugin` contracts remain strictly typed across the wire.
2.  **API Gateway Implementation:**
    *   Replace `listDirectory` and `fetchJSON` calls (which currently hit static files directly) with authenticated API routes (e.g., `GET /api/v1/routes`).
    *   The backend will serve as the single source of truth, reading the `Routes/` folder on the server and serving it down to the client.
3.  **True Role-Based Access Control (RBAC):**
    *   *Note:* Initial implementation will use a **simple mock-up for authentication** to maintain momentum.
    *   Despite the mock auth, the privileges will strictly hide the abstraction at the backend layer. If a user mode lacks rights, the backend will completely withhold the sensitive data/endpoints from the payload, rather than relying on client-side CSS. This ensures a true security foundation that is easy to fully lock down with real JWTs in the future.

## Phase 2: Telemetry & Performance Optimization
**Goal:** Prevent browser crashes at scale and reduce bandwidth costs.
**Timeline:** Weeks 4-5

1.  **MQTT Middleware Aggregator:**
    *   Instead of the client subscribing to raw hardware feeds, the Node.js backend will maintain the primary connection to the hardware matrix.
    *   The backend will debounce and aggregate state changes, pushing a clean, throttled state patch to the clients over WebSockets (e.g., via Socket.io or an authenticated MQTT bridge) at a maximum of 10-15 Hz.
2.  **Adaptive UI Degradation:**
    *   Introduce a global `PerformanceObserver` in the frontend.
    *   If framerates drop below 30fps due to the SVG DNA helix animations, automatically swap the `animation: flow` classes for static, low-impact dashed lines. 
    *   Provide a manual "Hardware Acceleration" toggle in the operator's settings menu.

## Phase 3: CI/CD & Infrastructure Modernization
**Goal:** Eliminate manual, vulnerable deployment scripts.
**Timeline:** Week 6

1.  **Deprecate `deploy.py`:**
    *   *Note:* The current `deploy.py` and `.env` scripts will be retained strictly as **scaffolding** to inform future automated builds and local testing.
2.  **Automated Pipeline (GitHub Actions):**
    *   Create a `.github/workflows/deploy.yml` pipeline.
    *   **CI:** On Pull Request, run `npm run typecheck`, linting, and unit tests.
    *   **CD:** On merge to `main`, securely build the Vite bundle and push the static assets to an S3/Cloudflare R2 bucket.
3.  **Containerize the Backend:**
    *   Package the new Node.js backend and MQTT broker into Docker containers for reliable, scalable deployment.

## Phase 4: Commercial Licensing Pivot
**Goal:** Uncap the Total Addressable Market (TAM).
**Timeline:** Ongoing

1.  **Dual Licensing Model:**
    *   Retain the current repository as the **Community Edition** (personal use, static JSON discovery, no backend validation).
    *   Fork a private **Enterprise Edition** repository that contains the new Node.js backend, CI/CD pipelines, and secure MQTT bridge. This version will carry a commercial broadcast license.

---
> [!TIP]
> **Immediate Next Step:** To maintain momentum, we should begin by setting up the **Node.js Backend Authority** (Phase 1). This is the most critical security concern and sets the foundation for the rest of the changes.

**Do you approve of this phased approach? If so, we can immediately begin scaffolding the Node.js backend in a new directory.**
