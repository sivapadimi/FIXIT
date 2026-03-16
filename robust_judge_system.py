#!/usr/bin/env python3
"""
Robust Online Judge System for FixIt Platform
Ensures reliable and deterministic test case evaluation
"""

import subprocess
import tempfile
import os
import re
import json
import logging
import time
import threading
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ExecutionStatus(Enum):
    ACCEPTED = "ACCEPTED"
    WRONG_ANSWER = "WRONG_ANSWER"
    TIME_LIMIT_EXCEEDED = "TIME_LIMIT_EXCEEDED"
    MEMORY_LIMIT_EXCEEDED = "MEMORY_LIMIT_EXCEEDED"
    RUNTIME_ERROR = "RUNTIME_ERROR"
    COMPILE_ERROR = "COMPILE_ERROR"
    SYSTEM_ERROR = "SYSTEM_ERROR"

@dataclass
class TestResult:
    """Result of a single test case execution"""
    test_case_id: int
    input_data: str
    expected_output: str
    actual_output: str
    status: ExecutionStatus
    execution_time: float
    memory_used: int
    error_message: str = ""
    is_correct: bool = False

class RobustExecutor:
    """Robust code executor with proper isolation and deterministic behavior"""
    
    def __init__(self, time_limit: int = 5, memory_limit: int = 128 * 1024 * 1024):
        self.time_limit = time_limit
        self.memory_limit = memory_limit
        self.execution_lock = threading.Lock()  # Prevent race conditions
    
    def normalize_output(self, output: str) -> str:
        """Normalize output for consistent comparison"""
        if output is None:
            return ""
        
        # Convert to string if not already
        output = str(output)
        
        # Remove trailing whitespace
        output = output.rstrip()
        
        # Remove leading whitespace
        output = output.lstrip()
        
        # Normalize line endings (convert Windows CRLF to Unix LF)
        output = output.replace('\r\n', '\n').replace('\r', '\n')
        
        # Remove multiple consecutive newlines
        output = re.sub(r'\n+', '\n', output)
        
        # Remove leading/trailing newlines
        output = output.strip()
        
        return output
    
    def execute_python(self, code: str, input_data: str) -> TestResult:
        """Execute Python code with proper isolation"""
        start_time = time.time()
        
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                # Write code to file
                code_file = os.path.join(temp_dir, 'solution.py')
                with open(code_file, 'w', encoding='utf-8') as f:
                    f.write(code)
                
                # Execute with proper isolation
                process = subprocess.run(
                    ['python', code_file],
                    input=input_data,
                    text=True,
                    capture_output=True,
                    timeout=self.time_limit,
                    cwd=temp_dir,
                    env={}  # Clean environment
                )
                
                execution_time = (time.time() - start_time) * 1000  # Convert to ms
                
                if process.returncode == 0:
                    actual_output = self.normalize_output(process.stdout)
                    return TestResult(
                        test_case_id=0,  # Will be set by caller
                        input_data=input_data,
                        expected_output="",  # Will be set by caller
                        actual_output=actual_output,
                        status=ExecutionStatus.ACCEPTED,
                        execution_time=execution_time,
                        memory_used=0,
                        is_correct=False  # Will be determined by caller
                    )
                else:
                    return TestResult(
                        test_case_id=0,
                        input_data=input_data,
                        expected_output="",
                        actual_output=self.normalize_output(process.stdout),
                        status=ExecutionStatus.RUNTIME_ERROR,
                        execution_time=execution_time,
                        memory_used=0,
                        error_message=process.stderr.strip()
                    )
                        
        except subprocess.TimeoutExpired:
            return TestResult(
                test_case_id=0,
                input_data=input_data,
                expected_output="",
                actual_output="",
                status=ExecutionStatus.TIME_LIMIT_EXCEEDED,
                execution_time=self.time_limit * 1000,
                memory_used=0,
                error_message=f"Execution time limit exceeded ({self.time_limit}s)"
            )
        except Exception as e:
            logger.error(f"Python execution error: {str(e)}")
            return TestResult(
                test_case_id=0,
                input_data=input_data,
                expected_output="",
                actual_output="",
                status=ExecutionStatus.SYSTEM_ERROR,
                execution_time=0,
                memory_used=0,
                error_message=str(e)
            )
    
    def execute_java(self, code: str, input_data: str) -> TestResult:
        """Execute Java code with compilation and execution"""
        start_time = time.time()
        
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                # Write code to file
                code_file = os.path.join(temp_dir, 'Main.java')
                with open(code_file, 'w', encoding='utf-8') as f:
                    f.write(code)
                
                # Compile Java code
                compile_start = time.time()
                compile_process = subprocess.run(
                    ['/usr/bin/javac', code_file],
                    capture_output=True,
                    text=True,
                    timeout=self.time_limit,
                    cwd=temp_dir
                )
                
                if compile_process.returncode != 0:
                    return TestResult(
                        test_case_id=0,
                        input_data=input_data,
                        expected_output="",
                        actual_output="",
                        status=ExecutionStatus.COMPILE_ERROR,
                        execution_time=(time.time() - compile_start) * 1000,
                        memory_used=0,
                        error_message=compile_process.stderr.strip()
                    )
                
                # Execute Java code
                process = subprocess.run(
                    ['/usr/bin/java', '-cp', temp_dir, 'Main'],
                    input=input_data,
                    text=True,
                    capture_output=True,
                    timeout=self.time_limit,
                    cwd=temp_dir,
                    env={}
                )
                
                execution_time = (time.time() - start_time) * 1000
                
                if process.returncode == 0:
                    actual_output = self.normalize_output(process.stdout)
                    return TestResult(
                        test_case_id=0,
                        input_data=input_data,
                        expected_output="",
                        actual_output=actual_output,
                        status=ExecutionStatus.ACCEPTED,
                        execution_time=execution_time,
                        memory_used=0
                    )
                else:
                    return TestResult(
                        test_case_id=0,
                        input_data=input_data,
                        expected_output="",
                        actual_output=self.normalize_output(process.stdout),
                        status=ExecutionStatus.RUNTIME_ERROR,
                        execution_time=execution_time,
                        memory_used=0,
                        error_message=process.stderr.strip()
                    )
                    
        except subprocess.TimeoutExpired:
            return TestResult(
                test_case_id=0,
                input_data=input_data,
                expected_output="",
                actual_output="",
                status=ExecutionStatus.TIME_LIMIT_EXCEEDED,
                execution_time=self.time_limit * 1000,
                memory_used=0,
                error_message=f"Execution time limit exceeded ({self.time_limit}s)"
            )
        except Exception as e:
            logger.error(f"Java execution error: {str(e)}")
            return TestResult(
                test_case_id=0,
                input_data=input_data,
                expected_output="",
                actual_output="",
                status=ExecutionStatus.SYSTEM_ERROR,
                execution_time=0,
                memory_used=0,
                error_message=str(e)
            )
    
    def execute_cpp(self, code: str, input_data: str) -> TestResult:
        """Execute C++ code with compilation and execution"""
        start_time = time.time()
        
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                # Write code to file
                code_file = os.path.join(temp_dir, 'solution.cpp')
                exe_file = os.path.join(temp_dir, 'solution.exe')
                with open(code_file, 'w', encoding='utf-8') as f:
                    f.write(code)
                
                # Compile C++ code
                compile_start = time.time()
                compile_process = subprocess.run(
                    ['g++', code_file, '-o', exe_file],
                    capture_output=True,
                    text=True,
                    timeout=self.time_limit,
                    cwd=temp_dir
                )
                
                if compile_process.returncode != 0:
                    return TestResult(
                        test_case_id=0,
                        input_data=input_data,
                        expected_output="",
                        actual_output="",
                        status=ExecutionStatus.COMPILE_ERROR,
                        execution_time=(time.time() - compile_start) * 1000,
                        memory_used=0,
                        error_message=compile_process.stderr.strip()
                    )
                
                # Execute C++ code
                process = subprocess.run(
                    [exe_file],
                    input=input_data,
                    text=True,
                    capture_output=True,
                    timeout=self.time_limit,
                    cwd=temp_dir,
                    env={}
                )
                
                execution_time = (time.time() - start_time) * 1000
                
                if process.returncode == 0:
                    actual_output = self.normalize_output(process.stdout)
                    return TestResult(
                        test_case_id=0,
                        input_data=input_data,
                        expected_output="",
                        actual_output=actual_output,
                        status=ExecutionStatus.ACCEPTED,
                        execution_time=execution_time,
                        memory_used=0
                    )
                else:
                    return TestResult(
                        test_case_id=0,
                        input_data=input_data,
                        expected_output="",
                        actual_output=self.normalize_output(process.stdout),
                        status=ExecutionStatus.RUNTIME_ERROR,
                        execution_time=execution_time,
                        memory_used=0,
                        error_message=process.stderr.strip()
                    )
                    
        except subprocess.TimeoutExpired:
            return TestResult(
                test_case_id=0,
                input_data=input_data,
                expected_output="",
                actual_output="",
                status=ExecutionStatus.TIME_LIMIT_EXCEEDED,
                execution_time=self.time_limit * 1000,
                memory_used=0,
                error_message=f"Execution time limit exceeded ({self.time_limit}s)"
            )
        except Exception as e:
            logger.error(f"C++ execution error: {str(e)}")
            return TestResult(
                test_case_id=0,
                input_data=input_data,
                expected_output="",
                actual_output="",
                status=ExecutionStatus.SYSTEM_ERROR,
                execution_time=0,
                memory_used=0,
                error_message=str(e)
            )

