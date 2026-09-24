# ============================================================
# 🚀 PRODUCTION DEPLOYMENT CHECKLIST
# ============================================================

## PRE-DEPLOYMENT (Before running docker-compose.prod.yml)

- [ ] **Security Keys** 
  - [ ] Generated new SECRET_KEY (32+ chars)
  - [ ] Generated new SESSION_SECRET_KEY (32+ chars)
  - [ ] Set REDIS_PASSWORD (16+ chars)
  - [ ] Set POSTGRES_PASSWORD (16+ chars)

- [ ] **API Keys & Credentials**
  - [ ] GOOGLE_CLIENT_ID from Google Cloud Console
  - [ ] GOOGLE_CLIENT_SECRET from Google Cloud Console
  - [ ] BREVO_API_KEY from Brevo account
  - [ ] BREVO_SENDER_EMAIL (your domain email)

- [ ] **Environment Configuration**
  - [ ] Copy .env.prod and fill all required values
  - [ ] Set CORS_ALLOW_ORIGINS to your frontend domains only
  - [ ] Set ALLOWED_HOSTS with your API domain
  - [ ] Verify ENVIRONMENT=production
  - [ ] Verify DEBUG=False

- [ ] **Database**
  - [ ] PostgreSQL 16+ prepared
  - [ ] Database user created (don't use postgres)
  - [ ] Strong password set
  - [ ] Backups configured

- [ ] **Redis**
  - [ ] Redis 7+ prepared
  - [ ] Password authentication enabled
  - [ ] Persistence (AOF) enabled
  - [ ] Memory eviction policy set

## DEPLOYMENT

```bash
# 1. Build and start all services
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# 2. Run migrations
docker-compose -f docker-compose.prod.yml exec api alembic upgrade head

# 3. Check logs
docker-compose -f docker-compose.prod.yml logs -f api

# 4. Verify health
curl http://localhost:8000/health

# 5. Check celery worker
docker-compose -f docker-compose.prod.yml logs celery-worker
```

## POST-DEPLOYMENT

- [ ] **Health Checks**
  - [ ] API responds to /health endpoint
  - [ ] Database connection verified
  - [ ] Redis connection verified
  - [ ] Celery worker running
  - [ ] Celery beat scheduler running

- [ ] **Security Verification**
  - [ ] HTTPS configured (reverse proxy/nginx)
  - [ ] Security headers set (see nginx-prod.conf)
  - [ ] Credentials not in logs
  - [ ] DEBUG mode off
  - [ ] Rate limiting enabled

- [ ] **Monitoring**
  - [ ] Container restart policies verified
  - [ ] Health checks running
  - [ ] Log rotation configured (100m max, 10 files)
  - [ ] Resource limits enforced
  - [ ] Metrics collection setup

- [ ] **Database**
  - [ ] Backup schedule configured (daily minimum)
  - [ ] Restore procedure tested
  - [ ] Migrations documented

## NGINX REVERSE PROXY (Recommended)

Create `nginx-prod.conf`:

```nginx
upstream api {
    server api:8000;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }
}
```

## MONITORING & LOGGING

```bash
# View real-time logs
docker-compose -f docker-compose.prod.yml logs -f

# View API logs only
docker-compose -f docker-compose.prod.yml logs -f api

# View Celery worker logs
docker-compose -f docker-compose.prod.yml logs -f celery-worker

# View container stats
docker stats

# Backup database
docker-compose -f docker-compose.prod.yml exec postgres pg_dump \
  -U $POSTGRES_USER $POSTGRES_DB > backup-$(date +%Y%m%d-%H%M%S).sql
```

## TROUBLESHOOTING

**Container exits immediately?**
```bash
docker-compose -f docker-compose.prod.yml logs api
```

**Database connection refused?**
```bash
docker-compose -f docker-compose.prod.yml exec postgres pg_isready
```

**Redis connection refused?**
```bash
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
```

**Celery not processing tasks?**
```bash
docker-compose -f docker-compose.prod.yml exec celery-worker celery inspect active
```
