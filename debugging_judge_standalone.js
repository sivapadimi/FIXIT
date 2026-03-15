const fs = require('fs');

class ValidationStatus {
    static PASSED = "PASSED";
    static FAILED = "FAILED";
    static PARTIAL = "PARTIAL";
    static CHEATING_DETECTED = "CHEATING_DETECTED";
}

class BugDefinition {
    constructor(bugId, buggyLine, expectedFix, lineNumber = null, description = "", points = 10) {
        this.bugId = bugId;
        this.buggyLine = buggyLine;
        this.expectedFix = expectedFix;
        this.lineNumber = lineNumber;
        this.description = description;
        this.points = points;
    }
}

class ProblemDefinition {
    constructor(problemId, title, description, bugs, totalPoints, language = "python") {
        this.problemId = problemId;
        this.title = title;
        this.description = description;
        this.bugs = bugs;
        this.totalPoints = totalPoints;
        this.language = language;
    }
}

class DebuggingJudge {
    constructor() {
        this.problems = new Map();
        this.antiCheatPatterns = this.initAntiCheatPatterns();
    }

    initAntiCheatPatterns() {
        return [
            /print\s*\(\s*\d+\s*\)/gi,           // print(42)
            /return\s+\d+/gi,                      // return 42
            /input\s*\(\s*["'].*["']\s*\)/gi,      // input("5")
            /exit\s*\(\s*\d+\s*\)/gi,             // exit(42)
            /sys\.exit\s*\(\s*\d+\s*\)/gi         // sys.exit(42)
        ];
    }

    normalizeLine(line) {
        // Remove leading/trailing whitespace
        line = line.trim();
        
        // Normalize internal whitespace
        line = line.replace(/\s+/g, ' ');
        
        // Remove comments
        line = line.replace(/#.*$/, '').replace(/\/\/.*$/, '');
        
        // Remove trailing whitespace again
        line = line.trim();
        
        return line;
    }

    detectCheating(code) {
        const violations = [];
        
        // Check for hardcoded outputs
        for (const pattern of this.antiCheatPatterns) {
            const matches = code.match(pattern);
            if (matches) {
                violations.push(`Potential hardcoding detected: ${matches.join(', ')}`);
            }
        }
        
        // Check for suspicious commented code
        const lines = code.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('#') || line.includes('//')) {
                const commentStart = line.indexOf('#') !== -1 ? line.indexOf('#') : line.indexOf('//');
                const commented = line.substring(commentStart + 1).trim();
                
                // Only flag if comment contains code patterns
                if ((/[a-zA-Z_][a-zA-Z0-9_]*\s*[=+\-*/]/.test(commented) || 
                     /(if|for|while|return|print)\s*\(/.test(commented)) && commented.length > 3) {
                    violations.push(`Suspicious commented code at line ${i + 1}: ${commented}`);
                }
            }
        }
        
        return { isCheating: violations.length > 0, violations };
    }

    extractLines(code) {
        const lines = code.split('\n');
        const normalizedLines = lines.map(line => this.normalizeLine(line));
        return normalizedLines.filter(line => line.length > 0); // Remove empty lines
    }

    validateSingleBug(code, bug) {
        const lines = this.extractLines(code);
        const normalizedBuggy = this.normalizeLine(bug.buggyLine);
        const normalizedFixed = this.normalizeLine(bug.expectedFix);
        
        // Check if buggy line exists (should NOT exist)
        const buggyPresent = lines.includes(normalizedBuggy);
        
        // Check if fixed line exists (should exist)
        const fixedPresent = lines.includes(normalizedFixed);
        
        // Validation logic
        if (!buggyPresent && fixedPresent) {
            return { status: ValidationStatus.PASSED, message: `Bug ${bug.bugId} fixed correctly` };
        } else if (buggyPresent && fixedPresent) {
            return { status: ValidationStatus.FAILED, message: `Bug ${bug.bugId} still present alongside fix` };
        } else if (buggyPresent && !fixedPresent) {
            return { status: ValidationStatus.FAILED, message: `Bug ${bug.bugId} still present, fix not found` };
        } else if (!buggyPresent && !fixedPresent) {
            return { status: ValidationStatus.PARTIAL, message: `Bug ${bug.bugId} removed but fix not found` };
        }
        
        return { status: ValidationStatus.FAILED, message: `Bug ${bug.bugId} validation failed` };
    }

    validateSubmission(problemId, userCode, userLanguage) {
        if (!this.problems.has(problemId)) {
            return {
                status: ValidationStatus.FAILED,
                message: `Problem ${problemId} not found`,
                score: 0,
                totalPoints: 0
            };
        }
        
        const problem = this.problems.get(problemId);
        
        // Language check
        if (problem.language !== userLanguage) {
            return {
                status: ValidationStatus.FAILED,
                message: `Language mismatch. Expected: ${problem.language}, Got: ${userLanguage}`,
                score: 0,
                totalPoints: problem.totalPoints
            };
        }
        
        // Anti-cheating check
        const { isCheating, violations } = this.detectCheating(userCode);
        if (isCheating) {
            return {
                status: ValidationStatus.CHEATING_DETECTED,
                message: `Cheating detected: ${violations.join('; ')}`,
                score: 0,
                totalPoints: problem.totalPoints,
                violations
            };
        }
        
        // Validate each bug
        const results = [];
        let totalScore = 0;
        
        for (const bug of problem.bugs) {
            const { status, message } = this.validateSingleBug(userCode, bug);
            results.push({
                bugId: bug.bugId,
                status,
                message,
                pointsEarned: status === ValidationStatus.PASSED ? bug.points : 0,
                maxPoints: bug.points
            });
            
            if (status === ValidationStatus.PASSED) {
                totalScore += bug.points;
            }
        }
        
        // Determine overall status
        const allPassed = results.every(r => r.status === ValidationStatus.PASSED);
        const anyPassed = results.some(r => r.status === ValidationStatus.PASSED);
        
        let overallStatus;
        if (allPassed) {
            overallStatus = ValidationStatus.PASSED;
        } else if (anyPassed) {
            overallStatus = ValidationStatus.PARTIAL;
        } else {
            overallStatus = ValidationStatus.FAILED;
        }
        
        return {
            status: overallStatus,
            message: `Score: ${totalScore}/${problem.totalPoints}`,
            score: totalScore,
            totalPoints: problem.totalPoints,
            bugsValidated: results
        };
    }

    addProblem(problem) {
        this.problems.set(problem.problemId, problem);
    }

    loadProblemsFromConfig(configFile) {
        const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        
        for (const problemData of config.problems) {
            const bugs = [];
            for (const bugData of problemData.bugs) {
                const bug = new BugDefinition(
                    bugData.bug_id,
                    bugData.buggy_line,
                    bugData.expected_fix,
                    bugData.line_number,
                    bugData.description,
                    bugData.points || 10
                );
                bugs.push(bug);
            }
            
            const problem = new ProblemDefinition(
                problemData.problem_id,
                problemData.title,
                problemData.description,
                bugs,
                problemData.total_points,
                problemData.language || 'python'
            );
            
            this.addProblem(problem);
        }
    }
}

// Example usage
function createSampleProblems() {
    // Problem 1: Count Set Bits - Bitwise operator bug
    const problem1 = new ProblemDefinition(
        1,
        "Count Set Bits - Fix Bitwise Bug",
        "Fix bitwise operator bug in set bits counting algorithm",
        [
            new BugDefinition(
                "bitwise_or_bug",
                "if (n | 1) == 1:",
                "if (n & 1) == 1:",
                4,
                "Change OR (|) to AND (&) operator",
                10
            ),
            new BugDefinition(
                "shift_bug",
                "n = n >> 2",
                "n = n >> 1",
                6,
                "Fix right shift from 2 to 1",
                10
            )
        ],
        20,
        "python"
    );
    
    return [problem1];
}

function main() {
    const judge = new DebuggingJudge();
    
    // Add sample problems
    for (const problem of createSampleProblems()) {
        judge.addProblem(problem);
    }
    
    // Example submissions
    const submissions = [
        {
            problemId: 1,
            language: "python",
            code: `n = int(input())
count = 0
while n > 0:
    if (n & 1) == 1:
        count += 1
    n = n >> 1
print(count)`
        },
        {
            problemId: 1,
            language: "python",
            code: `n = int(input())
count = 0
while n > 0:
    if (n | 1) == 1:
        count += 1
    n = n >> 2
print(count)`
        }
    ];
    
    // Validate submissions
    submissions.forEach((submission, i) => {
        console.log(`\n=== Submission ${i + 1} ===`);
        const result = judge.validateSubmission(
            submission.problemId,
            submission.code,
            submission.language
        );
        
        console.log(`Status: ${result.status}`);
        console.log(`Score: ${result.score}/${result.totalPoints}`);
        console.log(`Message: ${result.message}`);
        
        if (result.bugsValidated) {
            result.bugsValidated.forEach(bugResult => {
                console.log(`  Bug ${bugResult.bugId}: ${bugResult.status} (${bugResult.pointsEarned}/${bugResult.maxPoints} points)`);
            });
        }
    });
}

// Run example if called directly
if (require.main === module) {
    main();
}

module.exports = { DebuggingJudge, BugDefinition, ProblemDefinition, ValidationStatus };
