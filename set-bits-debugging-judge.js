// FixIt Platform - Set Bits Counting Problem Integration (Node.js)
// Multi-language debugging problem with line comparison evaluation

const express = require('express');

class SetBitsDebuggingJudge {
    constructor() {
        this.problem = this.createSetBitsProblem();
    }

    createSetBitsProblem() {
        // Bug definitions (common across all languages)
        const bugs = [
            {
                bugId: "count_initialization",
                buggyLine: "count = 2",
                expectedFix: "count = 0",
                description: "Count should start from 0",
                points: 10
            },
            {
                bugId: "loop_condition",
                buggyLine: "while n < 0",
                expectedFix: "while n > 0",
                description: "Loop should run while n is positive",
                points: 15
            },
            {
                bugId: "bitwise_operator",
                buggyLine: "if (n | 1)",
                expectedFix: "if (n & 1)",
                description: "Use AND to check the last bit",
                points: 15
            },
            {
                bugId: "comparison_operator",
                buggyLine: "= 1",
                expectedFix: "== 1",
                description: "Use comparison operator instead of assignment",
                points: 15
            },
            {
                bugId: "shift_direction",
                buggyLine: "n = n << 1",
                expectedFix: "n = n >> 1",
                description: "Shift right to remove processed bit",
                points: 15
            },
            {
                bugId: "print_typo",
                buggyLine: "print(cout)",
                expectedFix: "print(count)",
                description: "Variable name typo",
                points: 10
            }
        ];

        // Language-specific code
        const languages = {
            python: {
                buggyCode: `n = int(input())

count = 2

while n < 0:
    if (n | 1) = 1:
        count = count + 1
    n = n << 1

print(cout)`,
                correctCode: `n = int(input())

count = 0

while n > 0:
    if (n & 1) == 1:
        count = count + 1
    n = n >> 1

print(count)`
            },
            java: {
                buggyCode: `import java.util.*;

public class Main {
    public static void main(String[] args) {

        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();

        int count = 2;

        while (n < 0) {
            if ((n | 1) = 1) {
                count = count + 1;
            }
            n = n << 1;
        }

        System.out.println(cout);
    }
}`,
                correctCode: `import java.util.*;

public class Main {
    public static void main(String[] args) {

        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();

        int count = 0;

        while (n > 0) {
            if ((n & 1) == 1) {
                count = count + 1;
            }
            n = n >> 1;
        }

        System.out.println(count);
    }
}`
            },
            cpp: {
                buggyCode: `#include <iostream>
using namespace std;

int main() {

    int n;
    cin >> n;

    int count = 2;

    while (n < 0) {
        if ((n | 1) = 1) {
            count = count + 1;
        }
        n = n << 1;
    }

    cout << cout;

    return 0;
}`,
                correctCode: `#include <iostream>
using namespace std;

int main() {

    int n;
    cin >> n;

    int count = 0;

    while (n > 0) {
        if ((n & 1) == 1) {
            count = count + 1;
        }
        n = n >> 1;
    }

    cout << count;

    return 0;
}`
            }
        };

        return {
            problemId: 1,
            title: "Count Set Bits - Debug the Algorithm",
            description: "Given an integer N, count the number of set bits (1s) in its binary representation. Fix all bugs in the provided code.",
            bugs,
            totalPoints: 80,
            languages
        };
    }

    normalizeCode(code, language) {
        if (!code) return "";
        
        // Convert to string and strip whitespace
        code = String(code).trim();
        
        // Normalize line endings
        code = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // Split into lines and normalize each line
        const lines = code.split('\n');
        const normalizedLines = [];
        
        for (let line of lines) {
            // Remove leading/trailing whitespace
            line = line.trim();
            
            // Normalize internal whitespace (multiple spaces -> single space)
            line = line.replace(/\s+/g, ' ');
            
            // Language-specific comment removal
            if (language === "python") {
                line = line.split('#')[0];  // Remove Python comments
            } else if (language === "java" || language === "cpp") {
                line = line.split('//')[0];  // Remove C++/Java comments
                // Remove C-style comments
                if (line.includes('/*')) {
                    line = line.split('/*')[0];
                }
            }
            
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
        
        return line;
    }

    detectCheating(code, language) {
        const violations = [];
        const normalizedCode = this.normalizeCode(code, language);
        
        // Check for hardcoded outputs (only obvious patterns)
        const hardcodedPatterns = [
            /print\s*\(\s*\d+\s*\)/gi,           // print(42)
            /cout\s*<<\s*\d+/gi,                  // cout << 42
            /System\.out\.println\s*\(\s*\d+\s*\)/gi,  // System.out.println(42)
            /return\s+\d+/gi,                       // return 42
        ];
        
        for (const pattern of hardcodedPatterns) {
            const matches = normalizedCode.match(pattern);
            if (matches) {
                violations.push(`Hardcoded output detected: ${pattern}`);
            }
        }
        
        // Check for suspicious comments (only if they contain actual code)
        const lines = normalizedCode.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Only flag if line has actual comment patterns with code keywords
            if ((('#' in line && /if|while|for|return|print/i.test(line)) ||
                ('//' in line && /if|while|for|return|print/i.test(line)))) {
                violations.push(`Suspicious commented code at line ${i + 1}: ${line}`);
            }
        }
        
        return { isCheating: violations.length > 0, violations };
    }

