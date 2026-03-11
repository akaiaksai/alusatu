# Deploy To Domain (Frontend + Backend)

This project has:
- frontend: Vite (`dist`)
- backend: Node/Express (`server/index.js`, default port `4000`)

Recommended production setup:
- `Nginx` serves frontend static files
- `Nginx` proxies `/api/*` to backend on `127.0.0.1:4000`
- backend runs via `pm2`
- SSL via `certbot`

## 1) Server prerequisites (Ubuntu)

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2
sudo npm i -g pm2
```

## 2) Clone/update project

```bash
sudo mkdir -p /var/www
cd /var/www
sudo git clone https://github.com/akaiaksai/alusatu.git alusatu || true
cd /var/www/alusatu
sudo git pull origin main
```

## 3) Frontend build

```bash
cd /var/www/alusatu
npm ci
cp .env.production.example .env.production
npm run build
```

Default `VITE_API_URL` in `.env.production.example` is `/`, so frontend calls same domain `/api`.

## 4) Backend env and start

```bash
cd /var/www/alusatu/server
npm ci
cp .env.example .env
```

Edit `/var/www/alusatu/server/.env`:
- `PORT=4000`
- `MONGO_URI=...`
- `JWT_SECRET=...`
- `ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com`

Start backend:

```bash
cd /var/www/alusatu
pm2 start deploy/pm2/ecosystem.config.cjs
pm2 save
pm2 startup
```

## 5) Nginx

Copy template and set domain:

```bash
sudo cp /var/www/alusatu/deploy/nginx/alusatu.conf /etc/nginx/sites-available/alusatu
sudo nano /etc/nginx/sites-available/alusatu
```

Replace:
- `YOUR_DOMAIN` -> your real domain

Enable and reload:

```bash
sudo ln -sf /etc/nginx/sites-available/alusatu /etc/nginx/sites-enabled/alusatu
sudo nginx -t
sudo systemctl reload nginx
```

## 6) SSL

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## 7) DNS

In your domain DNS panel:
- `A` record: `@` -> server public IP
- `A` record: `www` -> server public IP

## 8) Smoke checks

```bash
curl -I https://your-domain.com
curl https://your-domain.com/api/health
pm2 status
```
