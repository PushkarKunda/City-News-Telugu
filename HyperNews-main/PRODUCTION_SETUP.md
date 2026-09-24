# 🚀 PRODUCTION DEPLOYMENT SETUP GUIDE

This guide covers all necessary steps to deploy your FastAPI backend to production.

---

## ✅ CRITICAL: PRE-DEPLOYMENT CHECKLIST

### 1. **Security**
- [ ] Remove Firebase JSON files from repository (use environment variables only)
- [ ] Generate new SECRET_KEY and SESSION_SECRET_KEY (cryptographically secure 32+ chars)
- [ ] Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET from Google Cloud Console
- [ ] Set BREVO_API_KEY from Brevo account
- [ ] Verify `.env.example` has NO real credentials
- [ ] Change ENVIRONMENT to `production`
- [ ] Disable DEBUG mode
- [ ] Set CORS_ALLOW_ORIGINS to your frontend domain only
- [ ] Verify HTTPS_ONLY is enabled in production

### 2. **Database**
- [ ] PostgreSQL 13+ installed and running
- [ ] Create production database
- [ ] Set DATABASE_URL with proper credentials
- [ ] Run Alembic migrations: `alembic upgrade head`
- [ ] Verify AUTO_CREATE_TABLES is `false`
- [ ] Set up database backups (daily minimum)

### 3. **Cache & Queue**
- [ ] Redis 6+ installed and running  
- [ ] Set REDIS_URL to production Redis instance
- [ ] Configure Redis password authentication
- [ ] Enable Redis persistence (RDB or AOF)

### 4. **API Keys & Credentials**
All values MUST be set as environment variables, NOT in code:

```bash
export SECRET_KEY="$(openssl rand -hex 32)"
export SESSION_SECRET_KEY="$(openssl rand -hex 32)"
export GOOGLE_CLIENT_ID="your-google-client-id"
export GOOGLE_CLIENT_SECRET="your-google-secret"
export BREVO_API_KEY="your-brevo-key"
export DATABASE_URL="postgresql://user:pass@host:5432/db"
export REDIS_URL="redis://host:6379/0"
export FIREBASE_CREDENTIALS_JSON='{"type":"service_account",...}'
```

---

## 🐳 DOCKER DEPLOYMENT (RECOMMENDED)

### Build Docker Image

```bash
docker build -t hypernews-api:1.0.0 .
```

### Docker Compose (Development)

```bash
docker-compose -f docker-compose.yml up -d
```

### Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  api:
    image: hypernews-api:1.0.0
    container_name: hypernews_api_prod
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=production
      - SECRET_KEY=${SECRET_KEY}
      - SESSION_SECRET_KEY=${SESSION_SECRET_KEY}
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - BREVO_API_KEY=${BREVO_API_KEY}
      - CORS_ALLOW_ORIGINS=https://yourdomain.com
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - hypernews_net
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    container_name: hypernews_postgres_prod
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: hypernews_prod
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - hypernews_net

  redis:
    image: redis:7-alpine
    container_name: hypernews_redis_prod
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redis_data:/data
    restart: always
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
    networks:
      - hypernews_net

volumes:
  postgres_data:
  redis_data:

networks:
  hypernews_net:
    driver: bridge
```

Deploy:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🦄 GUNICORN + UVICORN (Advanced)

### Install Production Server

```bash
pip install gunicorn uvicorn[standard]
```

### Create `gunicorn_config.py`

```python
import os
import multiprocessing

# Server socket
bind = "0.0.0.0:8000"
backlog = 2048
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"

# Process naming
proc_name = "hypernews-api"

# Server mechanics
daemon = False
pidfile = "/tmp/gunicorn.pid"
umask = 0
tmp_upload_dir = None

# SSL
keyfile = "/etc/ssl/private/key.pem"
certfile = "/etc/ssl/certs/cert.pem"

# Application
timeout = 30
graceful_timeout = 30
```

### Start Server

```bash
gunicorn main:app \
  --config gunicorn_config.py \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker
```

---

## 🔒 NGINX REVERSE PROXY

### Create `/etc/nginx/sites-available/hypernews-api`

```nginx
upstream hypernews_api {
    server 127.0.0.1:8000;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Certificate (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    # Proxy settings
    proxy_pass http://hypernews_api;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_redirect off;

    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # Body size limit
    client_max_body_size 100M;

    # Gzip compression
    gzip on;
    gzip_types text/plain application/json application/javascript;
    gzip_min_length 1000;
}
```

### Enable site

```bash
sudo ln -s /etc/nginx/sites-available/hypernews-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Get SSL certificate

```bash
sudo certbot certonly --nginx -d api.yourdomain.com
```

---

## 📊 MONITORING & LOGGING

### Prometheus Metrics

```python
# In main.py
from prometheus_client import Counter, Histogram, generate_latest, CollectorRegistry, REGISTRY

# Metrics
request_count = Counter('api_requests_total', 'Total requests', ['method', 'endpoint', 'status'])
request_duration = Histogram('api_request_duration_seconds', 'Request duration', ['method', 'endpoint'])

@app.get("/metrics")
def metrics():
    return generate_latest(REGISTRY), 200, {"Content-Type": "text/plain"}
```

### Structured Logging

```python
# In main.py
import json

# Use JSON logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/hypernews/api.log'),
        logging.StreamHandler()
    ]
)
```

### Centralized Logging (ELK Stack)

Install ELK:

```bash
docker-compose up elasticsearch kibana logstash
```

---

## 🔄 BACKGROUND TASKS

### Celery Worker

```bash
celery -A celery_worker worker --loglevel=info
```

### Scheduled Tasks

```bash
celery -A scheduler beat --loglevel=info
```

---

## 📈 PERFORMANCE TUNING

### Database Connection Pool

```python
# In database.py
engine = create_engine(
    DATABASE_URL,
    pool_size=20,           # Connection pool size
    max_overflow=40,        # Extra connections
    pool_pre_ping=True,     # Test connections
    pool_recycle=1800,      # Recycle connections every 30 min
    echo=False,             # Set True for debugging
)
```

### Redis Optimization

```bash
# In docker-compose or Redis config
maxmemory 512mb
maxmemory-policy allkeys-lru
```

---

## 🆘 TROUBLESHOOTING

### API Not Responding

1. Check logs: `docker-compose logs api`
2. Check health: `curl http://localhost:8000/health`
3. Verify database: `psql -h host -U user -d dbname`
4. Verify Redis: `redis-cli ping`

### Slow Requests

1. Enable query logging
2. Check database indexes
3. Monitor Redis memory
4. Use APM tool (Sentry, New Relic)

### High Memory Usage

1. Check for memory leaks in code
2. Reduce worker count
3. Optimize database queries
4. Monitor with `docker stats`

---

## ✅ FINAL CHECKLIST

- [ ] All credentials in environment variables
- [ ] HTTPS enabled
- [ ] Database backups configured
- [ ] Health check working
- [ ] Monitoring alerts set up
- [ ] Error tracking enabled (Sentry)
- [ ] Rate limiting active
- [ ] API documentation accessible at `/docs`
- [ ] Staging environment mirrors production
- [ ] Disaster recovery plan documented

---

## 📞 SUPPORT

For issues, check:
1. `/health` endpoint status
2. Application logs
3. Database connection
4. Redis connection
5. Firewall rules

