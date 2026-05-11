# Production deploy: akaiaksai.app

This guide deploys frontend + backend from this repo to Ubuntu server `134.209.243.32`.

## 1) DNS (at your domain registrar)

Create/verify records:

- `A` for `@` -> `134.209.243.32`
- `A` for `www` -> `134.209.243.32`
- `A` for `backend` -> `134.209.243.32`

## 2) Prepare server

```bash
apt update && apt upgrade -y
apt install -y nginx certbot python3-certbot-nginx ufw curl git
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm i -g pm2
```

Firewall:

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

## 3) Upload project

Option A (recommended): clone private/public git repo on server.

```bash
mkdir -p /var/www
cd /var/www
git clone <YOUR_REPO_URL> alu-satu
```

Option B: copy local folder to `/var/www/alu-satu` (scp/rsync).

## 4) Backend env

Create `/var/www/alu-satu/server/.env`:

```dotenv
PORT=4000
MONGO_URI=mongodb+srv://<db_user>:<db_password>@alusatu.hogjrzz.mongodb.net/alu-satu?retryWrites=true&w=majority
MONGO_CONNECT_TIMEOUT_MS=10000
JWT_SECRET=replace_with_long_random_secret
ALLOWED_ORIGINS=https://akaiaksai.app,https://www.akaiaksai.app
RATE_LIMIT_MAX=300
```

## 5) Install and run backend with PM2

```bash
cd /var/www/alu-satu/server
npm ci
pm2 start index.js --name alu-satu-api
pm2 save
pm2 startup systemd
```

Health check:

```bash
curl http://127.0.0.1:4000/api/health
```

## 6) Build frontend

```bash
cd /var/www/alu-satu
npm ci
npm run build
```

## 7) Nginx config

Create `/etc/nginx/sites-available/akaiaksai.app`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name akaiaksai.app www.akaiaksai.app;

    root /var/www/alu-satu/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name backend.akaiaksai.app;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:

```bash
ln -s /etc/nginx/sites-available/akaiaksai.app /etc/nginx/sites-enabled/akaiaksai.app
nginx -t
systemctl reload nginx
```

## 8) SSL certificates

```bash
certbot --nginx -d akaiaksai.app -d www.akaiaksai.app -d backend.akaiaksai.app --redirect -m you@example.com --agree-tos -n
```

## 9) Verify

```bash
curl -I https://akaiaksai.app
curl https://backend.akaiaksai.app/api/health
pm2 status
```

## 10) Updates

```bash
cd /var/www/alu-satu
git pull
npm ci && npm run build
cd /var/www/alu-satu/server
npm ci
pm2 restart alu-satu-api
systemctl reload nginx
```
