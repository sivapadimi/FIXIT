# FixIt Platform Deployment Guide

This guide will help you deploy the FixIt debugging platform to production.

## 🚀 Quick Deployment Options

### Option 1: Docker Compose (Recommended)

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd event_fixit
   cp .env.example .env
   # Edit .env with your secure values
   ```

2. **Deploy to Production**
   ```bash
   docker-compose -f docker-compose.prod.yml up --build -d
   ```

3. **Access the Application**
   - Frontend: http://localhost (or your domain)
   - Backend API: http://localhost/api
   - Admin Panel: http://localhost/admin

### Option 2: Manual Deployment

#### Backend Deployment

1. **Install Dependencies**
   ```bash
   cd backend
   npm install --production
   ```

2. **Setup Environment**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

3. **Start Backend**
   ```bash
   npm start
   ```

#### Frontend Deployment

1. **Build Frontend**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Serve with Nginx**
   ```bash
   # Copy build files to nginx directory
   sudo cp -r build/* /var/www/html/
   ```

## 🌐 Cloud Deployment Options

### AWS Deployment

#### Using ECS (Elastic Container Service)

1. **Create ECR Repository**
   ```bash
   aws ecr create-repository --repository-name fixit-backend
   aws ecr create-repository --repository-name fixit-frontend
   ```

2. **Build and Push Images**
   ```bash
   # Backend
   docker build -t fixit-backend ./backend
   docker tag fixit-backend:latest <aws-account-id>.dkr.ecr.<region>.amazonaws.com/fixit-backend:latest
   docker push <aws-account-id>.dkr.ecr.<region>.amazonaws.com/fixit-backend:latest

   # Frontend
   docker build -t fixit-frontend ./frontend
   docker tag fixit-frontend:latest <aws-account-id>.dkr.ecr.<region>.amazonaws.com/fixit-frontend:latest
   docker push <aws-account-id>.dkr.ecr.<region>.amazonaws.com/fixit-frontend:latest
   ```

3. **Setup ECS Task Definition**
   - Create task definitions for backend and frontend
   - Set up ECS service with load balancer
   - Configure environment variables

#### Using AWS App Runner

1. **Backend Service**
   ```bash
   # Create App Runner service for backend
   aws apprunner create-service \
     --service-name fixit-backend \
     --source-code-configuration '{"ImageRepository":{"ImageIdentifier":"<aws-account-id>.dkr.ecr.<region>.amazonaws.com/fixit-backend:latest","ImageConfiguration":{"Port":5000}},"AutoDeploymentsEnabled":true}' \
     --instance-configuration '{"Cpu":"1","Memory":"2 GiB"}'
   ```

2. **Frontend Service**
   ```bash
   # Create App Runner service for frontend
   aws apprunner create-service \
     --service-name fixit-frontend \
     --source-code-configuration '{"ImageRepository":{"ImageIdentifier":"<aws-account-id>.dkr.ecr.<region>.amazonaws.com/fixit-frontend:latest","ImageConfiguration":{"Port":3000}},"AutoDeploymentsEnabled":true}' \
     --instance-configuration '{"Cpu":"1","Memory":"2 GiB"}'
   ```

### Render Deployment

1. **Backend Service**
   - Connect GitHub repository
   - Set root path: `backend`
   - Add environment variables
   - Set port: 5000

2. **Frontend Service**
   - Connect GitHub repository
   - Set root path: `frontend`
   - Set build command: `npm run build`
   - Set publish directory: `build`

3. **Database**
   - Create MongoDB instance
   - Update backend environment variables

### Railway Deployment

1. **Backend**
   ```bash
   railway login
   railway new
   # Set backend as root directory
   # Add environment variables
   ```

2. **Frontend**
   ```bash
   railway new
   # Set frontend as root directory
   # Configure as static site
   ```

### VPS Deployment

#### Using Ubuntu 22.04

1. **System Setup**
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y docker.io docker-compose nginx certbot python3-certbot-nginx
   sudo systemctl enable docker
   sudo usermod -aG docker $USER
   ```

2. **Clone and Deploy**
   ```bash
   git clone <repository-url>
   cd event_fixit
   cp .env.example .env
   # Edit .env with secure values
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Setup SSL Certificate**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Database
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your_secure_password
MONGO_DATABASE=fixit_db

# Redis
REDIS_PASSWORD=your_redis_password

# JWT
JWT_SECRET=your_jwt_secret_key

# URLs
FRONTEND_API_URL=https://your-domain.com/api
FRONTEND_SOCKET_URL=https://your-domain.com
```

### Nginx Configuration

For production, use the provided nginx configuration:

```nginx
# Copy nginx.conf to /etc/nginx/sites-available/fixit
sudo cp nginx/nginx.conf /etc/nginx/sites-available/fixit
sudo ln -s /etc/nginx/sites-available/fixit /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 Security Considerations

### 1. Database Security
- Use strong passwords for MongoDB
- Enable authentication
- Restrict network access

### 2. Application Security
- Change default JWT secret
- Use HTTPS in production
- Implement rate limiting
- Enable CORS properly

### 3. Code Execution Security
- Run code execution in isolated containers
- Limit system resources
- Monitor for malicious activity

### 4. Network Security
- Use firewall rules
- Enable fail2ban
- Regular security updates

## 📊 Monitoring and Logging

### Application Monitoring

1. **Health Checks**
   - Backend: `GET /health`
   - Frontend: Check HTTP status

2. **Logs**
   - Application logs: `/logs/`
   - Nginx logs: `/var/log/nginx/`
   - Docker logs: `docker-compose logs`

3. **Monitoring Tools**
   - Prometheus + Grafana
   - DataDog
   - New Relic

### Performance Monitoring

```bash
# Monitor resource usage
docker stats

# Check disk space
df -h

# Monitor memory
free -h
```

## 🔄 CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy FixIt

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to production
        run: |
          docker-compose -f docker-compose.prod.yml up --build -d
        env:
          MONGO_ROOT_PASSWORD: ${{ secrets.MONGO_PASSWORD }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check MongoDB status
   docker-compose logs mongodb
   
   # Verify connection string
   docker exec -it fixit_backend_prod env | grep MONGODB_URI
   ```

2. **Frontend Not Loading**
   ```bash
   # Check nginx configuration
   docker-compose logs nginx
   
   # Verify build
   docker exec -it fixit_frontend_prod ls -la /usr/share/nginx/html
   ```

3. **Code Execution Failing**
   ```bash
   # Check code executor logs
   docker-compose logs code-executor
   
   # Verify Docker socket access
   docker exec -it fixit_code_executor_prod docker ps
   ```

### Performance Issues

1. **High Memory Usage**
   - Check container limits
   - Optimize database queries
   - Implement caching

2. **Slow Response Times**
   - Enable gzip compression
   - Use CDN for static assets
   - Optimize database indexes

## 📈 Scaling

### Horizontal Scaling

1. **Load Balancer Setup**
   ```nginx
   upstream backend {
       server backend1:5000;
       server backend2:5000;
       server backend3:5000;
   }
   ```

2. **Database Scaling**
   - Use MongoDB replica set
   - Implement read replicas
   - Consider sharding for large datasets

### Vertical Scaling

1. **Increase Resources**
   ```yaml
   # In docker-compose.prod.yml
   backend:
     deploy:
       resources:
         limits:
           cpus: '2'
           memory: 4G
   ```

## 🔄 Backup and Recovery

### Database Backup

```bash
# Create backup
docker exec fixit_mongodb_prod mongodump --out /backup/$(date +%Y%m%d)

# Restore backup
docker exec fixit_mongodb_prod mongorestore /backup/20231201
```

### Application Backup

```bash
# Backup volumes
docker run --rm -v fixit_mongodb_data:/data -v $(pwd):/backup alpine tar czf /backup/mongodb_backup.tar.gz -C /data .
```

## 📞 Support

For deployment issues:
1. Check the logs: `docker-compose logs`
2. Verify environment variables
3. Check network connectivity
4. Review this documentation

## 🎉 Post-Deployment Checklist

- [ ] All services are running
- [ ] Database is accessible
- [ ] Frontend loads correctly
- [ ] Code execution works
- [ ] SSL certificate is valid
- [ ] Monitoring is configured
- [ ] Backups are scheduled
- [ ] Security scans are passing