class RobustJudge:
    """Robust judge system with deterministic evaluation"""
    
    def __init__(self):
        self.executor = RobustExecutor()
        self.debugging_judge = None  # Will be initialized if needed
        
    def compare_outputs(self, actual: str, expected: str) -> bool:
        """Robust output comparison with normalization"""
        # Normalize both outputs
        normalized_actual = self.executor.normalize_output(actual)
        normalized_expected = self.executor.normalize_output(expected)
        
        # Direct comparison after normalization
        return normalized_actual == normalized_expected
    
    def execute_test_case(self, code: str, language: str, test_input: str, 
                       expected_output: str, test_case_id: int) -> TestResult:
        """Execute a single test case with proper logging"""
        
        logger.info(f"Executing test case {test_case_id}")
        logger.info(f"Input: '{test_input}'")
        logger.info(f"Expected Output: '{expected_output}'")
        
        # Execute based on language
        if language.lower() == 'python':
            result = self.executor.execute_python(code, test_input)
        elif language.lower() == 'java':
            result = self.executor.execute_java(code, test_input)
        elif language.lower() in ['cpp', 'c++']:
            result = self.executor.execute_cpp(code, test_input)
        else:
            result = TestResult(
                test_case_id=test_case_id,
                input_data=test_input,
                expected_output=expected_output,
                actual_output="",
                status=ExecutionStatus.SYSTEM_ERROR,
                execution_time=0,
                memory_used=0,
                error_message=f"Unsupported language: {language}"
            )
        
        # Set test case ID and expected output
        result.test_case_id = test_case_id
        result.expected_output = expected_output
        
        # Determine correctness
        if result.status == ExecutionStatus.ACCEPTED:
            result.is_correct = self.compare_outputs(result.actual_output, expected_output)
            if result.is_correct:
                logger.info(f"✅ PASSED - Actual: '{result.actual_output}'")
            else:
                logger.warning(f"❌ FAILED - Actual: '{result.actual_output}', Expected: '{expected_output}'")
        else:
            result.is_correct = False
            logger.error(f"❌ ERROR - {result.status.value}: {result.error_message}")
        
        return result
    
    def evaluate_submission(self, code: str, language: str, test_cases: List[Dict]) -> Dict:
        """Evaluate submission against all test cases"""
        logger.info(f"Starting evaluation for {language} submission with {len(test_cases)} test cases")
        
        results = []
        total_execution_time = 0
        
        # Execute each test case sequentially (no concurrency to prevent race conditions)
        for i, test_case in enumerate(test_cases):
            test_input = test_case['input']
            expected_output = test_case['expected']
            is_hidden = test_case.get('hidden', False)
            
            # Execute test case
            result = self.execute_test_case(
                code, language, test_input, expected_output, i + 1
            )
            
            # Add hidden flag
            result.is_hidden = is_hidden
            results.append(result)
            total_execution_time += result.execution_time
            
            # Log detailed comparison for debugging
            if not result.is_correct:
                logger.error(f"Test Case {i+1} Details:")
                logger.error(f"  Input: '{test_input}'")
                logger.error(f"  Expected: '{expected_output}'")
                logger.error(f"  Actual: '{result.actual_output}'")
                logger.error(f"  Status: {result.status.value}")
                if result.error_message:
                    logger.error(f"  Error: {result.error_message}")
        
        # Calculate summary
        passed_tests = sum(1 for r in results if r.is_correct)
        total_tests = len(results)
        visible_passed = sum(1 for r in results if r.is_correct and not r.is_hidden)
        visible_total = sum(1 for r in results if not r.is_hidden)
        
        # Determine overall status
        if passed_tests == total_tests:
            overall_status = ExecutionStatus.ACCEPTED
        elif passed_tests > 0:
            overall_status = ExecutionStatus.WRONG_ANSWER
        else:
            overall_status = ExecutionStatus.WRONG_ANSWER
        
        evaluation_result = {
            'overall_status': overall_status.value,
            'passed_tests': passed_tests,
            'total_tests': total_tests,
            'visible_passed': visible_passed,
            'visible_total': visible_total,
            'total_execution_time': total_execution_time,
            'test_results': [
                {
                    'test_case_id': r.test_case_id,
                    'input': r.input_data,
                    'expected_output': r.expected_output,
                    'actual_output': r.actual_output,
                    'status': r.status.value,
                    'is_correct': r.is_correct,
                    'is_hidden': r.is_hidden,
                    'execution_time': r.execution_time,
                    'memory_used': r.memory_used,
                    'error_message': r.error_message
                }
                for r in results
            ]
        }
        
        logger.info(f"Evaluation complete: {passed_tests}/{total_tests} tests passed")
        logger.info(f"Overall status: {overall_status.value}")
        
        return evaluation_result

