# 🚀 FixIt Platform - Complete Startup Guide

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Docker & Docker Compose** (Recommended)
- **Node.js 18+** and **npm 8+** (for local development)
- **Git** for version control

## 🎯 Quick Start (Recommended)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd event_fixit
```

### 2. Environment Setup
```bash
# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit the .env files with your configuration
# Use strong passwords and secure secrets
```

### 3. Start with Docker
```bash
# This starts all services: MongoDB, Redis, Backend, Frontend, Code Executor
npm run dev
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

## 🔧 Manual Development Setup

If you prefer to run services manually:

### 1. Start Database Services
```bash
# Start MongoDB and Redis
docker-compose up mongodb redis -d
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with database credentials
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with API URLs
npm start
```

## 🏗️ Project Architecture

```
event_fixit/
├── backend/                 # Node.js API Server
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Auth, validation
│   │   ├── services/       # Business logic
│   │   └── utils/          # Helper functions
│   └── Dockerfile
├── frontend/               # React Application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   ├── services/       # API calls
│   │   ├── store/         # State management
│   │   └── styles/        # CSS/Tailwind
│   └── Dockerfile
├── code-executor/          # Docker sandbox for code execution
├── docker-compose.yml      # Development environment
└── README.md
```

## 🎮 First Time Setup

### 1. Create Admin Account
1. Navigate to http://localhost:3000/register
2. Register with role: `admin`
3. Use a strong password and valid email

### 2. Create Your First Problem
1. Login as admin
2. Go to http://localhost:3000/admin/problems
3. Click "Add Problem"
4. Fill in problem details:
   - Title, description, difficulty
   - Add buggy code templates for Python, Java, C++
   - Add test cases (sample + hidden)
   - Set time/memory limits

### 3. Register Teams
1. Go to http://localhost:3000/register
2. Register as `team`
3. Add team members (max 5)
4. Provide college information

### 4. Start an Event
1. Login as admin
2. Go to http://localhost:3000/admin/events
3. Create new event
4. Set start/end times
5. Click "Start Event"

## 🧪 Testing the Platform

### 1. Test Code Execution
1. Login as a team
2. Go to Problems page
3. Select a problem
4. Write/fix code in Monaco Editor
5. Click "Run" to test with sample cases
6. Click "Submit" for full evaluation

### 2. Test Real-time Features
1. Open two browser windows
2. Login as different users
3. Make submissions and watch leaderboard update
4. Check notifications in real-time

### 3. Test Admin Features
1. Monitor submissions in admin panel
2. View user statistics
3. Control event timer
4. Manage problems and users

## 🔍 Common Issues & Solutions

### Port Already in Use
```bash
# Check what's using the port
netstat -tulpn | grep :3000
netstat -tulpn | grep :5000

# Kill the process
sudo kill -9 <PID>
```

### Docker Issues
```bash
# Clean up Docker
docker-compose down -v
docker system prune -f
docker volume prune -f

# Restart
docker-compose up --build
```

### Database Connection Issues
```bash
# Check MongoDB logs
docker-compose logs mongodb

# Check if MongoDB is running
docker-compose ps mongodb

# Reset MongoDB data
docker-compose down -v
docker-compose up mongodb
```

### Frontend Build Issues
```bash
# Clear node modules
cd frontend
rm -rf node_modules package-lock.json
npm install
npm start
```

### Backend Dependencies Issues
```bash
# Clear node modules
cd backend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## 🎯 Development Workflow

### 1. Making Changes
- Backend changes: Restart backend service
- Frontend changes: Hot reload enabled
- Database changes: May require data reset

### 2. Adding New Problems
1. Use admin panel to create problems
2. Test with sample inputs
3. Verify all test cases work
4. Check time/memory limits

### 3. Monitoring
- Check logs: `docker-compose logs <service>`
- Monitor resources: `docker stats`
- Health checks: http://localhost:5000/health

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://admin:fixit123@localhost:27017/fixit_db?authSource=admin
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key
CODE_EXECUTION_TIMEOUT=30000
MAX_MEMORY_LIMIT=128m
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_EVENT_NAME=FixIt 2024
```

### Customization
- **Themes**: Modify `tailwind.config.js`
- **API Limits**: Change in backend middleware
- **Code Execution**: Update sandbox configurations
- **UI Components**: Modify React components

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Problem Endpoints
- `GET /api/problems` - List problems
- `GET /api/problems/:id` - Get problem details
- `POST /api/problems` - Create problem (Admin)
- `GET /api/problems/:id/template/:language` - Get code template

### Submission Endpoints
- `POST /api/submissions` - Submit solution
- `GET /api/submissions` - Get submissions
- `POST /api/submissions/:id/run` - Run code

### Leaderboard Endpoints
- `GET /api/leaderboard` - Get leaderboard
- `GET /api/leaderboard/stats` - Get statistics

## 🚀 Production Deployment

### 1. Build for Production
```bash
# Build all services
npm run build

# Or use production compose
docker-compose -f docker-compose.prod.yml up --build -d
```

### 2. Environment Setup
- Copy `.env.example` to `.env`
- Use production database credentials
- Set secure JWT secrets
- Configure SSL certificates

### 3. Monitoring
- Set up logging aggregation
- Configure monitoring tools
- Set up backup procedures
- Enable health checks

## 🆘 Getting Help

### 1. Check Logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongodb
```

### 2. Health Checks
```bash
# Backend health
curl http://localhost:5000/health

# Frontend availability
curl http://localhost:3000
```

### 3. Database Status
```bash
# Connect to MongoDB
docker exec -it fixit_mongodb mongo -u admin -p fixit123

# Check collections
show dbs
use fixit_db
show collections
```

## 🎉 Success Indicators

Your FixIt platform is running successfully when:

✅ **Frontend loads** at http://localhost:3000
✅ **Backend API responds** at http://localhost:5000/health
✅ **Database is connected** (no connection errors)
✅ **Code execution works** (test with a simple problem)
✅ **Real-time features work** (leaderboard updates)
✅ **Admin panel accessible** at http://localhost:3000/admin

## 📞 Support

For additional help:
1. Check the [README.md](./README.md) for detailed documentation
2. Review [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup
3. Check logs for error messages
4. Verify all environment variables are set correctly

Happy debugging! 🐛✨
