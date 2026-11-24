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

Set `DATABASE_URL`, `SUPPORT_PHONE`, `NODE_ENV=production`, and the hosting platform's `PORT` in the API service environment. Set `API_HOST=0.0.0.0` when the container must accept external traffic. Build the frontend with `npm run build` and publish `dist/`. Configure the host or reverse proxy to route `/api` requests to the Express service.

PostgreSQL sessions and phone/password authentication are managed by this application. Supabase Auth is not connected. Payment collection and real wallet payouts are not implemented.
