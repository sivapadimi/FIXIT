// FixIt Platform - Line Comparison Judge Backend (Node.js)
// Lightweight, fast, and secure debugging evaluation system

const express = require('express');
const app = express();

class EvaluationStatus {
    static PASSED = "PASSED";
    static FAILED = "FAILED";
    static CHEATING_DETECTED = "CHEATING_DETECTED";
    static SYSTEM_ERROR = "SYSTEM_ERROR";
}

class LineComparisonJudge {
    constructor() {
        this.antiCheatPatterns = this.initAntiCheatPatterns();
    }

    initAntiCheatPatterns() {
        return [
            /print\s*\(\s*\d+\s*\)/gi,           // Hardcoded outputs: print(42)
            /return\s+\d+/gi,                       // Hardcoded returns: return 42
            /input\s*\(\s*["\'].*["\']\s*\)/gi,  // Bypassing input: input("5")
            /exit\s*\(\s*\d+\s*\)/gi,              // Direct exit codes
            /sys\.exit\s*\(\s*\d+\s*\)/gi,          // System exit
            /\/\/.*hardcoded|\/\*.*hardcoded/gi,      // Comments about hardcoding
            /answer\s*=\s*\d+/gi,                  // Variable assignment with hardcoded value
            /result\s*=\s*\d+/gi,                  // Result variable with hardcoded value
            /output\s*=\s*\d+/gi,                  // Output variable with hardcoded value
        ];
    }

    normalizeCode(code) {
        if (!code) return "";
        
        // Convert to string and strip whitespace
        code = String(code).trim();
        
        // Normalize line endings (convert Windows CRLF to Unix LF)
        code = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // Split into lines and normalize each line
        const lines = code.split('\n');
        const normalizedLines = [];
        
        for (let line of lines) {
            // Remove leading/trailing whitespace
            line = line.trim();
            
            // Normalize internal whitespace (multiple spaces -> single space)
            line = line.replace(/\s+/g, ' ');
            
            // Remove trailing comments
            line = line.replace(/#.*$/, '');      // Python comments
            line = line.replace(/\/\/.*$/, '');    // C++/Java comments
            line = line.replace(/\/\*.*?\*\//g, ''); // C-style comments
            
            // Remove trailing whitespace again
            line = line.trim();
            
            // Only add non-empty lines
            if (line) {
                normalizedLines.push(line);
            }
        }
        
        return normalizedLines.join('\n');
    }

    normalizeLine(line) {
        if (!line) return "";
        
        // Convert to string and strip whitespace
        line = String(line).trim();
        
        // Normalize internal whitespace
        line = line.replace(/\s+/g, ' ');
        
        // Remove comments
        line = line.replace(/#.*$/, '');      // Python
        line = line.replace(/\/\/.*$/, '');    // C++/Java
        
        return line;
    }

    detectCheating(code) {
        const violations = [];
        const normalizedCode = this.normalizeCode(code);
        
        // Check for hardcoded outputs and suspicious patterns
        for (const pattern of this.antiCheatPatterns) {
            const matches = normalizedCode.match(pattern);
            if (matches) {
                violations.push(`Potential cheating detected: ${pattern} - ${matches.join(', ')}`);
            }
        }
        
        // Check for commented out buggy lines
        const lines = normalizedCode.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check if line contains commented code patterns
            if (/#.*\b(if|for|while|return|print)\b/i.test(line)) {
                violations.push(`Suspicious commented code at line ${i + 1}: ${line}`);
            } else if (/\/\/.*\b(if|for|while|return|print)\b/i.test(line)) {
                violations.push(`Suspicious commented code at line ${i + 1}: ${line}`);
            }
        }
        
        return { isCheating: violations.length > 0, violations };
    }

    evaluateSingleBug(normalizedCode, bug) {
        // Normalize both buggy line and expected fix
        const normalizedBuggy = this.normalizeLine(bug.buggyLine);
        const normalizedFix = this.normalizeLine(bug.expectedFix);
        
        // Check if buggy line exists (should NOT exist)
        const buggyPresent = normalizedCode.includes(normalizedBuggy);
        
        // Check if fixed line exists (should exist)
        const fixPresent = normalizedCode.includes(normalizedFix);
        
        // Evaluation logic
        if (!buggyPresent && fixPresent) {
            return {
                bugId: bug.bugId,
                status: EvaluationStatus.PASSED,
                message: `Bug ${bug.bugId} fixed correctly`,
                pointsEarned: bug.points,
                maxPoints: bug.points,
                buggyLineFound: false,
                fixLineFound: true,
                description: bug.description
            };
        } else if (buggyPresent && fixPresent) {
            return {
                bugId: bug.bugId,
                status: EvaluationStatus.FAILED,
                message: `Bug ${bug.bugId} still present alongside fix`,
                pointsEarned: 0,
                maxPoints: bug.points,
                buggyLineFound: true,
                fixLineFound: true,
                description: bug.description
            };
        } else if (buggyPresent && !fixPresent) {
            return {
                bugId: bug.bugId,
                status: EvaluationStatus.FAILED,
                message: `Bug ${bug.bugId} still present, fix not found`,
                pointsEarned: 0,
                maxPoints: bug.points,
                buggyLineFound: true,
                fixLineFound: false,
                description: bug.description
            };
        } else if (!buggyPresent && !fixPresent) {
            return {
                bugId: bug.bugId,
                status: EvaluationStatus.FAILED,
                message: `Bug ${bug.bugId} removed but fix not found`,
                pointsEarned: 0,
                maxPoints: bug.points,
                buggyLineFound: false,
                fixLineFound: false,
                description: bug.description
            };
        }
        
        return {
            bugId: bug.bugId,
            status: EvaluationStatus.FAILED,
            message: `Bug ${bug.bugId} evaluation failed`,
            pointsEarned: 0,
            maxPoints: bug.points,
            buggyLineFound: false,
            fixLineFound: false,
            description: bug.description
        };
    }

    evaluateSubmission(problem, userCode, userLanguage) {
        const startTime = Date.now();
        
        // Language check
        if (problem.language !== userLanguage) {
            return {
                status: EvaluationStatus.SYSTEM_ERROR,
                score: 0,
                totalPoints: problem.totalPoints,
                bugsEvaluated: [],
                message: `Language mismatch. Expected: ${problem.language}, Got: ${userLanguage}`,
                executionTime: 0
            };
        }
        
        // Anti-cheating check
        const { isCheating, violations } = this.detectCheating(userCode);
        if (isCheating) {
            return {
                status: EvaluationStatus.CHEATING_DETECTED,
                score: 0,
                totalPoints: problem.totalPoints,
                bugsEvaluated: [],
                message: `Cheating detected: ${violations.join('; ')}`,
                executionTime: 0
            };
        }
        
        // Normalize user code
        const normalizedCode = this.normalizeCode(userCode);
        
        // Evaluate each bug
        const bugsEvaluated = [];
        let totalScore = 0;
        
        for (const bug of problem.bugs) {
            const bugResult = this.evaluateSingleBug(normalizedCode, bug);
            bugsEvaluated.push(bugResult);
            
            if (bugResult.status === EvaluationStatus.PASSED) {
                totalScore += bug.points;
            }
        }
        
        // Determine overall status
        const allPassed = bugsEvaluated.every(bug => bug.status === EvaluationStatus.PASSED);
        const anyPassed = bugsEvaluated.some(bug => bug.status === EvaluationStatus.PASSED);
        
        let overallStatus, message;
        if (allPassed) {
            overallStatus = EvaluationStatus.PASSED;
            message = `All ${problem.bugs.length} bugs fixed correctly! Score: ${totalScore}/${problem.totalPoints}`;
        } else if (anyPassed) {
            overallStatus = EvaluationStatus.FAILED;
            const passedCount = bugsEvaluated.filter(bug => bug.status === EvaluationStatus.PASSED).length;
            message = `Partial fix: ${passedCount}/${problem.bugs.length} bugs fixed. Score: ${totalScore}/${problem.totalPoints}`;
        } else {
            overallStatus = EvaluationStatus.FAILED;
            message = `No bugs fixed. Score: ${totalScore}/${problem.totalPoints}`;
        }
        
        const executionTime = Date.now() - startTime;
        
        return {
            status: overallStatus,
            score: totalScore,
            totalPoints: problem.totalPoints,
            bugsEvaluated,
            message,
            executionTime
        };
    }
}

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// POST /api/evaluate-debugging - Line comparison evaluation
app.post('/api/evaluate-debugging', (req, res) => {
    try {
        const { problemId, code, language } = req.body;
        
        if (!problemId || !code || !language) {
            return res.status(400).json({
                error: 'Missing required fields: problemId, code, language'
            });
        }
        
        // Load problem definition
        const problems = loadProblems();
        const problem = problems.find(p => p.problemId === problemId);
        
        if (!problem) {
            return res.status(404).json({
                error: `Problem ${problemId} not found`
            });
        }
        
        // Evaluate submission
        const result = (new LineComparisonJudge()).evaluateSubmission(problem, code, language);
        
        console.log(`Debugging Evaluation - Problem ${problemId}: ${result.status}`);
        console.log(`Score: ${result.score}/${result.totalPoints}`);
        console.log(`Execution Time: ${result.executionTime}ms`);
        
        res.json(result);
        
    } catch (error) {
        console.error('Evaluation error:', error);
        res.status(500).json({
            error: 'Evaluation failed',
            details: error.message
        });
    }
});

// GET /api/problems/:id - Get problem with bug definitions
app.get('/api/problems/:id', (req, res) => {
    try {
        const problemId = parseInt(req.params.id);
        const problems = loadProblems();
        const problem = problems.find(p => p.problemId === problemId);
        
        if (!problem) {
            return res.status(404).json({
                error: `Problem ${problemId} not found`
            });
        }
        
        res.json(problem);
        
    } catch (error) {
        console.error('Get problem error:', error);
        res.status(500).json({
            error: 'Failed to get problem',
            details: error.message
        });
    }
});

// Sample problem data
function loadProblems() {
    return [
        {
            problemId: 1,
            title: "Count Set Bits - Fix Multiple Bugs",
            description: "Fix all bugs in the set bits counting algorithm",
            language: "python",
            totalPoints: 30,
            bugs: [
                {
                    bugId: "bitwise_or_bug",
                    buggyLine: "if (n | 1) == 1:",
                    expectedFix: "if (n & 1) == 1:",
                    lineNumber: 4,
                    description: "Change OR (|) to AND (&) operator",
                    points: 10
                },
                {
                    bugId: "shift_bug",
                    buggyLine: "n = n << 1",
                    expectedFix: "n = n >> 1",
                    lineNumber: 6,
                    description: "Fix left shift to right shift",
                    points: 10
                },
                {
                    bugId: "initialization_bug",
                    buggyLine: "count = 2",
                    expectedFix: "count = 0",
                    lineNumber: 2,
                    description: "Initialize count to 0 instead of 2",
                    points: 10
                }
            ]
        },
        {
            problemId: 2,
            title: "Array Bounds - Fix Loop Bug",
            description: "Fix the array bounds issue in the loop",
            language: "python",
            totalPoints: 15,
            bugs: [
                {
                    bugId: "loop_bounds_bug",
                    buggyLine: "for i in range(len(arr) + 1):",
                    expectedFix: "for i in range(len(arr)):",
                    lineNumber: 3,
                    description: "Remove +1 from loop bounds",
                    points: 15
                }
            ]
        }
    ];
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`FixIt Line Comparison Judge Server running on port ${PORT}`);
    console.log('API endpoints:');
    console.log('  POST /api/evaluate-debugging - Evaluate debugging submissions');
    console.log('  GET  /api/problems/:id - Get problem with bug definitions');
    console.log('  GET  /api/test-judge - Test judge system');
});

module.exports = { LineComparisonJudge, EvaluationStatus };
