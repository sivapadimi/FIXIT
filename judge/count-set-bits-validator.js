/**
 * Judge System Validator for Count Set Bits Problem
 * Ensures accurate comparison and avoids false negatives
 */

class CountSetBitsValidator {
    constructor() {
        this.problemName = "Count Set Bits";
        this.tolerance = 0; // No tolerance for exact integer match
    }

    /**
     * Validate input format
     */
    validateInput(input) {
        const trimmedInput = input.trim();
        
        // Check if input is empty
        if (!trimmedInput) {
            return { valid: false, error: "Empty input" };
        }
        
        // Check if input is a valid non-negative integer
        const num = parseInt(trimmedInput, 10);
        
        if (isNaN(num)) {
            return { valid: false, error: "Input is not a valid integer" };
        }
        
        if (num < 0) {
            return { valid: false, error: "Input must be non-negative" };
        }
        
        if (num > 2147483648) {
            return { valid: false, error: "Input too large (max: 2147483648)" };
        }
        
        return { valid: true, normalizedInput: num };
    }

    /**
     * Validate output format
     */
    validateOutput(output) {
        const trimmedOutput = output.trim();
        
        // Check if output is empty
        if (!trimmedOutput) {
            return { valid: false, error: "Empty output" };
        }
        
        // Check if output is a valid non-negative integer
        const num = parseInt(trimmedOutput, 10);
        
        if (isNaN(num)) {
            return { valid: false, error: "Output is not a valid integer" };
        }
        
        if (num < 0) {
            return { valid: false, error: "Output must be non-negative" };
        }
        
        return { valid: true, normalizedOutput: num };
    }

    /**
     * Calculate expected output using reference implementation
     */
    calculateExpectedOutput(input) {
        // Brian Kernighan's algorithm
        let n = input;
        let count = 0;
        
        while (n > 0) {
            n &= (n - 1);
            count++;
        }
        
        return count;
    }

    /**
     * Compare user output with expected output
     */
    compareOutputs(userOutput, expectedOutput) {
        // Exact integer comparison required
        return userOutput === expectedOutput;
    }

    /**
     * Run complete test case validation
     */
    validateTestCase(input, userOutput, expectedOutput) {
        // Validate input
        const inputValidation = this.validateInput(input);
        if (!inputValidation.valid) {
            return {
                passed: false,
                error: `Invalid input: ${inputValidation.error}`,
                score: 0
            };
        }

        // Validate user output
        const outputValidation = this.validateOutput(userOutput);
        if (!outputValidation.valid) {
            return {
                passed: false,
                error: `Invalid output: ${outputValidation.error}`,
                score: 0
            };
        }

        // Calculate expected output
        const calculatedExpected = this.calculateExpectedOutput(inputValidation.normalizedInput);
        
        // Verify provided expected output matches calculated
        if (expectedOutput !== calculatedExpected) {
            return {
                passed: false,
                error: `Test case error: Expected output ${expectedOutput} should be ${calculatedExpected}`,
                score: 0
            };
        }

        // Compare user output with expected
        const isCorrect = this.compareOutputs(outputValidation.normalizedOutput, expectedOutput);

        return {
            passed: isCorrect,
            error: null,
            score: isCorrect ? 100 : 0,
            details: {
                input: inputValidation.normalizedInput,
                userOutput: outputValidation.normalizedOutput,
                expectedOutput: expectedOutput,
                binary: inputValidation.normalizedInput.toString(2),
                explanation: this.generateExplanation(inputValidation.normalizedInput, expectedOutput)
            }
        };
    }

    /**
     * Generate explanation for test case
     */
    generateExplanation(input, expectedOutput) {
        const binary = input.toString(2);
        const setBits = binary.split('1').length - 1;
        
        return `Input: ${input}, Binary: ${binary}, Set bits: ${setBits}, Expected output: ${expectedOutput}`;
    }

    /**
     * Batch validation for multiple test cases
     */
    validateTestCases(testCases, userOutputs) {
        const results = [];
        let totalScore = 0;
        let passedCount = 0;

        for (let i = 0; i < testCases.length; i++) {
            const testCase = testCases[i];
            const userOutput = userOutputs[i] || "";

            const result = this.validateTestCase(
                testCase.input,
                userOutput,
                testCase.expected_output
            );

            results.push({
                testCaseId: testCase.id,
                ...result
            });

            totalScore += result.score;
            if (result.passed) {
                passedCount++;
            }
        }

        return {
            results,
            summary: {
                totalTestCases: testCases.length,
                passed: passedCount,
                failed: testCases.length - passedCount,
                totalScore: totalScore,
                percentage: Math.round((totalScore / (testCases.length * 100)) * 100)
            }
        };
    }

    /**
     * Debug information for failed test cases
     */
    debugFailedCase(testCase, userOutput) {
        const validation = this.validateTestCase(
            testCase.input,
            userOutput,
            testCase.expected_output
        );

        return {
            testCase: testCase,
            userOutput: userOutput,
            validation: validation,
            debugInfo: {
                inputBinary: testCase.input.toString(2),
                expectedCalculation: this.calculateExpectedOutput(parseInt(testCase.input)),
                manualVerification: this.manualCountSetBits(testCase.input)
            }
        };
    }

    /**
     * Manual verification for debugging
     */
    manualCountSetBits(n) {
        const binary = n.toString(2);
        return (binary.match(/1/g) || []).length;
    }

    /**
     * Performance benchmark for different algorithms
     */
    benchmarkAlgorithms(testInput) {
        const iterations = 1000000;
        const n = parseInt(testInput);

        // Brian Kernighan's Algorithm
        const start1 = performance.now();
        for (let i = 0; i < iterations; i++) {
            let count = 0;
            let temp = n;
            while (temp > 0) {
                temp &= (temp - 1);
                count++;
            }
        }
        const time1 = performance.now() - start1;

        // Bit shifting
        const start2 = performance.now();
        for (let i = 0; i < iterations; i++) {
            let count = 0;
            let temp = n;
            while (temp > 0) {
                count += temp & 1;
                temp >>= 1;
            }
        }
        const time2 = performance.now() - start2;

        // Built-in method
        const start3 = performance.now();
        for (let i = 0; i < iterations; i++) {
            n.toString(2).split('1').length - 1;
        }
        const time3 = performance.now() - start3;

        return {
            brianKernighan: time1,
            bitShifting: time2,
            builtin: time3,
            winner: Math.min(time1, time2, time3)
        };
    }
}

// Export for use in judge system
module.exports = CountSetBitsValidator;

// Example usage
if (require.main === module) {
    const validator = new CountSetBitsValidator();
    
    // Test example
    const testCases = [
        { id: 1, input: "7", expected_output: "3" },
        { id: 2, input: "0", expected_output: "0" },
        { id: 3, input: "15", expected_output: "4" }
    ];
    
    const userOutputs = ["3", "0", "4"];
    
    const results = validator.validateTestCases(testCases, userOutputs);
    console.log("Validation Results:", results);
}
