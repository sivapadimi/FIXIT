# FixIt LAN Competition Mode

A complete offline debugging competition system that works over WiFi networks without internet connectivity.

## 🚀 Quick Start

### Windows Users
```bash
# Run the deployment script
lan-deploy.bat

# Or manually:
npm run lan:deploy
```

### Linux/Mac Users
```bash
# Make the script executable
chmod +x lan-deploy.sh

# Run the deployment script
./lan-deploy.sh

# Or manually:
npm run lan:deploy
```

## 📋 Requirements

- **Node.js** 18.0.0 or higher
- **npm** 8.0.0 or higher
- **WiFi router or hotspot** for network connectivity
- **30+ laptops** can connect simultaneously

## 🏗️ Architecture

### Admin Laptop (Server)
```
┌─────────────────┐
│   Admin Laptop  │  ← Runs FixIt LAN Server
│   Port: 5000    │  ← SQLite Database
│   IP: 192.168.x.x│
└─────────────────┘
        │
        │ WiFi Network
        │
┌───────┴───────┐
│               │
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│Team1│ │Team2│ │Team3│ │Team4│
└─────┘ └─────┘ └─────┘ └─────┘
```

### Technical Stack
- **Backend**: Node.js + Express + SQLite
- **Frontend**: React + TailwindCSS + Monaco Editor
- **Real-time**: Socket.io for live updates
- **Database**: SQLite (single file, zero dependencies)

## 🔧 Features

### 🌐 Network Configuration
- **Auto IP Detection**: Automatically finds local IP address
- **Multi-device Support**: 30+ concurrent connections
- **Zero Internet Required**: Complete offline operation
- **Cross-platform**: Windows, Linux, Mac support

### 👥 Team Management
- **Pre-configured Teams**:
  - PSPK / pspk
  - REBEL / rebel
  - PAVAN / pavan
- **Real-time Monitoring**: See connected teams
- **Live Activity Tracking**: Monitor team progress

### 🎯 Competition Features
- **Live Leaderboard**: Real-time score updates
- **Problem Management**: Debugging challenges
- **Submission Tracking**: Instant validation
- **Admin Controls**: Start/stop competitions

### 📊 Admin Panel
- **Connected Teams**: Monitor all participants
- **Competition Control**: Start/stop events
- **Broadcast Messages**: Send announcements
- **Statistics**: Real-time competition metrics

## 🛠️ Setup Instructions

### 1. Initial Setup
```bash
# Clone or extract the project
cd event_fixit

# Run LAN setup (installs dependencies and builds frontend)
npm run lan:setup
```

### 2. Start Server
```bash
# Start LAN competition server
npm run lan:start
```

### 3. Access Information
The server will display:
```
🌐 Server running in LAN mode
=====================================
📡 Access from other laptops:
   http://192.168.x.x:5000
🏠 Local access:
   http://localhost:5000
=====================================
```

### 4. Team Access
Each team opens their browser and navigates to:
```
http://SERVER_IP:5000
```

## 🎮 Usage Guide

### For Admin
1. **Start Server**: Run `npm run lan:start`
2. **Login**: Use admin credentials
3. **Monitor Teams**: View connected participants
4. **Control Competition**: Start/stop events
5. **Broadcast Messages**: Send announcements

### For Participants
1. **Open Browser**: Navigate to server IP
2. **Login**: Use team credentials
3. **Solve Problems**: Debug code challenges
4. **Submit Solutions**: Get instant feedback
5. **View Leaderboard**: Track progress

## 🔐 Authentication

### Admin Access
- **Username**: Admin
- **Password**: Pspk@0902.

### Team Access
- **Team PSPK**: Username=PSPK, Code=pspk
- **Team REBEL**: Username=REBEL, Code=rebel  
- **Team PAVAN**: Username=PAVAN, Code=pavan

## 📱 Network Configuration

### WiFi Setup Options

#### Option 1: WiFi Router
```
Router (192.168.1.1)
    │
    ├── Admin Laptop (192.168.1.100)
    ├── Team 1 Laptop (192.168.1.101)
    ├── Team 2 Laptop (192.168.1.102)
    └── ... (up to 30+ devices)
```

#### Option 2: Mobile Hotspot
```
Admin Phone Hotspot
    │
    ├── Admin Laptop (192.168.43.1)
    ├── Team 1 Laptop (192.168.43.2)
    ├── Team 2 Laptop (192.168.43.3)
    └── ... (up to 30+ devices)
```

