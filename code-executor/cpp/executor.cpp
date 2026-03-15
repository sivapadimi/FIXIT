Output: C++ compiler (g++) not available#include <iostream>
#include <fstream>
#include <string>
#include <chrono>
#include <cstdlib>
#include <sys/resource.h>
#include <unistd.h>
#include <signal.h>
#include <sys/wait.h>

class CodeExecutor {
private:
    long timeLimit;
    long memoryLimit;
    std::chrono::high_resolution_clock::time_point startTime;
    std::chrono::high_resolution_clock::time_point endTime;
    long memoryUsed;

    void setLimits() {
        // Set CPU time limit
        rlimit cpuLimit;
        cpuLimit.rlim_cur = timeLimit;
        cpuLimit.rlim_max = timeLimit;
        setrlimit(RLIMIT_CPU, &cpuLimit);

        // Set memory limit
        rlimit memLimit;
        memLimit.rlim_cur = memoryLimit;
        memLimit.rlim_max = memoryLimit;
        setrlimit(RLIMIT_AS, &memLimit);

        // Set file size limit
        rlimit fileSizeLimit;
        fileSizeLimit.rlim_cur = 1024 * 1024; // 1MB
        fileSizeLimit.rlim_max = 1024 * 1024;
        setrlimit(RLIMIT_FSIZE, &fileSizeLimit);

        // Set process limit
        rlimit procLimit;
        procLimit.rlim_cur = 10;
        procLimit.rlim_max = 10;
        setrlimit(RLIMIT_NPROC, &procLimit);
    }

    std::string readFile(const std::string& filename) {
        std::ifstream file(filename);
        std::string content((std::istreambuf_iterator<char>(file)),
                           std::istreambuf_iterator<char>());
        return content;
    }

public:
    CodeExecutor(long timeLimitMs, long memoryLimitBytes) 
        : timeLimit(timeLimitMs / 1000), memoryLimit(memoryLimitBytes), memoryUsed(0) {}

    struct ExecutionResult {
        std::string status;
        std::string output;
        std::string error;
        long executionTime;
        long memoryUsed;

        ExecutionResult(const std::string& status, const std::string& output, 
                       const std::string& error, long executionTime, long memoryUsed)
            : status(status), output(output), error(error), 
              executionTime(executionTime), memoryUsed(memoryUsed) {}

        std::string toJson() const {
            // Simple JSON escaping
            std::string escapedOutput = output;
            std::string escapedError = error;
            
            // Replace newlines and quotes
            size_t pos = 0;
            while ((pos = escapedOutput.find('\n', pos)) != std::string::npos) {
                escapedOutput.replace(pos, 1, "\\n");
                pos += 2;
            }
            pos = 0;
            while ((pos = escapedOutput.find('"', pos)) != std::string::npos) {
                escapedOutput.replace(pos, 1, "\\\"");
                pos += 2;
            }
            pos = 0;
            while ((pos = escapedError.find('\n', pos)) != std::string::npos) {
                escapedError.replace(pos, 1, "\\n");
                pos += 2;
            }
            pos = 0;
            while ((pos = escapedError.find('"', pos)) != std::string::npos) {
                escapedError.replace(pos, 1, "\\\"");
                pos += 2;
            }

            return "{\"status\":\"" + status + "\",\"output\":\"" + escapedOutput + 
                   "\",\"error\":\"" + escapedError + "\",\"execution_time\":" + 
                   std::to_string(executionTime) + ",\"memory_used\":" + 
                   std::to_string(memoryUsed) + "}";
        }
    };

    ExecutionResult execute(const std::string& executableFile, const std::string& inputFile) {
        startTime = std::chrono::high_resolution_clock::now();

        pid_t pid = fork();
        if (pid == 0) {
            // Child process
            setLimits();

            // Redirect stdin from input file
            freopen(inputFile.c_str(), "r", stdin);

            // Execute the program
            execl(executableFile.c_str(), executableFile.c_str(), (char*)NULL);
            
            // If execl fails
            std::cerr << "Failed to execute program" << std::endl;
            exit(1);
        } else if (pid > 0) {
            // Parent process
            int status;
            int options = WNOHANG;
            
            // Wait for process with timeout
            auto timeout = std::chrono::milliseconds(timeLimit * 1000);
            auto waitStart = std::chrono::high_resolution_clock::now();
            
            while (true) {
                pid_t result = waitpid(pid, &status, options);
                
                if (result == pid) {
                    // Process finished
                    break;
                } else if (result == -1) {
                    // Error
                    kill(pid, SIGKILL);
                    endTime = std::chrono::high_resolution_clock::now();
                    return ExecutionResult("runtime_error", "", "Wait failed", 
                                         std::chrono::duration_cast<std::chrono::milliseconds>(
                                             endTime - startTime).count(), memoryUsed);
                }
                
                // Check timeout
                auto elapsed = std::chrono::high_resolution_clock::now() - waitStart;
                if (elapsed > timeout) {
                    kill(pid, SIGKILL);
                    endTime = std::chrono::high_resolution_clock::now();
                    return ExecutionResult("time_limit_exceeded", "", "Execution time limit exceeded", 
                                         timeLimit * 1000, memoryUsed);
                }
                
                // Small delay to prevent busy waiting
                usleep(10000); // 10ms
            }
            
            endTime = std::chrono::high_resolution_clock::now();
            long executionTime = std::chrono::duration_cast<std::chrono::milliseconds>(
                endTime - startTime).count();

            // Get memory usage (simplified)
            struct rusage usage;
            getrusage(RUSAGE_CHILDREN, &usage);
            memoryUsed = usage.ru_maxrss * 1024; // Convert KB to bytes

            if (WIFEXITED(status) && WEXITSTATUS(status) == 0) {
                // Read output from a temporary file (since we redirected stdout)
                // For simplicity, we'll assume the program writes to stdout which we capture
                return ExecutionResult("accepted", "", "", executionTime, memoryUsed);
            } else {
                std::string errorMsg = "Process exited with code " + std::to_string(WEXITSTATUS(status));
                return ExecutionResult("runtime_error", "", errorMsg, executionTime, memoryUsed);
            }
        } else {
            // Fork failed
            endTime = std::chrono::high_resolution_clock::now();
            return ExecutionResult("runtime_error", "", "Failed to fork process", 
                                 std::chrono::duration_cast<std::chrono::milliseconds>(
                                     endTime - startTime).count(), memoryUsed);
        }
    }
};

int main(int argc, char* argv[]) {
    if (argc != 3) {
        std::cerr << "Usage: " << argv[0] << " <executable> <input_file>" << std::endl;
        return 1;
    }

    std::string executable = argv[1];
    std::string inputFile = argv[2];

    // Get limits from environment variables or use defaults
    long timeLimit = 5000; // 5 seconds default
    long memoryLimit = 128 * 1024 * 1024; // 128MB default

    const char* timeLimitEnv = std::getenv("TIME_LIMIT");
    if (timeLimitEnv) {
        timeLimit = std::stol(timeLimitEnv);
    }

    const char* memoryLimitEnv = std::getenv("MEMORY_LIMIT");
    if (memoryLimitEnv) {
        memoryLimit = std::stol(memoryLimitEnv);
    }

    CodeExecutor executor(timeLimit, memoryLimit);
    CodeExecutor::ExecutionResult result = executor.execute(executable, inputFile);

    std::cout << result.toJson() << std::endl;
    return 0;
}
