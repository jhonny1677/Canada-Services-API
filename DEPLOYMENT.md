# 🚀 Deployment Guide - Canadian Services API

This guide covers multiple deployment options for the Canadian Services API, from local development to production cloud deployments.

## 📋 Prerequisites

- Node.js 18+ and npm
- Git for version control
- Internet connection for external API calls
- Optional: Docker for containerized deployments

## 🏠 Local Development

### Quick Setup
```bash
# Clone the repository
git clone https://github.com/jhonny1677/Canada-Services-API.git
cd Canada-Services-API

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm run dev
```

### Environment Configuration
Edit `.env` file with your preferences:

```bash
# Server Settings
PORT=3000
NODE_ENV=development

# Performance Settings
CACHE_TTL_SECONDS=3600
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=debug
```

### Development Commands
```bash
npm run dev          # Development server with auto-restart
npm start           # Production server
npm test            # Run tests (when available)
npm run lint        # Code linting (when available)
```

## 🐳 Docker Deployment

### Build Docker Image
```bash
# Build the image
docker build -t canadian-services-api .

# Run the container
docker run -p 3000:3000 canadian-services-api

# Run with environment variables
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  canadian-services-api
```

### Docker Compose
Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - CACHE_TTL_SECONDS=3600
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api
    restart: unless-stopped
```

### Run with Docker Compose
```bash
docker-compose up -d
docker-compose logs -f api
```

## ☁️ Cloud Deployment Options

### 1. Heroku Deployment

#### Prerequisites
- Heroku CLI installed
- Heroku account

#### Deployment Steps
```bash
# Login to Heroku
heroku login

# Create Heroku app
heroku create your-canadian-api

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set CACHE_TTL_SECONDS=3600

# Deploy
git push heroku main

# Open your app
heroku open
```

#### Heroku Configuration
Add `Procfile`:
```
web: node server.js
```

### 2. Vercel Deployment

#### Install Vercel CLI
```bash
npm i -g vercel
```

#### Deploy to Vercel
```bash
# Login to Vercel
vercel login

# Deploy
vercel --prod

# Set environment variables
vercel env add NODE_ENV production
vercel env add CACHE_TTL_SECONDS 3600
```

#### Vercel Configuration
Create `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 3. AWS Lambda (Serverless)

#### Install Serverless Framework
```bash
npm install -g serverless
```

#### Create `serverless.yml`
```yaml
service: canadian-services-api

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  environment:
    NODE_ENV: production
    CACHE_TTL_SECONDS: 3600

functions:
  api:
    handler: lambda.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
          cors: true
      - http:
          path: /
          method: ANY
          cors: true

plugins:
  - serverless-offline
```

#### Create Lambda Handler
Create `lambda.js`:
```javascript
const serverless = require('serverless-http');
const app = require('./server');

module.exports.handler = serverless(app);
```

#### Deploy
```bash
serverless deploy
```

### 4. Google Cloud Run

#### Build and Deploy
```bash
# Set project ID
export PROJECT_ID=your-project-id

# Build and push to Google Container Registry
docker build -t gcr.io/$PROJECT_ID/canadian-services-api .
docker push gcr.io/$PROJECT_ID/canadian-services-api

# Deploy to Cloud Run
gcloud run deploy canadian-services-api \
  --image gcr.io/$PROJECT_ID/canadian-services-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000
```

### 5. DigitalOcean App Platform

Create `.do/app.yaml`:
```yaml
name: canadian-services-api
services:
- name: api
  source_dir: /
  github:
    repo: jhonny1677/Canada-Services-API
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
  - key: CACHE_TTL_SECONDS
    value: "3600"
  http_port: 3000
```

## 🔧 Production Configuration

### Environment Variables
```bash
# Required for production
NODE_ENV=production
PORT=3000

# Performance tuning
CACHE_TTL_SECONDS=3600
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000

# Logging
LOG_LEVEL=info
LOG_FILE=/app/logs/api.log

# API endpoints (optional)
NOMINATIM_URL=https://nominatim.openstreetmap.org
OVERPASS_URL=https://overpass-api.de/api
```

### Nginx Reverse Proxy
Create `nginx.conf`:
```nginx
events {
    worker_connections 1024;
}

http {
    upstream api {
        server api:3000;
    }

    server {
        listen 80;
        server_name your-domain.com;

        location / {
            proxy_pass http://api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Enable CORS
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
            add_header Access-Control-Allow-Headers "Content-Type, Authorization";
        }
    }
}
```

### SSL/HTTPS Setup
```bash
# Using Certbot for Let's Encrypt
sudo certbot --nginx -d your-domain.com

# Or using Cloudflare for SSL termination
```

## 📊 Monitoring & Logging

### Health Checks
The API includes built-in health check endpoints:
```bash
curl http://localhost:3000/
curl http://localhost:3000/health
```

### Logging Configuration
```javascript
// In production, configure proper logging
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({stack: true}),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({filename: 'logs/error.log', level: 'error'}),
    new winston.transports.File({filename: 'logs/combined.log'})
  ]
});
```

### Monitoring Tools
- **Application Performance**: New Relic, DataDog
- **Uptime Monitoring**: Pingdom, StatusCake
- **Error Tracking**: Sentry, Rollbar
- **Log Management**: ELK Stack, Splunk

## 🔒 Security Considerations

### Production Security Checklist
- [ ] Use HTTPS everywhere
- [ ] Set proper CORS headers
- [ ] Implement rate limiting
- [ ] Validate all input parameters
- [ ] Use security headers (Helmet.js)
- [ ] Keep dependencies updated
- [ ] Monitor for security vulnerabilities
- [ ] Use environment variables for sensitive data
- [ ] Implement proper logging (no sensitive data)
- [ ] Regular security audits

### Security Headers
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## 🚨 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)
```

#### Memory Issues
```bash
# Check memory usage
node --max-old-space-size=4096 server.js
```

#### External API Rate Limits
- Monitor response headers from external APIs
- Implement exponential backoff
- Use multiple API keys if available
- Cache responses aggressively

#### Docker Issues
```bash
# Debug container
docker logs container_name
docker exec -it container_name /bin/sh

# Rebuild without cache
docker build --no-cache -t canadian-services-api .
```

### Performance Optimization

#### Node.js Tuning
```bash
# Production startup with optimizations
node --max-old-space-size=2048 \
     --optimize-for-size \
     server.js
```

#### Load Balancing
Use multiple instances behind a load balancer:
```yaml
# docker-compose.yml
version: '3.8'
services:
  api1:
    build: .
    environment:
      - PORT=3001
  api2:
    build: .
    environment:
      - PORT=3002
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    # Configure nginx to load balance between api1 and api2
```

## 📈 Scaling Considerations

### Horizontal Scaling
- Use container orchestration (Kubernetes, Docker Swarm)
- Implement sticky sessions if needed
- Use external caching (Redis)
- Database read replicas

### Vertical Scaling
- Monitor CPU and memory usage
- Optimize database queries
- Implement efficient caching strategies
- Use CDN for static assets

This deployment guide should cover most scenarios for getting your Canadian Services API running in production. Choose the deployment method that best fits your infrastructure and requirements.