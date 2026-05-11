# alu-satu Backend

Express + MongoDB (Mongoose) API for marketplace data.

All core data is stored in MongoDB:
- users
- cart
- favorites
- listed products
- reviews
- orders
- receipts

## Run locally
1. Open terminal in `server`
2. Copy env file:
   - PowerShell: `Copy-Item .env.example .env`
3. Fill `MONGO_URI` and `JWT_SECRET` in `.env`
4. Install dependencies: `npm install`
5. Start server: `npm run dev`

Health endpoint:
- `GET /api/health`
- Expected mongo value after successful connection: `"connected"`

## MongoDB Atlas Cluster Setup (GitHub Education)
1. Open MongoDB Atlas and create/select project.
2. Click `Build a Database` and create an `M0` cluster.
3. Choose region closest to your backend hosting.
4. Create a database user in `Database Access` (username + password).
5. Add allowed IP in `Network Access`:
   - dev quick start: `0.0.0.0/0`
   - production: only your server IP(s)
6. In cluster, click `Connect` -> `Drivers` -> `Node.js`.
7. Copy connection string and replace `<password>`.
8. Set it as `MONGO_URI` in `server/.env`.
9. Restart backend and check `GET /api/health`.

## Notes
- If Atlas connection fails, DB-backed endpoints return `503` until connection is restored.
- Never commit real secrets (`.env`) to git.
