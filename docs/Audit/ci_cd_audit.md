# SPOG CI/CD Pipeline Audit & Migration Strategy

**Date:** 2026-07-08  
**Subject:** Migrating from Local Deploy to Automated CI/CD (CEO Concern #3)

---

## 1. Current Deployment Architecture

Currently, the SPOG deployment is entirely localized to the developer's machine using `SETUP/deploy.py`.

### How It Works Today:
1. **Pre-flight Check**: `npm run deploy` invokes `SETUP/check-file-size.mjs` to ensure the 200-line modularity rule is honored.
2. **Build**: Executes `vite build` to compile the TypeScript/CSS assets into a minified `dist/` folder with content hashing.
3. **Data Generation**: Generates manifests (`Routes/**/index.json`) by walking the local filesystem to discover routing definitions.
4. **Synchronization**: Connects over Explicit FTPS using credentials stored in a local `.env` file to upload `dist/` and `Routes/`.
5. **Sweeping & Notification**: Removes retired assets and publishes a retained `SPOG/system/build` MQTT stamp to force all active clients to auto-reload.

### Why It Must Be Deprecated:
* **Security Risk**: FTP credentials exist on developer machines.
* **Lack of Auditability**: Deployments happen arbitrarily without a paper trail or peer-reviewed pull request.
* **Environment Instability**: Local environment discrepancies (Python/Node versions) can cause inconsistent builds.

---

## 2. Proposed CI/CD Architecture (GitHub Actions)

To satisfy the executive mandate, `deploy.py` will be deprecated for manual execution. The deployment process will shift entirely to GitHub Actions (or GitLab CI), establishing a secure, headless pipeline.

### The Pipeline Workflow:
1. **Trigger**: Developer pushes code or merges a PR into a specific branch.
2. **Runner Setup**: An ephemeral Ubuntu runner checks out the repository and sets up Node.js.
3. **Validation**: CI runs `npm install`, `npm run typecheck`, and `npm test` to validate code integrity.
4. **Build & Manifests**: CI executes `npm run build` and a headless script to generate the `Routes/` manifests.
5. **Secure FTPS Sync**: CI uses a secure marketplace action (e.g., `SamKirkland/FTP-Deploy-Action`) to sync the build artifacts and data to the FTP server. Credentials are securely injected via **GitHub Secrets** (`FTP_HOST`, `FTP_USER`, `FTP_PASSWORD`), completely removing them from local machines.
6. **MQTT Stamp**: A lightweight node script triggers the MQTT build stamp post-deploy.

---

## 3. Preserving the Live Test Sandbox

The directive notes that the *test sandbox is still a development system where it can be tested live*. Deprecating the local script does **not** mean losing the sandbox; it means managing the sandbox professionally.

We will achieve this through **Branch-Driven Environments**:

### Environment A: The Sandbox (Development)
* **Trigger**: Any push to the `develop` (or `sandbox`) branch.
* **Target**: Deploys to the sandbox domain (e.g., `sandbox.like.audio` or a `/sandbox` subfolder on the current FTP).
* **Speed**: Optimized for fast iteration. Developers push code, and CI updates the live sandbox within 60 seconds. This allows developers to test cross-device behavior live without running a local tunnel.

### Environment B: Production (Enterprise Tier)
* **Trigger**: Merging into the `main` branch or pushing a Git Tag (e.g., `v1.0.8`).
* **Target**: Deploys to the production domain (`spog.like.audio`).
* **Approval Gate**: Requires an approved PR and passing test suites before the deployment runs.

---

## 4. Execution Plan

If approved, the migration will follow these steps:

1. **Extract Manifest Logic**: Split the manifest generation out of `deploy.py` into a standalone Node.js script (`SETUP/generate-manifests.mjs`) so the CI doesn't require a Python environment.
2. **Create Workflows**: Write `.github/workflows/deploy-sandbox.yml` and `.github/workflows/deploy-production.yml`.
3. **Configure Secrets**: Add the FTP deployment credentials to the repository secrets.
4. **Deprecate Local Script**: Replace `npm run deploy` in `package.json` with an echo warning: `"deploy": "echo 'Error: Local deploy is deprecated. Push to the sandbox branch to deploy.' && exit 1"`.
