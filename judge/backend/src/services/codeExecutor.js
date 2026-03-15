const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class CodeExecutor {
  constructor() {
    this.sandboxPath = process.env.SANDBOX_PATH || '/tmp/sandbox';
    this.timeout = parseInt(process.env.CODE_EXECUTION_TIMEOUT) || 30000;
    this.maxMemory = process.env.MAX_MEMORY_LIMIT || '128m';
    this.maxCpuTime = parseInt(process.env.MAX_CPU_TIME) || 5;
  }

  async executeCode(language, code, input, timeLimit, memoryLimit) {
    const executionId = uuidv4();
    const workspace = path.join(this.sandboxPath, executionId);
    
    try {
      // Create workspace
      await fs.ensureDir(workspace);
      
      // Write code file
      const codeFile = await this.writeCodeFile(workspace, language, code);
      
      // Write input file
      const inputFile = path.join(workspace, 'input.txt');
      await fs.writeFile(inputFile, input);
      
      // Compile and execute
      const result = await this.compileAndExecute(
        workspace, 
        language, 
        codeFile, 
        inputFile, 
        timeLimit, 
        memoryLimit
      );
      
      // Clean up
      await this.cleanup(workspace);
      
      return {
        ...result,
        executionId
      };
      
    } catch (error) {
      // Clean up on error
      await this.cleanup(workspace);
      
      logger.error(`Code execution error: ${error.message}`);
      throw error;
    }
  }

  async writeCodeFile(workspace, language, code) {
    const extensions = {
      python: 'py',
      java: 'java',
      cpp: 'cpp'
    };
    
    const extension = extensions[language];
    if (!extension) {
      throw new Error(`Unsupported language: ${language}`);
    }
    
    const filename = `solution.${extension}`;
    const filepath = path.join(workspace, filename);
    await fs.writeFile(filepath, code);
    
    return filepath;
  }

  async compileAndExecute(workspace, language, codeFile, inputFile, timeLimit, memoryLimit) {
    switch (language) {
      case 'python':
        return this.executePython(workspace, codeFile, inputFile, timeLimit, memoryLimit);
      case 'java':
        return this.executeJava(workspace, codeFile, inputFile, timeLimit, memoryLimit);
      case 'cpp':
        return this.executeCpp(workspace, codeFile, inputFile, timeLimit, memoryLimit);
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  }

  async executePython(workspace, codeFile, inputFile, timeLimit, memoryLimit) {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const args = [
        codeFile,
        '--memory', memoryLimit || this.maxMemory,
        '--timeout', (timeLimit || this.timeout) / 1000,
        '--input', inputFile
      ];
      
      const process = spawn('docker', [
        'run', '--rm',
        '--memory', memoryLimit || this.maxMemory,
        '--cpus', '1',
        '--network', 'none',
        '--read-only',
        '--tmpfs', '/tmp',
        '-v', `${workspace}:/app:ro`,
        '-v', `${inputFile}:/input.txt:ro`,
        'python:3.11-alpine',
        'python', '/app/solution.py',
        '<', '/input.txt'
      ]);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      const timer = setTimeout(() => {
        process.kill('SIGKILL');
        resolve({
          status: 'time_limit_exceeded',
          output: '',
          error: 'Execution time limit exceeded',
          executionTime: timeLimit || this.timeout,
          memoryUsed: 0
        });
      }, timeLimit || this.timeout);
      
      process.on('close', (code) => {
        clearTimeout(timer);
        const executionTime = Date.now() - startTime;
        
        if (code === 0) {
          resolve({
            status: 'accepted',
            output: stdout.trim(),
            error: '',
            executionTime,
            memoryUsed: 0 // TODO: Implement memory tracking
          });
        } else {
          resolve({
            status: 'runtime_error',
            output: stdout.trim(),
            error: stderr.trim() || `Process exited with code ${code}`,
            executionTime,
            memoryUsed: 0
          });
        }
      });
      
      process.on('error', (error) => {
        clearTimeout(timer);
        resolve({
          status: 'internal_error',
          output: '',
          error: error.message,
          executionTime: Date.now() - startTime,
          memoryUsed: 0
        });
      });
    });
  }

  async executeJava(workspace, codeFile, inputFile, timeLimit, memoryLimit) {
    const startTime = Date.now();
    
    try {
      // Compile Java code
      const compileResult = await this.compileJava(workspace, codeFile);
      if (compileResult.status !== 'success') {
        return compileResult;
      }
      
      // Execute compiled code
      return new Promise((resolve) => {
        const process = spawn('docker', [
          'run', '--rm',
          '--memory', memoryLimit || this.maxMemory,
          '--cpus', '1',
          '--network', 'none',
          '--read-only',
          '--tmpfs', '/tmp',
          '-v', `${workspace}:/app:ro`,
          '-v', `${inputFile}:/input.txt:ro`,
          'openjdk:17-alpine',
          'java', '-cp', '/app', 'Solution',
          '<', '/input.txt'
        ]);
        
        let stdout = '';
        let stderr = '';
        
        process.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        process.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        const timer = setTimeout(() => {
          process.kill('SIGKILL');
          resolve({
            status: 'time_limit_exceeded',
            output: '',
            error: 'Execution time limit exceeded',
            executionTime: timeLimit || this.timeout,
            memoryUsed: 0
          });
        }, timeLimit || this.timeout);
        
        process.on('close', (code) => {
          clearTimeout(timer);
          const executionTime = Date.now() - startTime;
          
          if (code === 0) {
            resolve({
              status: 'accepted',
              output: stdout.trim(),
              error: '',
              executionTime,
              memoryUsed: 0
            });
          } else {
            resolve({
              status: 'runtime_error',
              output: stdout.trim(),
              error: stderr.trim() || `Process exited with code ${code}`,
              executionTime,
              memoryUsed: 0
            });
          }
        });
        
        process.on('error', (error) => {
          clearTimeout(timer);
          resolve({
            status: 'internal_error',
            output: '',
            error: error.message,
            executionTime: Date.now() - startTime,
            memoryUsed: 0
          });
        });
      });
      
    } catch (error) {
      return {
        status: 'compilation_error',
        output: '',
        error: error.message,
        executionTime: Date.now() - startTime,
        memoryUsed: 0
      };
    }
  }

  async compileJava(workspace, codeFile) {
    return new Promise((resolve) => {
      const process = spawn('docker', [
        'run', '--rm',
        '--memory', '256m',
        '--cpus', '1',
        '-v', `${workspace}:/app`,
        'openjdk:17-alpine',
        'javac', '/app/solution.java'
      ]);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve({ status: 'success' });
        } else {
          resolve({
            status: 'compilation_error',
            output: stdout,
            error: stderr
          });
        }
      });
      
      process.on('error', (error) => {
        resolve({
          status: 'compilation_error',
          output: '',
          error: error.message
        });
      });
    });
  }

  async executeCpp(workspace, codeFile, inputFile, timeLimit, memoryLimit) {
    const startTime = Date.now();
    
    try {
      // Compile C++ code
      const compileResult = await this.compileCpp(workspace, codeFile);
      if (compileResult.status !== 'success') {
        return compileResult;
      }
      
      // Execute compiled code
      return new Promise((resolve) => {
        const process = spawn('docker', [
          'run', '--rm',
          '--memory', memoryLimit || this.maxMemory,
          '--cpus', '1',
          '--network', 'none',
          '--read-only',
          '--tmpfs', '/tmp',
          '-v', `${workspace}:/app:ro`,
          '-v', `${inputFile}:/input.txt:ro`,
          'gcc:latest',
          '/app/solution',
          '<', '/input.txt'
        ]);
        
        let stdout = '';
        let stderr = '';
        
        process.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        process.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        const timer = setTimeout(() => {
          process.kill('SIGKILL');
          resolve({
            status: 'time_limit_exceeded',
            output: '',
            error: 'Execution time limit exceeded',
            executionTime: timeLimit || this.timeout,
            memoryUsed: 0
          });
        }, timeLimit || this.timeout);
        
        process.on('close', (code) => {
          clearTimeout(timer);
          const executionTime = Date.now() - startTime;
          
          if (code === 0) {
            resolve({
              status: 'accepted',
              output: stdout.trim(),
              error: '',
              executionTime,
              memoryUsed: 0
            });
          } else {
            resolve({
              status: 'runtime_error',
              output: stdout.trim(),
              error: stderr.trim() || `Process exited with code ${code}`,
              executionTime,
              memoryUsed: 0
            });
          }
        });
        
        process.on('error', (error) => {
          clearTimeout(timer);
          resolve({
            status: 'internal_error',
            output: '',
            error: error.message,
            executionTime: Date.now() - startTime,
            memoryUsed: 0
          });
        });
      });
      
    } catch (error) {
      return {
        status: 'compilation_error',
        output: '',
        error: error.message,
        executionTime: Date.now() - startTime,
        memoryUsed: 0
      };
    }
  }

  async compileCpp(workspace, codeFile) {
    return new Promise((resolve) => {
      const process = spawn('docker', [
        'run', '--rm',
        '--memory', '256m',
        '--cpus', '1',
        '-v', `${workspace}:/app`,
        'gcc:latest',
        'g++', '-std=c++17', '-O2', '/app/solution.cpp', '-o', '/app/solution'
      ]);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve({ status: 'success' });
        } else {
          resolve({
            status: 'compilation_error',
            output: stdout,
            error: stderr
          });
        }
      });
      
      process.on('error', (error) => {
        resolve({
          status: 'compilation_error',
          output: '',
          error: error.message
        });
      });
    });
  }

  async cleanup(workspace) {
    try {
      await fs.remove(workspace);
    } catch (error) {
      logger.error(`Cleanup error: ${error.message}`);
    }
  }

  async estimateTimeComplexity(executionTimes) {
    // Simple time complexity estimation based on execution times
    // This is a basic implementation and can be improved
    
    if (executionTimes.length < 2) {
      return { estimated: 'O(n)', confidence: 0 };
    }
    
    const ratios = [];
    for (let i = 1; i < executionTimes.length; i++) {
      if (executionTimes[i - 1] > 0) {
        ratios.push(executionTimes[i] / executionTimes[i - 1]);
      }
    }
    
    if (ratios.length === 0) {
      return { estimated: 'O(n)', confidence: 0 };
    }
    
    const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    
    // Map ratio to complexity
    let complexity = 'O(n)';
    let confidence = 50;
    
    if (avgRatio < 1.5) {
      complexity = 'O(1)';
      confidence = 80;
    } else if (avgRatio < 2.5) {
      complexity = 'O(log n)';
      confidence = 70;
    } else if (avgRatio < 5) {
      complexity = 'O(n)';
      confidence = 60;
    } else if (avgRatio < 15) {
      complexity = 'O(n log n)';
      confidence = 50;
    } else if (avgRatio < 50) {
      complexity = 'O(n²)';
      confidence = 40;
    } else {
      complexity = 'O(n³)';
      confidence = 30;
    }
    
    return { estimated: complexity, confidence };
  }
}

module.exports = new CodeExecutor();
