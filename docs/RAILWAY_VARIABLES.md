# Railway variables for BauPilot API

Set these in your **API service** in Railway: open the service → **Variables** (or **Settings** → **Variables**).

---

## Required

| Variable        | Where to get it | Example |
|----------------|------------------|---------|
| **DATABASE_URL** | Postgres service in the same project. Open the **Postgres** service → **Variables** or **Connect** → copy the connection URL, or use the **reference** (see below). | `postgresql://postgres:xxxxx@containers-us-west-xxx.railway.app:5432/railway` |

**Using a reference (recommended):**  
In the API service variables, you can reference the Postgres URL so it stays in sync:

- Click **New Variable** or **Add Reference**.
- Choose **Variable** or **Reference**.
- Select the **Postgres** service and the variable **DATABASE_URL** (or **PGURL** / whatever your Postgres plugin exposes).
- Railway will inject the value; it often looks like `${{Postgres.DATABASE_URL}}` in the UI.

---

## Strongly recommended

| Variable     | What to put | Example |
|-------------|-------------|---------|
| **JWT_SECRET** | A long random string (at least 32 characters). Used to sign login tokens. | Generate one: `openssl rand -hex 32` or use a password generator. Example: `a1b2c3d4e5f6...` (64 chars) |
| **NODE_ENV**   | `production` | `production` |

If `JWT_SECRET` is missing, the app falls back to a default value that is not safe for production.

---

## Optional

| Variable        | Default   | When to set |
|-----------------|-----------|-------------|
| **JWT_EXPIRES_IN** | `7d`      | If you want tokens to expire sooner or later (e.g. `24h`, `30d`). |
| **UPLOAD_DIR**     | `./uploads` | Leave unset unless you need a different path (e.g. a volume path). |
| **CORS_ORIGIN**    | (allow all) | Set to your **frontend** URL to restrict CORS, e.g. `https://your-web.up.railway.app`. Comma-separated for multiple. |
| **PORT**           | Set by Railway | Do **not** set manually; Railway sets this. |

---

## Checklist

For the **API** service in Railway, you should have at least:

1. **DATABASE_URL** – from the Postgres service (paste the URL or use the reference).
2. **JWT_SECRET** – your own long random string.
3. **NODE_ENV** – `production`.

Save, then redeploy the API. If it still crashes, open the API service → **Deployments** → latest deploy → **View Logs** and check the error message (e.g. missing `DATABASE_URL`, database connection failed, or Prisma error).
