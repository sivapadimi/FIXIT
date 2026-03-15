#!/usr/bin/env python3
import sys
import subprocess
import time
import os
from pathlib import Path

class CodeExecutor:
    def __init__(self, time_limit=5, memory_limit=128 * 1024 * 1024):  # 128MB
        self.time_limit = time_limit
        self.memory_limit = memory_limit
        self.start_time = None
        self.end_time = None
        self.memory_used = 0
        
    def execute(self, code_file, input_file):
        """Execute Python code with resource limits"""
        self.start_time = time.time()
        
        try:
            # Read input
            with open(input_file, 'r') as f:
                input_data = f.read()
            
            # Execute the code with timeout
            process = subprocess.run(
                ['python', code_file],
                input=input_data,
                text=True,
                capture_output=True,
                timeout=self.time_limit
            )
            
            self.end_time = time.time()
            execution_time = (self.end_time - self.start_time) * 1000  # Convert to milliseconds
            
            if process.returncode == 0:
                return {
                    'status': 'accepted',
                    'output': process.stdout.strip(),
                    'error': '',
                    'execution_time': execution_time,
                    'memory_used': self.memory_used
                }
            else:
                return {
                    'status': 'runtime_error',
                    'output': process.stdout.strip(),
                    'error': process.stderr.strip(),
                    'execution_time': execution_time,
                    'memory_used': self.memory_used
                }
                
        except subprocess.TimeoutExpired:
            return {
                'status': 'time_limit_exceeded',
                'output': '',
                'error': 'Execution time limit exceeded',
                'execution_time': self.time_limit * 1000,
                'memory_used': self.memory_used
            }
        except Exception as e:
            return {
                'status': 'runtime_error',
                'output': '',
                'error': str(e),
                'execution_time': (time.time() - self.start_time) * 1000,
                'memory_used': self.memory_used
            }

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: python3 executor.py <code_file> <input_file>")
        sys.exit(1)
    
    code_file = sys.argv[1]
    input_file = sys.argv[2]
    
    if not os.path.exists(code_file):
        print(f"Error: Code file '{code_file}' not found")
        sys.exit(1)
    
    if not os.path.exists(input_file):
        print(f"Error: Input file '{input_file}' not found")
        sys.exit(1)
    
    # Get limits from environment variables or use defaults
    time_limit = int(os.environ.get('TIME_LIMIT', 5))
    memory_limit = int(os.environ.get('MEMORY_LIMIT', 128 * 1024 * 1024))
    
    executor = CodeExecutor(time_limit, memory_limit)
    result = executor.execute(code_file, input_file)
    
    # Output result as JSON
    import json
    print(json.dumps(result))
