# CrestEarn

CrestEarn uses a React/Vite frontend in the project root and an Express API in the `backend/` npm workspace. The frontend sends relative `/api` requests; Vite proxies those requests to the local API on port 3001.

## Local setup

1. Install dependencies from the project root:

   ```powershell
   npm install
   ```

2. Configure the backend environment in `backend/.env`. Start from `backend/.env.example` and set `DATABASE_URL` to your local PostgreSQL or Supabase connection string. Keep this file private; `.env` files are ignored by Git.

3. Apply migrations and start both services:

   ```powershell
   npm run db:migrate
   npm run dev
   ```

The migration command creates the application schema and seeds the project catalog. It does not transfer existing user or transaction data from another database.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite and the Express API |
| `npm run db:migrate` | Apply pending database migrations |
| `npm run build` | Build the frontend into `dist/` |
| `npm run lint` | Lint frontend and backend source |
| `npm run test:api` | Run backend tests |
| `npm run start:api` | Start the backend workspace API |

Backend-only commands can also be run with `npm run <command> --workspace backend`, such as `start` or `db:migrate`.

## Deployment

The repository is configured for Vercel: Vite serves the frontend, and the Express app is exposed as a catch-all function under `/api`. The function is placed in Frankfurt (`fra1`) near the Supabase database.

1. Import `FredrickOketcho/CrestEarn` into Vercel and select the `publish` branch.
2. Keep the project root as the Root Directory. Vercel uses the Vite build command and publishes `dist/`.
3. Add `DATABASE_URL` as a Vercel environment variable for Production. Add `SUPPORT_PHONE` if support-account access is needed. Never commit these values.
4. Deploy. Vercel will provide the public `vercel.app` URL. Check `/api/health` on that URL to confirm the function can reach Supabase.

The Supabase schema has already been migrated. For future schema changes, set `DATABASE_URL` locally in `backend/.env` and run `npm run db:migrate` before deploying the code that depends on those changes.

PostgreSQL sessions and phone/password authentication are managed by this application. Supabase Auth is not connected. Payment collection and real wallet payouts are not implemented.
