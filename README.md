# CollectFlow

CollectFlow is a receivables and recovery workspace with creditor, agency, debtor, and platform-admin views. It uses React, Vite, Tailwind CSS, FastAPI, and MongoDB. Dashboard figures come from the connected database; the app does not use sample portfolio numbers as fallbacks.

## Workspace features

- Creditors manage invoices, debtors, payments, documents, reports, and follow-up work. Their dashboard has a pettable cat companion.
- Agencies see assigned mandates and recovery activity, with an octopus companion.
- Debtors use a horizontal portal menu for invoices, payments, plans, disputes, proofs, support, and profile. Their jellyfish stays fixed at the lower-right of the screen, with a glowing bell and softly animated tentacles over translucent ocean waves.
- Platform admins can inspect authorized workspaces in read-only mode; sensitive admin grants and local credentials are not included in this showcase repository.
- Light and dark themes use a violet palette and share the CollectFlow logo.

The role-specific pages live under `dashboard/creditor`, `dashboard/agency`, `dashboard/debtor`, and `dashboard/admin`. Shared navigation, API helpers, and components live under `dashboard/shared`. The sign-in UI and FastAPI service live in `login_register`.

## Netlify deployment

The root `netlify.toml` builds both Vite apps into one Netlify site: sign-in is served from `/`, and dashboards are served under `/dashboard/`. This keeps browser authentication and API calls on one site origin. A generated `_redirects` file sends `/api/*` through Netlify to the hosted FastAPI service. Netlify hosts the static web app; FastAPI and MongoDB must be hosted separately.

1. Push this repository to GitHub and create a Netlify site from the repository. Keep the repository root as the base directory; Netlify reads the build and publish settings from `netlify.toml`.
2. Host `login_register/backend` as a Python web service and MongoDB on MongoDB Atlas (or another reachable MongoDB service). Run `Database/Collectflow_DB.js` against that database to create the collections and indexes.
3. After the API service is reachable, set `COLLECTFLOW_API_URL` in Netlify to its HTTPS origin only, without a path or trailing `/api` (for example, `https://collectflow-api.example.com`), then redeploy. The site build succeeds without this variable, but login and live data need the API; until it is configured, API requests return a clear setup message.
4. Configure these API-service variables:

   - `MONGODB_URI` and `MONGODB_DATABASE`
   - `JWT_SECRET_KEY` as a long, randomly generated value; never commit it
   - `COOKIE_SECURE=true` and `COOKIE_SAMESITE=lax`
   - `FRONTEND_ORIGINS` as the exact Netlify site origin, such as `https://your-site.netlify.app`
   - `FRONTEND_APP_URL` as that same Netlify origin for invitation links
   - SMTP settings if email invitations should be delivered

Netlify's site build uses same-origin `/api` and dashboard URLs. The publish folder is generated at build time and is ignored by Git. Store deployment secrets in Netlify or the API host's environment settings, not in this repository. The app needs valid MongoDB data and a running API for sign-in and live dashboard data; an empty database shows empty states.

## Run locally

1. Start MongoDB and initialize the database with `Database/Collectflow_DB.js`.
2. In `login_register/backend`, copy `.env.example` to `.env`, set a random `JWT_SECRET_KEY` and database URI, install `requirements.txt`, then run `uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`.
3. In `login_register`, copy `.env.example` to `.env`, run `npm ci`, then `npm run dev`.
4. In `dashboard`, copy `.env.example` to `.env`, run `npm ci`, then `npm run dev`.

The login page runs at `http://127.0.0.1:5173`; the dashboard runs at `http://127.0.0.1:5174`. Their Vite servers proxy `/api` to FastAPI on port 8000.

## Repository hygiene

Local `.env` files, virtual environments, `node_modules`, build output, database dumps, and archives are excluded by `.gitignore`. The checked-in `.env.example` files contain only local-development defaults and placeholders.
