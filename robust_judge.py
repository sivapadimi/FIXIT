#!/usr/bin/env python3
"""
Robust Judge System for FixIt Platform
Handles Python, Java, and C++ code execution with proper isolation
"""

import subprocess
import tempfile
import os
import json
import time
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CodeExecutor:
    """Robust code executor with proper isolation and debugging"""
    
    def __init__(self, time_limit=5, memory_limit=128 * 1024 * 1024):
        self.time_limit = time_limit
        self.memory_limit = memory_limit
        
    def execute_python(self, code, input_data):
        """Execute Python code with proper isolation"""
        start_time = time.time()
        
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                # Write code to file
                code_file = os.path.join(temp_dir, 'solution.py')
                with open(code_file, 'w') as f:
                    f.write(code)
                
                logger.info(f"Executing Python code with input: '{input_data}'")
                
                # Execute with proper input handling
                result = subprocess.run(
                    ['python', code_file],
                    input=input_data,
                    text=True,
                    capture_output=True,
                    timeout=self.time_limit,
                    cwd=temp_dir
                )
                
                execution_time = (time.time() - start_time) * 1000
                
                if result.returncode == 0:
                    logger.info(f"Python execution success - Output: '{result.stdout.strip()}'")
                    return {
                        'status': 'accepted',
                        'output': result.stdout.strip(),
                        'error': result.stderr.strip(),
                        'execution_time': execution_time,
                        'memory_used': 0
                    }
                else:
                    logger.warning(f"Python execution failed - Error: '{result.stderr.strip()}'")
                    return {
                        'status': 'runtime_error',
                        'output': result.stdout.strip(),
                        'error': result.stderr.strip(),
                        'execution_time': execution_time,
                        'memory_used': 0
                    }
                    
        except subprocess.TimeoutExpired:
            logger.error("Python execution timeout")
            return {
                'status': 'time_limit_exceeded',
                'output': '',
                'error': 'Execution time limit exceeded',
                'execution_time': self.time_limit * 1000,
                'memory_used': 0
            }
        except Exception as e:
            logger.error(f"Python execution error: {str(e)}")
            return {
                'status': 'error',
                'output': '',
                'error': str(e),
                'execution_time': 0,
                'memory_used': 0
            }
    
    def execute_java(self, code, input_data):
        """Execute Java code with compilation"""
        start_time = time.time()
        
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                # Write Java code to file
                code_file = os.path.join(temp_dir, 'Main.java')
                with open(code_file, 'w') as f:
                    f.write(code)
                
                logger.info(f"Compiling Java code")
                
                # Compile Java code
                compile_result = subprocess.run(
                    ['./jdk/bin/javac', code_file],
                    capture_output=True,
                    text=True,
                    timeout=self.time_limit,
                    cwd=temp_dir
                )
                
                if compile_result.returncode != 0:
                    logger.warning(f"Java compilation failed - Error: '{compile_result.stderr.strip()}'")
                    return {
                        'status': 'compile_error',
                        'output': '',
                        'error': compile_result.stderr.strip(),
                        'execution_time': 0,
                        'memory_used': 0
                    }
                
                logger.info(f"Executing Java code with input: '{input_data}'")
                
                # Execute Java code
                result = subprocess.run(
                    ['./jdk/bin/java', '-cp', temp_dir, 'Main'],
                    input=input_data,
                    text=True,
                    capture_output=True,
                    timeout=self.time_limit,
                    cwd=temp_dir
                )
                
                execution_time = (time.time() - start_time) * 1000
                
                if result.returncode == 0:
                    logger.info(f"Java execution success - Output: '{result.stdout.strip()}'")
                    return {
                        'status': 'accepted',
                        'output': result.stdout.strip(),
                        'error': result.stderr.strip(),
                        'execution_time': execution_time,
                        'memory_used': 0
                    }
                else:
                    logger.warning(f"Java execution failed - Error: '{result.stderr.strip()}'")
                    return {
                        'status': 'runtime_error',
                        'output': result.stdout.strip(),
                        'error': result.stderr.strip(),
                        'execution_time': execution_time,
                        'memory_used': 0
                    }
                    
        except subprocess.TimeoutExpired:
            logger.error("Java execution timeout")
            return {
                'status': 'time_limit_exceeded',
                'output': '',
                'error': 'Execution time limit exceeded',
                'execution_time': self.time_limit * 1000,
                'memory_used': 0
            }
        except Exception as e:
            logger.error(f"Java execution error: {str(e)}")
            return {
                'status': 'error',
                'output': '',
                'error': str(e),
                'execution_time': 0,
                'memory_used': 0
            }
    
    def execute_cpp(self, code, input_data):
        """Execute C++ code with compilation"""
        start_time = time.time()
        
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                # Write C++ code to file
                code_file = os.path.join(temp_dir, 'solution.cpp')
                exe_file = os.path.join(temp_dir, 'solution.exe')
                with open(code_file, 'w') as f:
                    f.write(code)
                
                logger.info(f"Compiling C++ code")
                
                # Compile C++ code
                compile_result = subprocess.run(
                    ['g++', code_file, '-o', exe_file],
                    capture_output=True,
                    text=True,
                    timeout=self.time_limit,
                    cwd=temp_dir
                )
                
                if compile_result.returncode != 0:
                    logger.warning(f"C++ compilation failed - Error: '{compile_result.stderr.strip()}'")
                    return {
                        'status': 'compile_error',
                        'output': '',
                        'error': compile_result.stderr.strip(),
                        'execution_time': 0,
                        'memory_used': 0
                    }
                
                logger.info(f"Executing C++ code with input: '{input_data}'")
                
                # Execute C++ code
                result = subprocess.run(
                    [exe_file],
                    input=input_data,
                    text=True,
                    capture_output=True,
                    timeout=self.time_limit,
                    cwd=temp_dir
                )
                
                execution_time = (time.time() - start_time) * 1000
                
                if result.returncode == 0:
                    logger.info(f"C++ execution success - Output: '{result.stdout.strip()}'")
                    return {
                        'status': 'accepted',
                        'output': result.stdout.strip(),
                        'error': result.stderr.strip(),
                        'execution_time': execution_time,
                        'memory_used': 0
                    }
                else:
                    logger.warning(f"C++ execution failed - Error: '{result.stderr.strip()}'")
                    return {
                        'status': 'runtime_error',
                        'output': result.stdout.strip(),
                        'error': result.stderr.strip(),
                        'execution_time': execution_time,
                        'memory_used': 0
                    }
                    
        except subprocess.TimeoutExpired:
            logger.error("C++ execution timeout")
            return {
                'status': 'time_limit_exceeded',
                'output': '',
                'error': 'Execution time limit exceeded',
                'execution_time': self.time_limit * 1000,
                'memory_used': 0
            }
        except Exception as e:
            logger.error(f"C++ execution error: {str(e)}")
            return {
                'status': 'error',
                'output': '',
                'error': str(e),
                'execution_time': 0,
                'memory_used': 0
            }

