# CEO Concerns & Executive Verdict Audit

**Date:** 2026-07-08
**Subject:** Executive review of SPOG (Single Pane Of Glass) and action plan for non-negotiable milestones to reach enterprise readiness.

## Executive Summary
The SPOG platform demonstrates brilliant visual innovation and modular frontend architecture. However, recent executive reviews have identified critical vulnerabilities in security, scalability, and deployment practices that prevent commercial viability. This document outlines the action plan to address the CEO's three non-negotiable milestones, alongside the CFO's financial and licensing concerns, moving the project from a "life support" proof-of-concept to a secure, enterprise-ready product.

---

## 1. Backend Authority Migration

**The Concern:** 
Access control is currently handled entirely on the client-side via progressive disclosure (`can(cap)`, `applyScope()`, `data-cap`). An attacker with browser dev tools can bypass these checks, revealing controls to manipulate live broadcast signals.

**Action Plan:**
*   **Introduce an API Gateway / Backend Middleware:** We must move away from pure static JSON serving for sensitive operations. Introduce a lightweight, secure backend (e.g., Node.js/Express, Go, or a serverless equivalent) to act as the true authority.
*   **Token-Based Authentication (JWT):** Implement proper authentication issuing JWTs.
*   **Server-Side Capability Validation:** The backend must intercept and validate all control requests (e.g., routing a source to a destination, editing a layout) against the user's verified role before issuing the MQTT command to hardware.
*   **Data Minimization:** The initial payload sent to the client should only include data and configuration for the tools the user is authorized to use.

---

## 2. Modernize the Deployment Pipeline

**The Concern:**
Deployment currently relies on a manual Python script (`deploy.py`) that reads plain-text passwords from a local `.env` file to push artifacts via FTPS. This is a severe security risk and a bottleneck for scaling development.

**Action Plan:**
*   **Deprecate `deploy.py`:** Phase out the local deployment script entirely.
*   **Implement CI/CD (GitHub Actions / GitLab CI):** Create automated workflows triggered on merges to the `main` or `production` branch.
*   **Automated Testing & Build:** The pipeline must automatically run `npm run typecheck`, run unit tests, and execute `vite build`.
*   **Secure Secrets Management:** Store FTP credentials, or preferably S3/Object Storage access keys, securely within the CI/CD platform's secret vault.
*   **Object Storage Deployment:** Transition hosting from the traditional FTP server to an automated Object Storage bucket (e.g., AWS S3, Cloudflare R2) fronted by a CDN for high availability and security.

---

## 3. Enterprise Telemetry Offloading & Animation Performance

**The Concern:**
Heavy DOM manipulation and continuous CSS animations (e.g., the 20s linear infinite DNA helix) will cripple browser performance on a large-scale matrix. Additionally, high-frequency telemetry via an unauthenticated, hardcoded MQTT websocket threatens to inflate bandwidth costs and overwhelm clients.

**Action Plan:**
*   **Animation Degradation Strategy:** Implement a performance tiering system. 
    *   Detect hardware capability or offer a "Low Power Mode" toggle.
    *   Replace continuous CSS `stroke-dashoffset` animations with static, color-coded lines or highly optimized WebGL/Canvas renders on low-power devices.
*   **Telemetry Throttling & Batching:** Instead of blasting raw, unthrottled hardware heartbeats directly to the client, introduce a telemetry aggregator on the backend.
    *   Batch state changes and push them to the client at a controlled tick rate (e.g., 10fps or 5fps).
*   **Secure MQTT Websockets:** Migrate the MQTT broker away from the hardcoded `guest/guest` port 9001 setup. Implement robust ACLs (Access Control Lists) on the broker tied to the new JWT authentication system.

---

## 4. Licensing and Commercial Path (CFO Concern)

**The Concern:**
The current `LICENSE.md` explicitly prohibits commercial and broadcast use, capping the Total Addressable Market (TAM) at zero and preventing any margin generation.

**Action Plan:**
*   **License Restructuring:** Develop a dual-licensing model.
    *   *Community/Personal:* Maintain a restricted license for hobbyists.
    *   *Enterprise/Commercial:* Create a paid, commercial license tier that permits broadcast use, backed by SLAs and support contracts.
*   **Access Tiering:** Ship the open version with the static JSON architecture, but reserve the newly developed Backend Authority and CI/CD modules as closed-source Enterprise features.
