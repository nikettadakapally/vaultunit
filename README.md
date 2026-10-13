# VaultUnit

VaultUnit is a personal finance and expense tracker with a React dashboard and a separate Spring Boot REST API. Create an account or sign in to view your private dashboard; each account has its own transactions.

## Project layout

- `frontend/` — React and Vite web application
- `backend-new/` — Java 17 / Spring Boot API project (import this folder into Spring Tools)
- `backend/` — default H2 database directory, created by the API when it starts if needed
- `.vscode/tasks.json` — starts both development servers when this workspace opens in VS Code

## Run the project

1. Install Node.js 20 or newer and a Java 17 JDK.
2. Run `npm install` once from `frontend/` to install the web app dependencies.
3. Open the project root (`VaultUnit`) in VS Code and trust the workspace. Allow the **VaultUnit: start on folder open** task when prompted. It starts the frontend and the backend in the background.
4. Open <http://127.0.0.1:5173> in your browser.

For a first-time manual frontend setup, run `npm run install:frontend` from the project root (or `npm install` in `frontend/`). You can then start the frontend with `npm run dev` from the project root, or from `frontend/`. The replacement backend uses the included Maven Wrapper; run `.\mvnw.cmd spring-boot:run` from `backend-new/`. The wrapper downloads Maven on its first run.

The frontend proxies `/api` calls to Spring Boot while developing, so account cookies stay on the same origin. The API runs at `http://localhost:8080/api`. By default, the API stores H2 data in `backend/vaultunit-data.mv.db`; H2 creates the database directory and file on startup if they do not exist. Set `VAULTUNIT_DB_URL` to use a different database location. Do not run multiple backend processes at once: H2 permits one embedded writer, and they use port 8080. The VS Code start task checks for an already-running VaultUnit API before launching Maven, avoiding a duplicate process. The unauthenticated H2 console is disabled. Passwords are BCrypt-hashed, login uses a server-side session and CSRF protection, and finance endpoints require authentication. Each account can see and modify only its own transactions. Newly created accounts start with no transactions. Set `vaultunit.opening-balance` in `backend-new/src/main/resources/application.properties` to change the starting balance for new dashboards.

For a separate Vercel frontend and Railway backend, set the Vercel environment variable `VITE_API_BASE_URL` to the Railway API base URL, including the `/api` path (for example, `https://your-service.up.railway.app/api`), and redeploy the frontend. During local Vite development, the frontend uses `/api` and the Vite dev-server proxy.

## API endpoints

- `GET /api/auth/csrf` — initialize a CSRF token
- `POST /api/auth/register` — create an account and sign in
- `POST /api/auth/login` — sign in with an email and password
- `GET /api/auth/me` — get the current signed-in account
- `PATCH /api/auth/preferences` — update the signed-in account's home currency
- `POST /api/auth/logout` — sign out and invalidate the session
- `GET /api/dashboard` — authenticated account summary and current-month spending grouped by category
- `GET /api/transactions` — authenticated account transactions, newest first
- `POST /api/transactions` — create a validated income or expense for the signed-in account; optional `currency` and `amountInInr` fields preserve the entered currency and normalized amount
- `DELETE /api/transactions/{id}` — delete one of the signed-in account's transactions
- `GET /api/challenges` — list community challenges with per-participant no-spend progress
- `POST /api/challenges` — start and join a 3–30 day shared challenge
- `POST /api/challenges/{id}/join` — join an active shared challenge
- `DELETE /api/challenges/{id}/join` — leave a challenge
- `GET /api/money-requests` — list requests sent or received by the signed-in account
- `POST /api/money-requests` — request an amount from an existing VaultUnit user by email
- `POST /api/money-requests/{id}/paid` — recipient marks a pending request paid
- `POST /api/money-requests/{id}/decline` — recipient declines a pending request
- `DELETE /api/money-requests/{id}` — requester cancels a pending request

The dashboard includes natural-language transaction entry, optional browser speech input, and client-side receipt OCR. Its bill splitter scans bill images in the browser or accepts a manually entered total, divides the amount evenly among 2–1,000 people, and does not create a transaction. Bill images are not saved or uploaded to the API. Multi-currency entries are normalized to INR at entry and displayed in the account's selected home currency using the latest available rates from Frankfurter (daily reference rates; internet access required). Receipt images are processed in the browser and are not uploaded to the API. Extracted transaction details should be reviewed before saving.

The dashboard also includes a shared community challenge board. Signed-in users can start a 3–30 day no-spend or category-specific challenge, join or leave active challenges, and see member names, no-spend-day totals, streaks, and badges. Challenge progress is calculated from each participant's own expense records; transaction descriptions and amounts are never shared.

Money requests are private to the requester and recipient. Either user can see the amount, currency, note, and status; only recipients can mark a pending request paid or decline it, and only requesters can cancel it. Marking a request paid records its in-app status only—it does not transfer or collect money.

The dashboard adapts to desktop, tablet, and mobile screen sizes. Tablet and mobile users can open the navigation drawer, and mobile users also have a fixed Home, Activity, Insights, and Settings navigation bar with safe-area spacing for touch devices.

The dashboard's Smart Spending Insights compares category spending with the same point in the previous month, shows the largest category's share of monthly expenses, and estimates whether spending will exceed any monthly category budgets. Budgets are optional, entered in the selected home currency, and stored locally per account on the current device.

The What-If Money Simulator estimates how hypothetical monthly spending reductions or income increases could change the time to a savings goal. It uses the current monthly savings pace and editable saved/goal amounts, updates its estimates as values change, and does not modify transactions, budgets, or account data.

VaultUnit also awards account-specific achievements for logging a first expense, saving a savings goal, recording expenses on seven different dates, and completing a joined community no-spend challenge. Earned achievements and the saved goal are stored in local browser storage for that account on the current device.
