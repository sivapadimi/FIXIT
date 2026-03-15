// Simple test of line comparison judge
console.log('Starting line comparison judge test...');

const testJudge = () => {
    // Test data
    const problem = {
        problemId: 1,
        title: "Test Problem",
        language: "python",
        totalPoints: 20,
        bugs: [
            {
                bugId: "test_bug",
                buggyLine: "if (n | 1) == 1:",
                expectedFix: "if (n & 1) == 1:",
                points: 20
            }
        ]
    };
    
    // Test submissions
    const correctCode = `
n = int(input())
count = 0
while n > 0:
    if (n & 1) == 1:
        count += 1
    n = n >> 1
print(count)
`;
    
    const incorrectCode = `
n = int(input())
count = 0
while n > 0:
    if (n | 1) == 1:
        count += 1
    n = n << 1
print(count)
`;
    
    // Simple judge implementation
    const normalizeCode = (code) => {
        return code.trim().replace(/\s+/g, ' ').replace(/#.*$/gm, '');
    };
    
    const evaluateBug = (code, bug) => {
        const normalizedCode = normalizeCode(code);
        const normalizedBuggy = bug.buggyLine.trim();
        const normalizedFix = bug.expectedFix.trim();
        
        const buggyPresent = normalizedCode.includes(normalizedBuggy);
        const fixPresent = normalizedCode.includes(normalizedFix);
        
        return !buggyPresent && fixPresent;
    };
    
    // Test correct code
    console.log('Testing correct code:');
    const correctResult = evaluateBug(correctCode, problem.bugs[0]);
    console.log(`Bug fixed: ${correctResult}`);
    console.log('Expected: true');
    
    // Test incorrect code
    console.log('\nTesting incorrect code:');
    const incorrectResult = evaluateBug(incorrectCode, problem.bugs[0]);
    console.log(`Bug fixed: ${incorrectResult}`);
    console.log('Expected: false');
    
    console.log('\nLine comparison judge test completed!');
};

testJudge();
