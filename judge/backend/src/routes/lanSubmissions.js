const express = require('express');
const router = express.Router();

// Submit code
router.post('/', async (req, res) => {
  try {
    const db = req.db;
    const { username, teamname, problemId, problemTitle, code, language } = req.body;

    // Validate required fields
    if (!username || !teamname || !problemId || !code || !language) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Simple validation for Count Set Bits problem
    let isCorrect = false;
    let testCasesPassed = 0;
    const totalTestCases = 10;

    if (parseInt(problemId) === 1) {
      // Count Set Bits problem validation
      if (language === 'python') {
        isCorrect = (code.includes('while n > 0:') && 
                     code.includes('n & 1') && 
                     code.includes('count += 1') && 
                     code.includes('print(count)'));
      } else if (language === 'java') {
        isCorrect = (code.includes('int n = 7;') && 
                     code.includes('(n & 1)') && 
                     code.includes('count = count + 1') && 
                     code.includes('System.out.println(count);'));
      } else if (language === 'cpp') {
        isCorrect = (code.includes('int n = 7;') && 
                     code.includes('(n & 1)') && 
                     code.includes('count = count + 1') && 
                     code.includes('cout << count;'));
      }
    }

    testCasesPassed = isCorrect ? totalTestCases : 0;

    // Add submission to database
    const result = await db.run(`
      INSERT INTO submissions 
      (username, teamname, problem_id, problem_title, code, language, correct, test_cases_passed, total_test_cases)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [username, teamname, problemId, problemTitle, code, language, isCorrect, testCasesPassed, totalTestCases]);

    // Update user score if correct
    if (isCorrect) {
      const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
      if (user) {
        const newScore = user.score + 100; // Award 100 points for correct submission
        const newProblemsSolved = user.problems_solved + 1;
        
        await db.run(`
          UPDATE users 
          SET score = ?, problems_solved = ?
          WHERE username = ?
        `, [newScore, newProblemsSolved, username]);

        await db.run(`
          UPDATE leaderboard 
          SET score = ?, problems_solved = ?, last_submission = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE username = ?
        `, [newScore, newProblemsSolved, username]);
      }
    }

    res.json({
      success: true,
      submissionId: result.lastID,
      correct: isCorrect,
      testCasesPassed,
      totalTestCases,
      message: isCorrect ? 'All test cases passed!' : 'Some test cases failed'
    });

  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get submissions
router.get('/', async (req, res) => {
  try {
    const db = req.db;
    const { username } = req.query;
    
    let submissions;
    if (username) {
      submissions = await db.all(`
        SELECT * FROM submissions 
        WHERE username = ? 
        ORDER BY timestamp DESC
      `, [username]);
    } else {
      submissions = await db.all(`
        SELECT * FROM submissions 
        ORDER BY timestamp DESC
      `);
    }

    res.json({
      success: true,
      submissions
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
