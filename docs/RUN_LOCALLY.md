# Run BauPilot locally – step by step

Follow these steps in order. You need **Node.js 20+**, **pnpm**, and **PostgreSQL** installed.

---

## Step 1: Check prerequisites

Open a terminal (PowerShell or Command Prompt) and run:

```bash
node -v
```
You should see **v20** or higher. If not, install Node.js from [nodejs.org](https://nodejs.org/) (LTS).

```bash
pnpm -v
```
If `pnpm` is not found, install it:

```bash
npm install -g pnpm
```

**PostgreSQL** must be installed and running:

- Windows: [PostgreSQL downloads](https://www.postgresql.org/download/windows/) or use a portable/portable install.
- Make sure the PostgreSQL service is running (default port **5432**).

---

## Step 2: Open the project and install dependencies

Navigate to the project folder:

```bash
cd c:\Projects\normaplan
```

Install all dependencies (root + apps + packages):

```bash
pnpm install
```

Wait until it finishes without errors.

---

## Step 3: Create the database (PostgreSQL)

Create an empty database named `baupilot` (or another name you will use in the next step).

**Option A – Using psql (if in PATH):**

```bash
psql -U postgres -c "CREATE DATABASE baupilot;"
```
(Use the user/password you set when installing PostgreSQL.)

**Option B – Using pgAdmin or another GUI:**

1. Connect to your PostgreSQL server.
2. Create a new database named `baupilot`.

**Option C – If PostgreSQL is already running and you know your username/password:**

```bash
psql -U YOUR_USERNAME -d postgres -c "CREATE DATABASE baupilot;"
```

Replace `YOUR_USERNAME` with your PostgreSQL username.

---

## Step 4: Configure environment variables

Copy the example env file into `.env`:

**PowerShell (Windows):**
```powershell
Copy-Item apps\api\.env.example apps\api\.env
```

**Git Bash / Linux / macOS:**
```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps\api\.env` and set **at least** `DATABASE_URL` to match your PostgreSQL setup:

```
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/baupilot"
```

Replace:
- `USERNAME` – your PostgreSQL username (e.g. `postgres`)
- `PASSWORD` – your PostgreSQL password
- `baupilot` – database name (same as in Step 3)

Example:
```
DATABASE_URL="postgresql://postgres:mypassword@localhost:5432/baupilot"
```

Save the file.

---

## Step 5: Run database migrations

From the **project root** (`c:\Projects\normaplan`):

```bash
pnpm db:migrate
```

When prompted for a migration name, you can press Enter to accept the default, or type e.g. `init`.

You should see something like:
- `Prisma schema loaded`
- `Applying migration ...`
- `Generated Prisma Client`

If you get a connection error, double-check `DATABASE_URL` in `apps\api\.env` and that PostgreSQL is running.

---

## Step 6: Start the app

Still in the project root:

```bash
pnpm dev
```

This will:
1. Build the shared packages (`@baupilot/types`, `@baupilot/rule-engine`).
2. Start the **API** (port 3001).
3. Start the **web app** (port 5173).

Wait until you see both servers running. You should see something like:

- `BauPilot API listening on http://localhost:3001`
- Vite dev server running at `http://localhost:5173`

---

## Step 7: Open the app in the browser

1. Open: **http://localhost:5173**
2. Click **Registrieren** (Register).
3. Enter email and password (min. 8 characters), then **Registrieren**.
4. You should be logged in and see the **Projekte** (Projects) page.

---

## Step 8: Try a plan check (MVP)

1. In **Projekte**, enter a project name (e.g. `Test`) and click **Projekt anlegen**.
2. Open the new project.
3. Under **Plan hochladen**, choose a file:
   - Use the sample plan: **`docs/sample-plan.json`** (in the project folder).
4. After upload, open the plan from the list.
5. Click **Prüflauf starten**.
6. You should see a report with possible violations (e.g. corridor width, door width, escape route length).

---

## Troubleshooting

| Problem | What to do |
|--------|------------|
| `pnpm` not found | Run `npm install -g pnpm`, then try again. |
| `node` not found or version &lt; 20 | Install Node.js 20+ from nodejs.org. |
| Database connection error | Check PostgreSQL is running, and `DATABASE_URL` in `apps\api\.env` (user, password, host, port, database name). |
| Port 3001 or 5173 already in use | Stop the other app using that port, or change `PORT` in `apps\api\.env` and the Vite port in `apps\web\vite.config.ts`. |
| Migration fails | Ensure the database exists and the user has rights to create tables. |
| “Plan extraction not ready” | For MVP you must upload a **JSON** file (e.g. `docs/sample-plan.json`), not only a PDF. |

---

## Optional: Run API and web separately

- **API only:** `pnpm dev:api` (from project root).
- **Web only:** `pnpm dev:web` (from project root).  
  The web app proxies `/api` to `http://localhost:3001`, so the API should be running for full functionality.

---

## Optional: Open Prisma Studio (database UI)

```bash
pnpm db:studio
```

Opens a browser UI to view and edit database tables (users, projects, plans, runs, etc.).
