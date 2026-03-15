const logger = require('../utils/logger');

class LANDatabase {
  async createTables(db) {
    try {
      // Users table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          teamname TEXT NOT NULL,
          is_admin BOOLEAN DEFAULT FALSE,
          score INTEGER DEFAULT 0,
          problems_solved INTEGER DEFAULT 0,
          last_login DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Problems table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS problems (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          difficulty TEXT NOT NULL,
          points INTEGER NOT NULL,
          buggy_code TEXT NOT NULL,
          fixed_code TEXT NOT NULL,
          test_cases TEXT NOT NULL,
          exam_started BOOLEAN DEFAULT FALSE,
          results_visible BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Submissions table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS submissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL,
          teamname TEXT NOT NULL,
          problem_id INTEGER NOT NULL,
          problem_title TEXT NOT NULL,
          code TEXT NOT NULL,
          language TEXT NOT NULL,
          correct BOOLEAN NOT NULL,
          test_cases_passed INTEGER DEFAULT 0,
          total_test_cases INTEGER DEFAULT 0,
          execution_time INTEGER DEFAULT 0,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (problem_id) REFERENCES problems (id)
        )
      `);

      // Leaderboard table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS leaderboard (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL,
          teamname TEXT NOT NULL,
          score INTEGER DEFAULT 0,
          problems_solved INTEGER DEFAULT 0,
          last_submission DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Login details table for team authentication
      await db.exec(`
        CREATE TABLE IF NOT EXISTS login_details (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          team_name TEXT UNIQUE NOT NULL,
          team_code TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Exam status table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS exam_status (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          global_exam_active BOOLEAN DEFAULT FALSE,
          current_problem INTEGER DEFAULT NULL,
          results_visible BOOLEAN DEFAULT FALSE,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Connected teams table for real-time monitoring
      await db.exec(`
        CREATE TABLE IF NOT EXISTS connected_teams (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          socket_id TEXT UNIQUE NOT NULL,
          team_name TEXT NOT NULL,
          username TEXT NOT NULL,
          connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      logger.info('All LAN database tables created successfully');
    } catch (error) {
      logger.error(`Error creating tables: ${error.message}`);
      throw error;
    }
  }

  async seedDefaultData(db) {
    try {
      // Insert default admin user
      await db.run(`
        INSERT OR IGNORE INTO users (username, teamname, is_admin, score, problems_solved)
        VALUES ('Admin', 'System', TRUE, 0, 0)
      `);

      // Insert default team credentials
      await db.run(`
        INSERT OR IGNORE INTO login_details (team_name, team_code)
        VALUES 
          ('PSPK', 'pspk'),
          ('REBEL', 'rebel'),
          ('PAVAN', 'pavan')
      `);

      // Insert default problems
      const problems = [
        {
          title: "Count Set Bits",
          description: "Given an integer N, count the number of set bits (1s) in its binary representation.",
          difficulty: "easy",
          points: 100,
          buggy_code: JSON.stringify({
            python: `n = 7

count = 0

while n > 0:
    if (n | 1) == 1:
        count = count + 1
    n = n >> 1

print(count)`,
            java: `public class Main {
    public static void main(String[] args) {
        int n = 7;
        int count = 0;
        while (n > 0) {
            if ((n | 1) == 1) {
                count = count + 1;
            }
            n = n >> 1;
        }
        System.out.println(count);
    }
}`,
            cpp: `#include <iostream>
using namespace std;
int main() {
    int n = 7;
    int count = 0;
    while (n > 0) {
        if ((n | 1) == 1) {
            count = count + 1;
        }
        n = n >> 1;
    }
    cout << count;
    return 0;
}`
          }),
          fixed_code: JSON.stringify({
            python: `n = 7
count = 0
while n > 0:
    if (n & 1) == 1:
        count += 1
    n = n >> 1
print(count)`,
            java: `public class Main {
    public static void main(String[] args) {
        int n = 7;
        int count = 0;
        while (n > 0) {
            if ((n & 1) == 1) {
                count += 1;
            }
            n = n >> 1;
        }
        System.out.println(count);
    }
}`,
            cpp: `#include <iostream>
using namespace std;
int main() {
    int n = 7;
    int count = 0;
    while (n > 0) {
        if ((n & 1) == 1) {
            count += 1;
        }
        n = n >> 1;
    }
    cout << count;
    return 0;
}`
          }),
          test_cases: JSON.stringify([
            {"input": "1", "expected": "1", "hidden": false},
            {"input": "2", "expected": "1", "hidden": false},
            {"input": "3", "expected": "2", "hidden": false},
            {"input": "4", "expected": "1", "hidden": false},
            {"input": "5", "expected": "2", "hidden": false},
            {"input": "6", "expected": "2", "hidden": true},
            {"input": "7", "expected": "3", "hidden": true},
            {"input": "8", "expected": "1", "hidden": true},
            {"input": "9", "expected": "2", "hidden": true},
            {"input": "10", "expected": "2", "hidden": true}
          ])
        }
      ];

      for (const problem of problems) {
        await db.run(`
          INSERT OR IGNORE INTO problems 
          (title, description, difficulty, points, buggy_code, fixed_code, test_cases)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          problem.title,
          problem.description,
          problem.difficulty,
          problem.points,
          problem.buggy_code,
          problem.fixed_code,
          problem.test_cases
        ]);
      }

      // Initialize exam status
      await db.run(`
        INSERT OR IGNORE INTO exam_status (global_exam_active, current_problem, results_visible)
        VALUES (FALSE, NULL, FALSE)
      `);

      logger.info('Default data seeded successfully');
    } catch (error) {
      logger.error(`Error seeding data: ${error.message}`);
      throw error;
    }
  }

