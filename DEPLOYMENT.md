# B2B Lead Platform - Deployment Guide

This guide covers deploying the B2B Lead Platform to various cloud platforms.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Deploy to Render](#deploy-to-render)
- [Deploy to Railway](#deploy-to-railway)
- [Deploy to Heroku](#deploy-to-heroku)
- [Deploy to VPS (Docker)](#deploy-to-vps-docker)
- [Database Setup](#database-setup)
- [Post-Deployment](#post-deployment)

---

## Prerequisites

- Node.js 18+ installed locally (for testing)
- Git repository initialized
- Cloud platform account (Render, Railway, or Heroku)
- PostgreSQL database (Neon, Supabase, or platform-provided)

---

## Environment Variables

Create a `.env` file in the `server` directory with these variables:

```env
# Required
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars

# Optional
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-url.onrender.com
MAX_FILE_SIZE=5242880
```

---

## Deploy to Render (Recommended)

Render provides free-tier hosting with automatic deployments from Git.

### Option 1: Using Blueprint (Easiest)

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Go to [Render Dashboard](https://dashboard.render.com/)**
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Render will automatically detect `render.yaml`
   - Review and confirm the services

3. **Set Environment Variables**
   - In the Render dashboard, go to your backend service
   - Add `DATABASE_URL` with your Neon/PostgreSQL connection string
   - Set `CORS_ORIGIN` to your frontend URL

4. **Deploy**
   - Click "Apply" to create all services
   - Render will build and deploy automatically

### Option 2: Manual Setup

1. **Create PostgreSQL Database**
   - New → PostgreSQL → Choose "Free" tier
   - Note the "Internal Database URL"

2. **Create Backend Web Service**
   - New → Web Service → Connect GitHub repo
   - Root Directory: `server`
   - Build Command: `npm ci && npx prisma generate && npm run build`
   - Start Command: `npm start`
   - Add Environment Variables

3. **Create Frontend Web Service**
   - New → Web Service → Connect GitHub repo
   - Root Directory: `client`
   - Build Command: `npm ci && npm run build`
   - Start Command: `npx serve -s dist -l 3000`

---

## Deploy to Railway

Railway offers simple deployment with automatic database provisioning.

### Using Railway CLI

1. **Install Railway CLI**

---

## Deploy to Heroku

### Using Heroku CLI

1. **Login to Heroku**
   ```bash
   heroku login
   ```

2. **Create Apps**
   ```bash
   heroku create b2b-lead-backend
   heroku create b2b-lead-frontend
   ```

3. **Add PostgreSQL**
   ```bash
   heroku addons:create heroku-postgresql:mini --app b2b-lead-backend
   ```

4. **Set Environment Variables**
   ```bash
   heroku config:set NODE_ENV=production --app b2b-lead-backend
   heroku config:set JWT_SECRET=$(openssl rand -base64 32) --app b2b-lead-backend
   heroku config:set JWT_REFRESH_SECRET=$(openssl rand -base64 32) --app b2b-lead-backend
   heroku config:set CORS_ORIGIN=https://b2b-lead-frontend.herokuapp.com --app b2b-lead-backend
   ```

5. **Deploy Backend**
   ```bash
   git subtree push --prefix server heroku main
   ```

6. **Deploy Frontend**
   ```bash
   git subtree push --prefix client heroku-frontend main
   ```

---

## Deploy to VPS (Docker)

For self-hosted deployment on any VPS (DigitalOcean, Linode, AWS EC2, etc.)

### Prerequisites
- VPS with Ubuntu 22.04+
- Docker and Docker Compose installed
- Domain name (optional but recommended)

### Steps

1. **Clone Repository**
   ```bash
   git clone https://github.com/your-username/b2b-lead-platform.git
   cd b2b-lead-platform
   ```

2. **Create Production Environment File**
   ```bash
   cp .env.example .env
   nano .env
   ```

3. **Set Environment Variables in `.env`**
   ```env
   POSTGRES_USER=admin
   POSTGRES_PASSWORD=your-strong-password
   POSTGRES_DB=leadplatform
   DATABASE_URL=postgresql://admin:your-strong-password@db:5432/leadplatform
   JWT_SECRET=your-super-secret-jwt-key
   JWT_REFRESH_SECRET=your-refresh-secret
   CORS_ORIGIN=https://your-domain.com
   VITE_API_URL=https://api.your-domain.com
   ```

4. **Build and Run**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

5. **Run Database Migrations**
   ```bash
   docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
   ```

6. **Seed Initial Data (Optional)**
   ```bash
   docker-compose -f docker-compose.prod.yml exec backend npm run prisma:seed
   ```

7. **Set up Nginx Reverse Proxy (Optional)**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_cache_bypass $http_upgrade;
       }

       location /api {
           proxy_pass http://localhost:4000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

8. **Enable HTTPS with Let's Encrypt**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com -d api.your-domain.com
   ```

---

## Database Setup

### Option 1: Neon (Recommended - Free Tier)

1. Go to [neon.tech](https://neon.tech/)
2. Create a new project
3. Copy the connection string
4. Use it as your `DATABASE_URL`

### Option 2: Supabase (Free Tier)

1. Go to [supabase.com](https://supabase.com/)
2. Create a new project
3. Go to Settings → Database → Connection String
4. Copy and use as `DATABASE_URL`

### Option 3: Render/Railway Managed Database

Both platforms can provision PostgreSQL automatically when using their Blueprint/deployment configs.

---

## Post-Deployment

### Verify Deployment

1. **Check Backend Health**
   ```
   https://your-backend-url.onrender.com/api/health
   ```

2. **Access Frontend**
   ```
   https://your-frontend-url.onrender.com
   ```

3. **Default Login** (if seeded)
   - Email: admin@bluconnetmedia.com
   - Password: (check seed file for default password)

### Run Database Migrations

If you're using a new database:

```bash
# Render
render exec b2b-lead-backend "npx prisma migrate deploy"

# Railway
railway run npx prisma migrate deploy

# Docker
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Heroku
heroku run "npx prisma migrate deploy" --app b2b-lead-backend
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS errors | Check `CORS_ORIGIN` matches frontend URL |
| Database connection failed | Verify `DATABASE_URL` format and SSL settings |
| Build fails | Check Node.js version (18+ required) |
| Static files not loading | Ensure frontend build output exists |

---

## Support

For issues or questions:
- Check the [Render Docs](https://render.com/docs)
- Check the [Railway Docs](https://docs.railway.app/)
- Check the [Heroku Docs](https://devcenter.heroku.com/)

   ```bash
   npm install -g @railway/cli
   ```

2. **Login and Initialize**
   ```bash
   railway login
   railway init
   ```

3. **Add PostgreSQL Database**
   ```bash
   railway add --plugin postgresql
   ```

4. **Set Environment Variables**
   ```bash
   railway variables --set "DATABASE_URL=${{Postgres.DATABASE_URL}}"
   railway variables --set "JWT_SECRET=your-secret-key"
   railway variables --set "JWT_REFRESH_SECRET=your-refresh-secret"
   railway variables --set "NODE_ENV=production"
   ```

5. **Deploy**
   ```bash
   railway up
   ```

### Using Dashboard

1. Go to [Railway.app](https://railway.app/)
2. Create New Project → Deploy from GitHub repo
3. Add PostgreSQL plugin
4. Configure environment variables in dashboard
