# FixIt - Debugging Platform

A comprehensive full-stack web platform for debugging competitions, similar to LeetCode but focused on finding and fixing bugs in code.

## 🎯 Features

### For Event Coordinators (Admin)
- Dynamic problem management (add/edit/delete)
- Support for Python, Java, and C++ buggy code templates
- Test case management with hidden test cases
- Time and memory limit controls
- Event timer management
- Real-time leaderboard monitoring
- Submission history and logs

### For Participants (Teams)
- Secure team login system
- VS Code-style code editor with Monaco Editor
- Multi-language support (Python, Java, C++)
- Real-time code execution and testing
- Detailed test case results
- Time tracking and performance metrics
- Live leaderboard updates

### Technical Features
- Docker-based secure code execution sandbox
- Automatic judging system
- Time complexity estimation
- Anti-cheating protection
- Real-time updates with Socket.io
- Responsive dark mode UI
- RESTful API architecture

## 🏗️ Architecture

```
Frontend (React + Monaco Editor)
        ↓
Backend API (Node.js + Express)
        ↓
Authentication Service (JWT)
        ↓
Code Execution Service (Docker Sandbox)
        ↓
Database (MongoDB) + Cache (Redis)
        ↓
Real-time Updates (Socket.io)
```

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd event_fixit
   ```

2. **Environment Setup**
   ```bash
   # Copy environment files
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. **Start with Docker (Recommended)**
   ```bash
   npm run dev
   ```
   This will start all services:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - MongoDB: localhost:27017
   - Redis: localhost:6379

4. **Manual Setup (Development)**
   ```bash
   # Install dependencies
   npm run setup
   
   # Start services in separate terminals
   npm run backend:dev  # Backend on port 5000
   npm run frontend:dev # Frontend on port 3000
   ```

## 📁 Project Structure

```
event_fixit/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Authentication, validation
│   │   ├── services/       # Business logic
│   │   └── utils/          # Helper functions
│   ├── Dockerfile
│   └── package.json
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API calls
│   │   ├── utils/          # Helper functions
│   │   └── styles/         # CSS/Tailwind
│   ├── Dockerfile
│   └── package.json
├── code-executor/          # Docker sandbox for code execution
│   ├── python/
│   ├── java/
│   ├── cpp/
│   └── Dockerfile
├── docker-compose.yml      # Development environment
├── docker-compose.prod.yml # Production environment
└── README.md
```

## 🔧 Configuration

### Backend Environment Variables (.env)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/fixit_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-key
CODE_EXECUTION_TIMEOUT=30000
MAX_MEMORY_LIMIT=128m
```

### Frontend Environment Variables (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_EVENT_NAME=FixIt 2024
```

## 🏆 Competition Levels

### Level 1: Basic Debugging
- Syntax errors
- Simple logical errors
- Basic runtime errors

### Level 2: Intermediate Debugging
- Complex logical errors
- Algorithmic bugs
- Edge case handling

### Level 3: Advanced Debugging
- Performance issues
- Memory leaks
- Concurrency bugs

## 📊 Scoring System

- **Correct Submission**: +100 points
- **Time Bonus**: Up to +50 points (faster submission)
- **Wrong Submission Penalty**: -10 points
- **Final Score**: Problems solved + Time bonus - Penalties

## 🔒 Security Features

- Docker sandbox isolation
- Resource limits (CPU, memory, time)
- Input sanitization
- JWT authentication
- Rate limiting
- Anti-cheating detection

## 🚀 Deployment

### Production Deployment
```bash
# Build and deploy to production
npm run prod
```

### Cloud Deployment Options
- **AWS**: ECS with RDS MongoDB
- **Render**: Docker web service + MongoDB
- **Railway**: Docker deployment
- **VPS**: Docker Compose

## 🧪 Testing

```bash
# Run all tests
npm test

# Run backend tests
npm run test:backend

# Run frontend tests
npm run test:frontend
```

## 📚 API Documentation

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Team registration
- `POST /api/auth/verify` - JWT verification

### Problems
- `GET /api/problems` - List all problems
- `GET /api/problems/:id` - Get problem details
- `POST /api/problems` - Create problem (Admin)
- `PUT /api/problems/:id` - Update problem (Admin)
- `DELETE /api/problems/:id` - Delete problem (Admin)

### Submissions
- `POST /api/submissions` - Submit solution
- `GET /api/submissions` - Get submission history
- `GET /api/submissions/:id` - Get submission details

### Leaderboard
- `GET /api/leaderboard` - Get current leaderboard
- `WebSocket /leaderboard` - Real-time updates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
- Create an issue on GitHub
- Contact the development team
- Check the documentation

---

**Built with ❤️ for the coding community**