class JudgeSystem:
    """Complete judge system for evaluating submissions"""
    
    def __init__(self):
        self.executor = CodeExecutor()
        
    def evaluate_single_test_case(self, code, language, test_input, expected_output):
        """Evaluate a single test case with fresh process"""
        logger.info(f"Evaluating test case - Input: '{test_input}', Expected: '{expected_output}'")
        
        if language == 'python':
            result = self.executor.execute_python(code, test_input)
        elif language == 'java':
            result = self.executor.execute_java(code, test_input)
        elif language == 'cpp':
            result = self.executor.execute_cpp(code, test_input)
        else:
            return {
                'status': 'error',
                'output': '',
                'error': f'Unsupported language: {language}',
                'execution_time': 0,
                'memory_used': 0
            }
        
        # Compare output with expected
        if result['status'] == 'accepted':
            actual_output = result['output'].strip()
            expected_clean = str(expected_output).strip()
            
            is_correct = actual_output == expected_clean
            logger.info(f"Test result - Actual: '{actual_output}', Expected: '{expected_clean}', Correct: {is_correct}")
            
            result['test_passed'] = is_correct
        else:
            result['test_passed'] = False
            
        return result
    
    def evaluate_all_test_cases(self, code, language, test_cases):
        """Evaluate all test cases sequentially"""
        results = []
        
        for i, test_case in enumerate(test_cases):
            logger.info(f"Running test case {i+1}/{len(test_cases)}")
            
            # Each test case runs in a completely fresh process
            result = self.evaluate_single_test_case(
                code, 
                language, 
                test_case['input'], 
                test_case['expected']
            )
            
            result['test_case_id'] = i + 1
            result['input'] = test_case['input']
            result['expected'] = test_case['expected']
            result['hidden'] = test_case.get('hidden', False)
            
            results.append(result)
        
        # Calculate summary
        passed = sum(1 for r in results if r['test_passed'])
        total = len(results)
        success_rate = (passed / total * 100) if total > 0 else 0
        
        summary = {
            'passed': passed,
            'total': total,
            'success_rate': success_rate,
            'all_passed': passed == total
        }
        
        logger.info(f"Evaluation complete - {passed}/{total} tests passed ({success_rate:.1f}%)")
        
        return {
            'summary': summary,
            'test_results': results
        }

# Example usage for testing
if __name__ == "__main__":
    judge = JudgeSystem()
    
    # Test correct Python code
    correct_code = '''n = int(input())
count = 0
while n > 0:
    if (n & 1) == 1:
        count += 1
    n >>= 1
print(count)'''
    
    test_cases = [
        {"input": "1", "expected": "1"},
        {"input": "2", "expected": "1"},
        {"input": "3", "expected": "2"},
        {"input": "4", "expected": "1"},
        {"input": "5", "expected": "2"}
    ]
    
    print("=== Testing Correct Code ===")
    result = judge.evaluate_all_test_cases(correct_code, 'python', test_cases)
    print(json.dumps(result, indent=2))
    
    # Test incorrect Python code
    incorrect_code = '''n = int(input())
count = 0
while n > 0:
    if (n | 1) == 1:
        count += 1
    n >>= 1
print(count)'''
    
    print("\n=== Testing Incorrect Code ===")
    result = judge.evaluate_all_test_cases(incorrect_code, 'python', test_cases)
    print(json.dumps(result, indent=2))