### Port Configuration
- **Server Port**: 5000
- **Socket.io Port**: 5000 (same as HTTP)
- **Firewall**: Ensure port 5000 is open

## 🗄️ Database

### SQLite Database
- **File**: `backend/competition.db`
- **Tables**: users, problems, submissions, leaderboard, login_details
- **Backup**: Simple file copy
- **Reset**: Delete database file to reset

### Data Persistence
- **User Scores**: Automatically saved
- **Submissions**: Complete history
- **Competition State**: Preserved across restarts

## 🔧 Troubleshooting

### Common Issues

#### Server Not Starting
```bash
# Check if port is in use
netstat -ano | findstr :5000

# Kill process if needed (Windows)
taskkill /F /PID <PID>

# Try different port
PORT=5001 npm run lan:start
```

#### Teams Can't Connect
1. **Check Firewall**: Allow port 5000
2. **Verify IP**: Use correct server IP
3. **Network**: Ensure same WiFi network
4. **Antivirus**: Temporarily disable if blocking

#### Socket.io Issues
1. **Refresh Browser**: Clear cache
2. **Check Network**: Stable WiFi connection
3. **Restart Server**: Full restart if needed

### Performance Optimization

#### For 30+ Teams
- **Server Specs**: Minimum 8GB RAM, i5 processor
- **Network**: 5GHz WiFi recommended
- **Location**: Central router placement

#### Database Optimization
- **Cleanup**: Regular old data removal
- **Backup**: Before major competitions
- **Monitor**: Check database size

## 📊 Monitoring

### Real-time Metrics
- **Connected Teams**: Live count
- **Active Submissions**: Real-time tracking
- **Leaderboard Updates**: Instant propagation
- **Server Performance**: Resource monitoring

### Admin Dashboard
- **Team Status**: Online/offline
- **Submission History**: Complete log
- **Competition Progress**: Time tracking
- **System Health**: Server metrics

## 🚀 Advanced Features

### Custom Problems
Add new debugging challenges to the database:
```sql
INSERT INTO problems (title, description, difficulty, points, buggy_code, fixed_code, test_cases)
VALUES ('New Problem', 'Description', 'easy', 100, 'buggy_code', 'fixed_code', 'test_cases');
```

### Custom Teams
Add new team credentials:
```sql
INSERT INTO login_details (team_name, team_code)
VALUES ('NEWTEAM', 'newcode');
```

### Competition Modes
- **Practice Mode**: No time limits
- **Competition Mode**: Timed events
- **Custom Mode**: Custom rules

## 📝 Development

### File Structure
```
event_fixit/
├── backend/
│   ├── src/
│   │   ├── lan-server.js      # LAN mode server
│   │   ├── routes/lan*.js     # LAN routes
│   │   └── services/lan*.js   # LAN services
│   └── competition.db         # SQLite database
├── frontend/
│   ├── dist/                  # Built frontend
│   └── src/config/lanApi.js   # LAN API config
└── lan-deploy.bat/.sh         # Deployment scripts
```

### Environment Variables
```bash
# backend/.env.lan
PORT=5000
NODE_ENV=production
JWT_SECRET=fixit-lan-secret-2024

# frontend/.env.lan
VITE_SERVER_URL=http://localhost:5000
VITE_MODE=lan
```

## 🎯 Best Practices

### Before Competition
1. **Test Network**: Verify connectivity
2. **Backup Database**: Save current state
3. **Check Hardware**: Ensure server stability
4. **Prepare Teams**: Distribute credentials

### During Competition
1. **Monitor Server**: Check performance
2. **Backup Progress**: Regular saves
3. **Handle Issues**: Quick troubleshooting
4. **Communicate**: Clear announcements

### After Competition
1. **Save Results**: Export leaderboard
2. **Backup Database**: Preserve submissions
3. **Clean Up**: Remove temporary data
4. **Review**: Analyze performance

## 📞 Support

### Technical Issues
- **Network Problems**: Check WiFi configuration
- **Database Issues**: Verify SQLite file permissions
- **Performance**: Monitor server resources

### Feature Requests
- **New Problems**: Add to database
- **Custom Modes**: Modify server code
- **Integration**: Extend functionality

---

## 🏆 Competition Success

With FixIt LAN Mode, you can conduct:
- **30+ participant competitions**
- **Complete offline operation**
- **Real-time debugging challenges**
- **Professional competition experience**

**Perfect for:**
- University coding events
- Corporate training sessions
- Hackathons
- Technical workshops
- Educational institutions

---

**FixIt LAN Mode**: Where debugging meets competition! 🚀
