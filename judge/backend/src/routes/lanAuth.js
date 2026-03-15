const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'fixit-lan-secret-2024';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    req.user = user;
    next();
  });
};

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, teamname, password, team_name, team_code, is_admin } = req.body;
    const db = req.db;

    let user;

    if (is_admin) {
      // Admin login
      if (password === 'Pspk@0902.') {
        user = await db.get('SELECT * FROM users WHERE username = ?', ['Admin']);
        
        if (!user) {
          // Create admin user if doesn't exist
          const result = await db.run(`
            INSERT INTO users (username, teamname, is_admin, score, problems_solved)
            VALUES (?, ?, ?, 0, 0)
          `, ['Admin', 'System', true]);
          
          user = {
            id: result.lastID,
            username: 'Admin',
            teamname: 'System',
            is_admin: true,
            score: 0,
            problems_solved: 0
          };
        }

        // Update last login
        await db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE username = ?', ['Admin']);
      } else {
        return res.status(401).json({
          success: false,
          message: 'Invalid admin password'
        });
      }
    } else {
      // Team login with database verification
      if (team_name && team_code) {
        // Verify team credentials against database
        const teamValid = await db.get(
          'SELECT * FROM login_details WHERE team_name = ? AND team_code = ?',
          [team_name, team_code]
        );

        if (!teamValid) {
          return res.status(401).json({
            success: false,
            message: 'Invalid team name or code'
          });
        }

        // Check if user exists in users table
        user = await db.get('SELECT * FROM users WHERE username = ?', [team_name]);
        
        if (user) {
          // Update last login
          await db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE username = ?', [team_name]);
        } else {
          // Create new user in users table
          const result = await db.run(`
            INSERT INTO users (username, teamname, is_admin, score, problems_solved)
            VALUES (?, ?, ?, 0, 0)
          `, [team_name, team_name, false]);

          // Also add to leaderboard
          await db.run(`
            INSERT INTO leaderboard (username, teamname, score, problems_solved)
            VALUES (?, ?, 0, 0)
          `, [team_name, team_name]);

          user = {
            id: result.lastID,
            username: team_name,
            teamname: team_name,
            is_admin: false,
            score: 0,
            problems_solved: 0
          };
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'Team name and code are required'
        });
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        teamname: user.teamname,
        is_admin: user.is_admin
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        teamname: user.teamname,
        is_admin: user.is_admin,
        score: user.score,
        problems_solved: user.problems_solved
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        teamname: user.teamname,
        is_admin: user.is_admin,
        score: user.score,
        problems_solved: user.problems_solved
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, (req, res) => {
  // In a real implementation, you might want to blacklist the token
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;
