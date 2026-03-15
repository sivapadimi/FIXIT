import java.io.*;
import java.util.concurrent.*;
import java.lang.management.*;

public class Executor {
    private long timeLimit;
    private long memoryLimit;
    private long startTime;
    private long endTime;
    private long memoryUsed;
    
    public Executor(long timeLimit, long memoryLimit) {
        this.timeLimit = timeLimit;
        this.memoryLimit = memoryLimit;
    }
    
    public ExecutionResult execute(String codeFile, String inputFile) {
        startTime = System.currentTimeMillis();
        
        try {
            // Read input
            String input = readFile(inputFile);
            
            // Create process builder
            ProcessBuilder pb = new ProcessBuilder("java", codeFile);
            pb.redirectErrorStream(true);
            
            // Start process
            Process process = pb.start();
            
            // Write input to process
            try (OutputStream os = process.getOutputStream()) {
                os.write(input.getBytes());
                os.flush();
            }
            
            // Read output with timeout
            ExecutorService executor = Executors.newSingleThreadExecutor();
            Future<String> future = executor.submit(() -> readInputStream(process.getInputStream()));
            
            String output;
            try {
                output = future.get(timeLimit, TimeUnit.MILLISECONDS);
            } catch (TimeoutException e) {
                process.destroyForcibly();
                return new ExecutionResult("time_limit_exceeded", "", "Execution time limit exceeded", 
                    timeLimit, memoryUsed);
            } finally {
                executor.shutdown();
            }
            
            // Wait for process to complete
            boolean finished = process.waitFor(timeLimit, TimeUnit.MILLISECONDS);
            if (!finished) {
                process.destroyForcibly();
                return new ExecutionResult("time_limit_exceeded", "", "Execution time limit exceeded", 
                    timeLimit, memoryUsed);
            }
            
            endTime = System.currentTimeMillis();
            long executionTime = endTime - startTime;
            
            // Get memory usage
            try {
                MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();
                MemoryUsage heapUsage = memoryBean.getHeapMemoryUsage();
                memoryUsed = heapUsage.getUsed();
                
                // Check memory limit
                if (memoryUsed > memoryLimit) {
                    process.destroyForcibly();
                    return new ExecutionResult("memory_limit_exceeded", output.trim(), 
                        "Memory limit exceeded: used " + memoryUsed + " bytes, limit " + memoryLimit + " bytes", 
                        executionTime, memoryUsed);
                }
            } catch (Exception e) {
                memoryUsed = 0;
            }
            
            int exitCode = process.exitValue();
            
            if (exitCode == 0) {
                return new ExecutionResult("accepted", output.trim(), "", executionTime, memoryUsed);
            } else {
                return new ExecutionResult("runtime_error", output.trim(), 
                    "Process exited with code " + exitCode, executionTime, memoryUsed);
            }
            
        } catch (Exception e) {
            endTime = System.currentTimeMillis();
            return new ExecutionResult("runtime_error", "", e.getMessage(), 
                endTime - startTime, memoryUsed);
        }
    }
    
    private String readFile(String filename) throws IOException {
        StringBuilder content = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new FileReader(filename))) {
            String line;
            while ((line = reader.readLine()) != null) {
                content.append(line).append("\n");
            }
        }
        return content.toString();
    }
    
    private String readInputStream(InputStream is) throws IOException {
        StringBuilder content = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(is))) {
            String line;
            while ((line = reader.readLine()) != null) {
                content.append(line).append("\n");
            }
        }
        return content.toString();
    }
    
    public static class ExecutionResult {
        public final String status;
        public final String output;
        public final String error;
        public final long executionTime;
        public final long memoryUsed;
        
        public ExecutionResult(String status, String output, String error, long executionTime, long memoryUsed) {
            this.status = status;
            this.output = output;
            this.error = error;
            this.executionTime = executionTime;
            this.memoryUsed = memoryUsed;
        }
        
        public String toJson() {
            return String.format(
                "{\"status\":\"%s\",\"output\":\"%s\",\"error\":\"%s\",\"execution_time\":%d,\"memory_used\":%d}",
                status.replace("\"", "\\\""),
                output.replace("\"", "\\\"").replace("\n", "\\n"),
                error.replace("\"", "\\\"").replace("\n", "\\n"),
                executionTime,
                memoryUsed
            );
        }
    }
    
    public static void main(String[] args) {
        if (args.length != 2) {
            System.err.println("Usage: java Executor <classFile> <inputFile>");
            System.exit(1);
        }
        
        String classFile = args[0];
        String inputFile = args[1];
        
        // Get limits from environment variables or use defaults
        long timeLimit = Long.parseLong(System.getenv().getOrDefault("TIME_LIMIT", "5000"));
        long memoryLimit = Long.parseLong(System.getenv().getOrDefault("MEMORY_LIMIT", "134217728")); // 128MB
        
        Executor executor = new Executor(timeLimit, memoryLimit);
        ExecutionResult result = executor.execute(classFile, inputFile);
        
        System.out.println(result.toJson());
    }
}
