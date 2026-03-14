# Deploy BauPilot on Railway

You can run the full app (API + frontend + PostgreSQL) on [Railway](https://railway.app/) without running anything heavy on your laptop. Railway has a free tier that’s enough for this MVP.

---

## Overview

- **PostgreSQL**: Railway add-on (managed database).
- **API**: Node.js service (Fastify), connects to Postgres.
- **Web**: Static React app built with Vite, served by Railway.

You’ll create **one Railway project** with **three services**: PostgreSQL, API, Web.

---

## Step 1: Create a Railway project and add PostgreSQL

1. Go to [railway.app](https://railway.app/) and sign in (GitHub/GitLab).
2. Click **New Project**.
3. Choose **Deploy PostgreSQL** (or **Add Plugin** → **PostgreSQL**).
4. Wait until PostgreSQL is provisioned. Open the Postgres service → **Variables** (or **Connect**). Copy the **`DATABASE_URL`** (or note `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGPORT`, `PGDATABASE`; Railway often exposes `DATABASE_URL` directly).

Keep this tab open; you’ll need `DATABASE_URL` for the API.

---

## Step 2: Deploy the API

1. In the same project, click **New** → **GitHub Repo** (or **GitLab** if you use GitLab).
2. Select your **normaplan** (or **baupilot**) repo.
3. Railway will add a new service from that repo. We’ll configure it as the API.

**Configure the API service – use the Dockerfile (recommended):**

4. Open the new service → **Settings**.
5. Under **Build**, set **Dockerfile Path** to: `Dockerfile.api`  
   (and leave **Root Directory** empty so the repo root is used).
6. Railway will then **build from the Dockerfile** (no separate Build/Start commands needed). The Dockerfile installs deps, builds `@baupilot/types` and `@baupilot/rule-engine`, then the API, and runs `node dist/index.js`.
7. **Variables** – add (use the Postgres service’s values):
   - `DATABASE_URL` = (paste the full URL from the Postgres service, e.g. `postgresql://user:pass@host:port/railway`)
   - `JWT_SECRET` = a long random string (e.g. generate with `openssl rand -hex 32`)
   - `NODE_ENV` = `production`

   If your Postgres service exposes a **Reference** (e.g. `${{Postgres.DATABASE_URL}}`), you can use that for `DATABASE_URL` so it stays in sync.

9. Save and deploy. After deploy, open the API service → **Settings** → **Networking** → **Generate Domain**. Copy the public URL (e.g. `https://your-api-name.up.railway.app`). You’ll need it for the frontend.

**If you prefer not to use the Dockerfile:** set **Root Directory** to empty, **Build Command** to `pnpm install && pnpm run build:packages && pnpm --filter api build`, and **Start Command** to `pnpm --filter api start`. If the build still fails (e.g. “Cannot find module '@baupilot/types'”), switch to the Dockerfile method above.

**Migrations:** The Docker image runs `prisma migrate deploy` automatically on every start. You don’t need to run any commands manually—just set `DATABASE_URL` and deploy.

---

## Step 3: Deploy the Web (frontend)

The frontend must be built with the API URL and then served. You have two options.

### Option A: Second service in the same Railway project (recommended)

1. In the **same** Railway project, click **New** → **GitHub Repo** again and select the **same** repo.
2. A second service is created. Configure it as the **Web** app:

**Settings:**

3. **Root Directory**: leave empty (repo root).
4. **Build Command**:
   ```bash
   pnpm install && pnpm run build:packages && pnpm --filter web build
   ```
5. **Start Command**:
   ```bash
   pnpm --filter web start
   ```
6. **Variables** (important):
   - `VITE_API_URL` = your API’s public URL from Step 2 (e.g. `https://your-api-name.up.railway.app/api`)

   Use **exactly** the API base URL including `/api` if your API is mounted at `/api`, or the root of the API (e.g. `https://your-api-name.up.railway.app`) if the API serves routes at root. Our API uses `/api` prefix, so use:
   - `VITE_API_URL` = `https://YOUR-API-DOMAIN.up.railway.app/api`

7. **Networking**: Generate a domain for this service so you get a URL like `https://your-web-name.up.railway.app`.

8. Redeploy after setting `VITE_API_URL` so the build picks it up.

**Important:** Use **Build Command** to produce the production bundle (`pnpm --filter web build`), and **Start Command** `pnpm --filter web start` to serve it. Do **not** run `vite` or `pnpm run dev` in production—that runs the dev server on 5173 and is not exposed. The start script serves the built `dist/` on **0.0.0.0:PORT** so Railway can route traffic to it.

### Option B: Frontend on Vercel / Netlify

1. Push your repo to GitHub/GitLab if it isn’t already.
2. In [Vercel](https://vercel.com) or [Netlify](https://netlify.com), create a new project from the same repo.
3. **Root directory**: set to the repo root (or the folder that contains `apps/web` and the monorepo root; Vercel/Netlify often need the root so they can run the right install/build).
4. **Build command** (example for Vercel/Netlify at repo root):
   ```bash
   pnpm install && pnpm run build:packages && pnpm --filter web build
   ```
5. **Output / publish directory**: `apps/web/dist`.
6. **Environment variable**: `VITE_API_URL` = `https://YOUR-API-RAILWAY-URL/api` (the same API URL from Step 2).
7. Deploy. The site will call the Railway API using `VITE_API_URL`.

---

## Step 4: CORS (if the API rejects requests from the frontend)

If the frontend is on a different domain (e.g. `your-web.up.railway.app` or Vercel), the API must allow that origin. By default the API allows any origin (`origin: true`), so it should work. To restrict to your frontend only, add in the API service:

- `CORS_ORIGIN` = `https://your-web-domain.up.railway.app`

For multiple origins use a comma-separated list. If you see CORS errors, double-check the API URL and that the frontend’s `VITE_API_URL` matches the API domain (including `https://`).

---

## Checklist

- [ ] PostgreSQL added and `DATABASE_URL` copied.
- [ ] API service: Dockerfile path `Dockerfile.api`, variables `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`.
- [ ] Migrations run automatically on container start (no manual step).
- [ ] API domain generated and URL noted.
- [ ] Web service: same repo, build/start as in Step 3, variable `VITE_API_URL` = `https://YOUR-API-URL/api`.
- [ ] Web domain generated. Open the web URL, register, create a project, upload `docs/sample-plan.json`, run a check.

---

## Deployment crashed after successful build

If the API build succeeds but the service then **crashes** or restarts:

1. **Check the logs**  
   In Railway: open the API service → **Deployments** → click the latest deployment → open **View Logs** (or the **Logs** tab). The app now logs clear errors on startup.

2. **Most common causes**

   - **`DATABASE_URL` not set or wrong**  
     The API exits with `FATAL: DATABASE_URL environment variable is not set` or fails to connect. Fix: In the API service → **Variables**, set `DATABASE_URL` to the Postgres connection string (from the Postgres service → Variables or Connect). Use the **reference** (e.g. `${{Postgres.DATABASE_URL}}`) if available so it stays in sync.

   - **Migrations not applied**  
     You see a Prisma error like “relation does not exist” or “table … does not exist”. The image runs `prisma migrate deploy` on start; if it still fails, check that `DATABASE_URL` is set and the deploy finished (see logs). You can run migrations once manually with [Railway CLI](https://docs.railway.app/develop/cli): `railway run pnpm --filter api exec prisma migrate deploy`.

   - **Database not reachable**  
     Railway Postgres is only reachable from within Railway. Ensure `DATABASE_URL` is the one Railway provides for the Postgres service in the same project (not a local or other external URL).

3. **Redeploy** after changing variables or running migrations.

---

## Build taking a long time

The first build can take several minutes because `pnpm install` resolves the full dependency tree without a lockfile. To speed up future builds:

1. Locally run `pnpm install` so that `pnpm-lock.yaml` is created.
2. Commit and push `pnpm-lock.yaml`.
3. In `Dockerfile.api`, add before `RUN pnpm install`:  
   `COPY pnpm-lock.yaml ./`  
   and change that line to:  
   `RUN pnpm install --frozen-lockfile`

Then Railway can reuse the install layer when only your code changes.

---

## If the API build fails

- Ensure **Root Directory** is empty (repo root) so `pnpm install` sees the whole monorepo and workspace packages.
- Ensure **Build Command** includes `pnpm run build:packages` so `@baupilot/types` and `@baupilot/rule-engine` are built before the API build.

---

## Cost

Railway’s free tier usually includes a small amount of usage. PostgreSQL + two services may exceed the free tier over time; check [Railway pricing](https://railway.app/pricing). You can also deploy only the **API + PostgreSQL** on Railway and run the frontend locally (set `VITE_API_URL` to your Railway API URL) to save resources.
