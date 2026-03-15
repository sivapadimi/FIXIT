# FixIt Debugging Competition Judge System

## Overview

The FixIt platform uses a **lightweight line comparison system** instead of code compilation and execution. This approach is specifically designed for debugging competitions where users fix existing buggy code rather than solving problems from scratch.

## Architecture

```
User Code Submission
        ↓
   Code Normalization
        ↓
   Anti-Cheating Check
        ↓
   Bug Line Detection
        ↓
   Fix Line Validation
        ↓
   Score Calculation
        ↓
   Leaderboard Update
```

## Core Components

### 1. BugDefinition Class
Defines a single bug that needs to be fixed:

```python
@dataclass
class BugDefinition:
    bug_id: str           # Unique identifier
    buggy_line: str       # The buggy code line
    expected_fix: str     # The correct fix
    line_number: int      # Optional line number
    description: str      # Bug description
    points: int          # Points for fixing
```

### 2. ProblemDefinition Class
Defines a complete debugging problem:

```python
@dataclass
class ProblemDefinition:
    problem_id: int
    title: str
    description: str
    bugs: List[BugDefinition]
    total_points: int
    language: str
```

### 3. DebuggingJudge Class
Main judge system that validates submissions:

- **Line Normalization**: Ignores whitespace, indentation, formatting
- **Anti-Cheating**: Detects hardcoded outputs, suspicious comments
- **Bug Validation**: Checks if buggy lines are removed and fixes are applied
- **Scoring**: Calculates partial/complete scores

## Validation Logic

### Line Normalization
```python
def normalize_line(self, line: str) -> str:
    # Remove leading/trailing whitespace
    line = line.strip()
    
    # Normalize internal whitespace (multiple spaces -> single space)
    line = re.sub(r'\s+', ' ', line)
    
    # Remove comments
    line = re.sub(r'#.*$', '', line)  # Python
    line = re.sub(r'//.*$', '', line)  # C++/Java
    
    # Remove trailing whitespace again
    line = line.strip()
    
    return line
```

### Bug Validation Rules

| Buggy Line Present | Fix Line Present | Result |
|-------------------|------------------|---------|
| ❌ No | ✅ Yes | **PASSED** - Bug fixed correctly |
| ✅ Yes | ✅ Yes | **FAILED** - Bug still present alongside fix |
| ✅ Yes | ❌ No | **FAILED** - Bug still present, no fix |
| ❌ No | ❌ No | **PARTIAL** - Bug removed but fix not found |

### Anti-Cheating Detection

The system detects and flags:

1. **Hardcoded Outputs**
   ```python
   print(42)           # Direct number printing
   return 42           # Hardcoded return
   input("5")           # Bypassing input
   exit(42)            # Direct exit codes
   ```

2. **Suspicious Comments**
   ```python
   # if (n & 1) == 1:    # Commented out code
   // return result;          # Suspicious commented logic
   ```

## Configuration Format

Problems are defined in JSON format:

```json
{
  "problems": [
    {
      "problem_id": 1,
      "title": "Count Set Bits - Fix Bitwise Bug",
      "description": "Fix bitwise operator bug in set bits counting algorithm",
      "language": "python",
      "total_points": 20,
      "bugs": [
        {
          "bug_id": "bitwise_or_bug",
          "buggy_line": "if (n | 1) == 1:",
          "expected_fix": "if (n & 1) == 1:",
          "line_number": 4,
          "description": "Change OR (|) to AND (&) operator",
          "points": 10
        },
        {
          "bug_id": "shift_bug",
          "buggy_line": "n = n >> 2",
          "expected_fix": "n = n >> 1",
          "line_number": 6,
          "description": "Fix right shift from 2 to 1",
          "points": 10
        }
      ]
    }
  ]
}
```

## API Endpoints

### POST /api/validate
Validates a user submission:

**Request:**
```json
{
  "problemId": 1,
  "code": "n = int(input())\n...",
  "language": "python"
}
```