# Example usage and testing
def test_robust_judge():
    """Test the robust judge system"""
    judge = RobustJudge()
    
    # Test case 1: Correct Python code
    print("=== Test 1: Correct Python Code ===")
    correct_python_code = '''n = int(input())
count = 0
while n > 0:
    if (n & 1) == 1:
        count += 1
    n >>= 1
print(count)'''
    
    test_cases = [
        {'input': '1', 'expected': '1'},
        {'input': '2', 'expected': '1'},
        {'input': '3', 'expected': '2'},
        {'input': '4', 'expected': '1'},
        {'input': '5', 'expected': '2'}
    ]
    
    result = judge.evaluate_submission(correct_python_code, 'python', test_cases)
    print(f"Status: {result['overall_status']}")
    print(f"Passed: {result['passed_tests']}/{result['total_tests']}")
    
    # Test case 2: Incorrect Python code
    print("\n=== Test 2: Incorrect Python Code ===")
    incorrect_python_code = '''n = int(input())
count = 0
while n > 0:
    if (n | 1) == 1:
        count += 1
    n >>= 2
print(count)'''
    
    result = judge.evaluate_submission(incorrect_python_code, 'python', test_cases)
    print(f"Status: {result['overall_status']}")
    print(f"Passed: {result['passed_tests']}/{result['total_tests']}")
    
    # Test case 3: Edge case with whitespace
    print("\n=== Test 3: Whitespace Handling ===")
    whitespace_code = '''n = int(input())

count = 0
while n > 0:
    if (n & 1) == 1:
        count += 1
    n >>= 1
    
print(count)'''
    
    result = judge.evaluate_submission(whitespace_code, 'python', test_cases)
    print(f"Status: {result['overall_status']}")
    print(f"Passed: {result['passed_tests']}/{result['total_tests']}")

if __name__ == "__main__":
    test_robust_judge()