    evaluateSingleBug(normalizedCode, bug, language) {
        // Normalize both buggy line and expected fix
        const normalizedBuggy = this.normalizeLine(bug.buggyLine);
        const normalizedFix = this.normalizeLine(bug.expectedFix);
        
        // Language-specific adjustments
        let adjustedBuggy = normalizedBuggy;
        let adjustedFix = normalizedFix;
        
        if (language === "java") {
            // Java-specific normalization
            adjustedBuggy = adjustedBuggy.replace('print(', 'System.out.println(');
            adjustedFix = adjustedFix.replace('print(', 'System.out.println(');
            adjustedBuggy = adjustedBuggy.replace('cout', 'System.out.println');
            adjustedFix = adjustedFix.replace('cout', 'System.out.println');
        } else if (language === "cpp") {
            // C++ specific normalization
            adjustedBuggy = adjustedBuggy.replace('print(', 'cout <<');
            adjustedFix = adjustedFix.replace('print(', 'cout <<');
        }
        
        // Check if buggy line exists (should NOT exist)
        const buggyPresent = normalizedCode.includes(adjustedBuggy);
        
        // Check if fixed line exists (should exist)
        const fixPresent = normalizedCode.includes(adjustedFix);
        
        // Evaluation logic
        if (!buggyPresent && fixPresent) {
            return {
                bugId: bug.bugId,
                status: "PASSED",
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
                status: "FAILED",
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
                status: "FAILED",
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
                status: "FAILED",
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
            status: "FAILED",
            message: `Bug ${bug.bugId} evaluation failed`,
            pointsEarned: 0,
            maxPoints: bug.points,
            buggyLineFound: false,
            fixLineFound: false,
            description: bug.description
        };
    }

    evaluateSubmission(userCode, userLanguage) {
        const startTime = Date.now();
        
        // Language validation
        if (!this.problem.languages[userLanguage]) {
            return {
                status: "SYSTEM_ERROR",
                score: 0,
                totalPoints: this.problem.totalPoints,
                bugsEvaluated: [],
                message: `Unsupported language: ${userLanguage}`,
                executionTime: 0
            };
        }
        
        // Anti-cheating check
        const { isCheating, violations } = this.detectCheating(userCode, userLanguage);
        if (isCheating) {
            return {
                status: "CHEATING_DETECTED",
                score: 0,
                totalPoints: this.problem.totalPoints,
                bugsEvaluated: [],
                message: `Cheating detected: ${violations.join('; ')}`,
                executionTime: 0
            };
        }
        
        // Normalize user code
        const normalizedCode = this.normalizeCode(userCode, userLanguage);
        
        // Evaluate each bug
        const bugsEvaluated = [];
        let totalScore = 0;
        
        for (const bug of this.problem.bugs) {
            const bugResult = this.evaluateSingleBug(normalizedCode, bug, userLanguage);
            bugsEvaluated.push(bugResult);
            
            if (bugResult.status === "PASSED") {
                totalScore += bug.points;
            }
        }
        
        // Determine overall status
        const allPassed = bugsEvaluated.every(bug => bug.status === "PASSED");
        const anyPassed = bugsEvaluated.some(bug => bug.status === "PASSED");
        
        let overallStatus, message;
        if (allPassed) {
            overallStatus = "PASSED";
            message = `All ${this.problem.bugs.length} bugs fixed correctly! Score: ${totalScore}/${this.problem.totalPoints}`;
        } else if (anyPassed) {
            overallStatus = "FAILED";
            const passedCount = bugsEvaluated.filter(bug => bug.status === "PASSED").length;
            message = `Partial fix: ${passedCount}/${this.problem.bugs.length} bugs fixed. Score: ${totalScore}/${this.problem.totalPoints}`;
        } else {
            overallStatus = "FAILED";
            message = `No bugs fixed. Score: ${totalScore}/${this.problem.totalPoints}`;
        }
        
        const executionTime = Date.now() - startTime;
        
        return {
            status: overallStatus,
            score: totalScore,
            totalPoints: this.problem.totalPoints,
            bugsEvaluated,
            message,
            executionTime,
            fixedBugs: bugsEvaluated.filter(bug => bug.status === "PASSED").length,
            totalBugs: this.problem.bugs.length
        };
    }

    getProblemDefinition() {
        return {
            problemId: this.problem.problemId,
            title: this.problem.title,
            description: this.problem.description,
            totalPoints: this.problem.totalPoints,
            bugs: this.problem.bugs.map(bug => ({
                bugId: bug.bugId,
                buggyLine: bug.buggyLine,
                expectedFix: bug.expectedFix,
                description: bug.description,
                points: bug.points
            })),
            languages: Object.keys(this.problem.languages).reduce((acc, lang) => {
                acc[lang] = {
                    buggyCode: this.problem.languages[lang].buggyCode,
                    correctCode: this.problem.languages[lang].correctCode
                };
                return acc;
            }, {})
        };
    }
}

// Test the judge
function testSetBitsJudge() {
    console.log('=== FixIt Platform - Set Bits Counting Debugging Problem ===\n');
    
    const judge = new SetBitsDebuggingJudge();
    
    // Test submissions
    const testSubmissions = [
        {
            language: "python",
            code: `n = int(input())

count = 0

while n > 0:
    if (n & 1) == 1:
        count = count + 1
    n = n >> 1

print(count)`,
            expected: "PASSED"
        },
        {
            language: "python", 
            code: `n = int(input())

count = 2

while n < 0:
    if (n | 1) = 1:
        count = count + 1
    n = n << 1

print(cout)`,
            expected: "FAILED"
        },
        {
            language: "java",
            code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int count = 0;
        while (n > 0) {
            if ((n & 1) == 1) {
                count = count + 1;
            }
            n = n >> 1;
        }
        System.out.println(count);
    }
}`,
            expected: "PASSED"
        },
        {
            language: "cpp",
            code: `#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    int count = 0;
    while (n > 0) {
        if ((n & 1) == 1) {
            count = count + 1;
        }
        n = n >> 1;
    }
    cout << count;
    return 0;
}`,
            expected: "PASSED"
        }
    ];
    
    for (let i = 0; i < testSubmissions.length; i++) {
        const submission = testSubmissions[i];
        console.log('='.repeat(60));
        console.log(`Test Submission ${i + 1} (${submission.language.toUpperCase()})`);
        console.log('='.repeat(60));
        
        const result = judge.evaluateSubmission(submission.code, submission.language);
        
        console.log(`Status: ${result.status}`);
        console.log(`Expected: ${submission.expected}`);
        console.log(`Score: ${result.score}/${result.totalPoints}`);
        console.log(`Fixed Bugs: ${result.fixedBugs}/${result.totalBugs}`);
        console.log(`Message: ${result.message}`);
        console.log(`Execution Time: ${result.executionTime}ms`);
        
        console.log('\nBug Evaluation Details:');
        for (const bugResult of result.bugsEvaluated) {
            console.log(`  ${bugResult.bugId}: ${bugResult.status}`);
            console.log(`    ${bugResult.message}`);
            console.log(`    Points: ${bugResult.pointsEarned}/${bugResult.maxPoints}`);
        }
        
        console.log();
    }
    
    // Display problem definition
    console.log('='.repeat(60));
    console.log('PROBLEM DEFINITION');
    console.log('='.repeat(60));
    
    const problemDef = judge.getProblemDefinition();
    console.log(`Problem ID: ${problemDef.problemId}`);
    console.log(`Title: ${problemDef.title}`);
    console.log(`Description: ${problemDef.description}`);
    console.log(`Total Points: ${problemDef.totalPoints}`);
    console.log(`Languages: ${Object.keys(problemDef.languages).join(', ')}`);
    
    console.log('\nBug Definitions:');
    for (const bug of problemDef.bugs) {
        console.log(`  ${bug.bugId}:`);
        console.log(`    Buggy: ${bug.buggyLine}`);
        console.log(`    Fixed: ${bug.expectedFix}`);
        console.log(`    Points: ${bug.points}`);
        console.log(`    Description: ${bug.description}`);
    }
}

// Run tests
testSetBitsJudge();

module.exports = { SetBitsDebuggingJudge };