**Response:**
```json
{
  "status": "PASSED",
  "message": "Score: 20/20",
  "score": 20,
  "totalPoints": 20,
  "bugsValidated": [
    {
      "bugId": "bitwise_or_bug",
      "status": "PASSED",
      "pointsEarned": 10,
      "maxPoints": 10
    },
    {
      "bugId": "shift_bug", 
      "status": "PASSED",
      "pointsEarned": 10,
      "maxPoints": 10
    }
  ]
}
```

### GET /api/problems
Returns all available problems for the competition.

## Example Usage

### Python Implementation
```python
# Initialize judge
judge = DebuggingJudge()
judge.load_problems_from_config('problems_config.json')

# Validate submission
result = judge.validate_submission(
    problem_id=1,
    user_code=user_code,
    user_language="python"
)

if result['status'] == 'PASSED':
    print(f"Perfect! Score: {result['score']}/{result['total_points']}")
elif result['status'] == 'PARTIAL':
    print(f"Good progress! Score: {result['score']}/{result['total_points']}")
else:
    print(f"Keep trying! Score: {result['score']}/{result['total_points']}")
```

### Node.js Implementation
```javascript
// Initialize judge
const judge = new DebuggingJudge();
judge.loadProblemsFromConfig('./problems_config.json');

// Validate submission
const result = judge.validateSubmission(problemId, code, language);

console.log(`Status: ${result.status}`);
console.log(`Score: ${result.score}/${result.totalPoints}`);
```

## Advantages

### ✅ **Performance**
- **Lightweight**: No compilation or execution overhead
- **Fast**: Line comparison is O(n) vs O(execution time)
- **Scalable**: Can handle thousands of submissions quickly

### ✅ **Reliability**
- **Deterministic**: Same result every time
- **No Dependencies**: No need for compilers/interpreters
- **Language Agnostic**: Works with any programming language

### ✅ **Security**
- **No Code Execution**: Eliminates security risks
- **No Resource Usage**: No CPU/memory consumption
- **No Sandbox Needed**: Simpler deployment

### ✅ **Debugging Focus**
- **Targeted**: Validates specific bug fixes
- **Educational**: Teaches specific debugging skills
- **Consistent**: Same validation for all users

## Extending the System

### Multiple Bugs per Problem
The system naturally handles multiple bugs:

```json
{
  "bugs": [
    {
      "bug_id": "bug_1",
      "buggy_line": "line 1 bug",
      "expected_fix": "line 1 fix",
      "points": 10
    },
    {
      "bug_id": "bug_2", 
      "buggy_line": "line 2 bug",
      "expected_fix": "line 2 fix",
      "points": 15
    }
  ]
}
```

### Language Support
Add new languages by extending normalization:

```python
def normalize_line(self, line: str) -> str:
    # Existing logic...
    
    # Add language-specific comment removal
    line = re.sub(r'/\*.*?\*/', '', line)  # C-style comments
    line = re.sub(r'--.*$', '', line)      # SQL comments
    
    return line
```

### Advanced Anti-Cheating
Enhance cheating detection:

```python
def detect_cheating(self, code: str) -> Tuple[bool, List[str]]:
    violations = []
    
    # Check for suspicious variable names
    if re.search(r'(answer|result|output)\s*=\s*\d+', code):
        violations.append("Suspicious variable assignment detected")
    
    # Check for logic bypass
    if re.search(r'if\s+False\s*:', code):
        violations.append("Logic bypass detected")
    
    return len(violations) > 0, violations
```

## Deployment

### Requirements
- **Python 3.7+** or **Node.js 14+**
- **No external dependencies** for basic functionality
- **Web server** (Express.js recommended for Node.js)

### Setup
```bash
# Python version
pip install -r requirements.txt  # (minimal dependencies)
python debugging_judge.py

# Node.js version  
npm install
node debugging_judge_server.js
```

The FixIt debugging judge provides a **fast, secure, and educational** approach to validating debugging skills without the complexity of code execution systems.