  async getUser(db, username) {
    return await db.get('SELECT * FROM users WHERE username = ?', [username]);
  }

  async createUser(db, username, teamname, isAdmin = false) {
    try {
      const result = await db.run(`
        INSERT INTO users (username, teamname, is_admin)
        VALUES (?, ?, ?)
      `, [username, teamname, isAdmin]);
      
      // Also add to leaderboard
      await db.run(`
        INSERT INTO leaderboard (username, teamname, score, problems_solved)
        VALUES (?, ?, 0, 0)
      `, [username, teamname]);
      
      return result.lastID;
    } catch (error) {
      logger.error(`Error creating user: ${error.message}`);
      throw error;
    }
  }

  async updateUserScore(db, username, score, problemsSolved) {
    await db.run(`
      UPDATE users 
      SET score = ?, problems_solved = ?
      WHERE username = ?
    `, [score, problemsSolved, username]);

    await db.run(`
      UPDATE leaderboard 
      SET score = ?, problems_solved = ?, last_submission = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE username = ?
    `, [score, problemsSolved, username]);
  }

  async getLeaderboard(db) {
    return await db.all(`
      SELECT * FROM leaderboard 
      ORDER BY score DESC, problems_solved DESC, last_submission ASC
    `);
  }

  async addSubmission(db, submission) {
    try {
      const result = await db.run(`
        INSERT INTO submissions 
        (username, teamname, problem_id, problem_title, code, language, correct, test_cases_passed, total_test_cases)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        submission.username,
        submission.teamname,
        submission.problemId,
        submission.problemTitle,
        submission.code,
        submission.language,
        submission.correct,
        submission.testCasesPassed,
        submission.totalTestCases
      ]);
      
      return result.lastID;
    } catch (error) {
      logger.error(`Error adding submission: ${error.message}`);
      throw error;
    }
  }

  async getSubmissions(db, username = null) {
    if (username) {
      return await db.all(`
        SELECT * FROM submissions 
        WHERE username = ? 
        ORDER BY timestamp DESC
      `, [username]);
    }
    return await db.all(`
      SELECT * FROM submissions 
      ORDER BY timestamp DESC
    `);
  }

  async verifyTeamCredentials(db, teamName, teamCode) {
    const result = await db.get(
      'SELECT * FROM login_details WHERE team_name = ? AND team_code = ?',
      [teamName, teamCode]
    );
    return result !== undefined;
  }

  async addConnectedTeam(db, socketId, teamName, username) {
    try {
      await db.run(`
        INSERT OR REPLACE INTO connected_teams (socket_id, team_name, username, connected_at, last_activity)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [socketId, teamName, username]);
    } catch (error) {
      logger.error(`Error adding connected team: ${error.message}`);
    }
  }

  async removeConnectedTeam(db, socketId) {
    try {
      await db.run('DELETE FROM connected_teams WHERE socket_id = ?', [socketId]);
    } catch (error) {
      logger.error(`Error removing connected team: ${error.message}`);
    }
  }

  async getConnectedTeams(db) {
    return await db.all(`
      SELECT * FROM connected_teams 
      ORDER BY connected_at DESC
    `);
  }

  async updateExamStatus(db, examActive, currentProblem, resultsVisible) {
    await db.run(`
      UPDATE exam_status 
      SET global_exam_active = ?, current_problem = ?, results_visible = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `, [examActive, currentProblem, resultsVisible]);
  }

  async getExamStatus(db) {
    return await db.get('SELECT * FROM exam_status WHERE id = 1');
  }
}

module.exports = new LANDatabase();
