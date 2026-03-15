// Simple test of set bits debugging judge
console.log('Starting Set Bits Debugging Judge test...');

const normalizeCode = (code, language) => {
    if (!code) return "";
    
    code = String(code).trim();
    code = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    const lines = code.split('\n');
    const normalizedLines = [];
    
    for (let line of lines) {
        line = line.trim();
        line = line.replace(/\s+/g, ' ');
        
        if (language === "python") {
            line = line.split('#')[0];
        } else {
            line = line.split('//')[0];
        }
        
        line = line.trim();
        if (line) {
            normalizedLines.push(line);
        }
    }
    
    return normalizedLines.join('\n');
};

const evaluateBug = (normalizedCode, bug, language) => {
    const normalizedBuggy = bug.buggyLine.trim();
    const normalizedFix = bug.expectedFix.trim();
    
    let adjustedBuggy = normalizedBuggy;
    let adjustedFix = normalizedFix;
    
    if (language === "java") {
        adjustedBuggy = adjustedBuggy.replace('print(', 'System.out.println(');
        adjustedFix = adjustedFix.replace('print(', 'System.out.println(');
    }
    
    const buggyPresent = normalizedCode.includes(adjustedBuggy);
    const fixPresent = normalizedCode.includes(adjustedFix);
    
    return !buggyPresent && fixPresent;
};

const testJudge = () => {
    const bugs = [
        {
            bugId: "count_initialization",
            buggyLine: "count = 2",
            expectedFix: "count = 0"
        },
        {
            bugId: "loop_condition",
            buggyLine: "while n < 0",
            expectedFix: "while n > 0"
        },
        {
            bugId: "bitwise_operator",
            buggyLine: "if (n | 1)",
            expectedFix: "if (n & 1)"
        }
    ];
    
    const correctCode = `n = int(input())
count = 0
while n > 0:
    if (n & 1) == 1:
        count = count + 1
    n = n >> 1
print(count)`;

    const incorrectCode = `n = int(input())
count = 2
while n < 0:
    if (n | 1) = 1:
        count = count + 1
    n = n << 1
print(cout)`;

    console.log('Testing correct code:');
    const normalizedCorrect = normalizeCode(correctCode, 'python');
    let allFixed = true;
    
    for (const bug of bugs) {
        const isFixed = evaluateBug(normalizedCorrect, bug, 'python');
        console.log(`Bug ${bug.bugId}: ${isFixed ? 'FIXED' : 'NOT FIXED'}`);
        if (!isFixed) allFixed = false;
    }
    console.log(`Overall: ${allFixed ? 'PASSED' : 'FAILED'}`);
    
    console.log('\nTesting incorrect code:');
    const normalizedIncorrect = normalizeCode(incorrectCode, 'python');
    allFixed = true;
    
    for (const bug of bugs) {
        const isFixed = evaluateBug(normalizedIncorrect, bug, 'python');
        console.log(`Bug ${bug.bugId}: ${isFixed ? 'FIXED' : 'NOT FIXED'}`);
        if (isFixed) allFixed = false;
    }
    console.log(`Overall: ${allFixed ? 'PASSED' : 'FAILED'}`);
    
    console.log('\nSet Bits Debugging Judge test completed!');
};

testJudge();
