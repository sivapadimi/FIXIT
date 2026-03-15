#!/usr/bin/env python3
"""
FixIt Platform - Pure Line Comparison Debugging Judge
Lightweight, fast, and secure debugging evaluation system
"""

import time
import re
import json
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class EvaluationStatus(Enum):
    PASSED = "PASSED"
    FAILED = "FAILED"
    CHEATING_DETECTED = "CHEATING_DETECTED"
    SYSTEM_ERROR = "SYSTEM_ERROR"

@dataclass
class BugDefinition:
    """Defines a single bug in a debugging problem"""
    bug_id: str
    buggy_line: str
    expected_fix: str
    line_number: Optional[int] = None
    description: str = ""
    points: int = 10

@dataclass
class ProblemDefinition:
    """Defines a debugging problem with multiple bugs"""
    problem_id: int
    title: str
    description: str
    bugs: List[BugDefinition]
    total_points: int
    language: str = "python"

@dataclass
class EvaluationResult:
    """Result of debugging evaluation"""
    status: EvaluationStatus
    score: int
    total_points: int
    bugs_evaluated: List[Dict]
    message: str
    execution_time: float = 0.0

class LineComparisonJudge:
    """Pure line comparison debugging judge system"""
    
    def __init__(self):
        self.anti_cheat_patterns = self._init_anti_cheat_patterns()
    
    def _init_anti_cheat_patterns(self) -> List[str]:
        """Initialize patterns to detect cheating attempts"""
        return [
            r'print\s*\(\s*\d+\s*\)',           # Hardcoded outputs: print(42)
            r'return\s+\d+',                       # Hardcoded returns: return 42
            r'input\s*\(\s*["\'].*["\']\s*\)',  # Bypassing input: input("5")
            r'exit\s*\(\s*\d+\s*\)',              # Direct exit codes
            r'sys\.exit\s*\(\s*\d+\s*\)',          # System exit
            r'//.*hardcoded|/\*.*hardcoded',        # Comments about hardcoding
            r'answer\s*=\s*\d+',                  # Variable assignment with hardcoded value
            r'result\s*=\s*\d+',                  # Result variable with hardcoded value
            r'output\s*=\s*\d+',                  # Output variable with hardcoded value
        ]
    
    def normalize_code(self, code: str) -> str:
        """Normalize code for consistent comparison"""
        if not code:
            return ""
        
        # Convert to string if not already
        code = str(code)
        
        # Remove leading/trailing whitespace
        code = code.strip()
        
        # Normalize line endings (convert Windows CRLF to Unix LF)
        code = code.replace('\r\n', '\n').replace('\r', '\n')
        
        # Split into lines and normalize each line
        lines = code.split('\n')
        normalized_lines = []
        
        for line in lines:
            # Remove leading/trailing whitespace
            line = line.strip()
            
            # Normalize internal whitespace (multiple spaces -> single space)
            line = re.sub(r'\s+', ' ', line)
            
            # Remove trailing comments (for languages that support them)
            line = re.sub(r'#.*$', '', line)      # Python comments
            line = re.sub(r'//.*$', '', line)     # C++/Java comments
            line = re.sub(r'/\*.*?\*/', '', line) # C-style comments
            
            # Remove trailing whitespace again
            line = line.strip()
            
            # Only add non-empty lines
            if line:
                normalized_lines.append(line)
        
        return '\n'.join(normalized_lines)
    
    def normalize_line(self, line: str) -> str:
        """Normalize a single line for comparison"""
        if not line:
            return ""
        
        # Convert to string and strip whitespace
        line = str(line).strip()
        
        # Normalize internal whitespace
        line = re.sub(r'\s+', ' ', line)
        
        # Remove comments
        line = re.sub(r'#.*$', '', line)      # Python
        line = re.sub(r'//.*$', '', line)     # C++/Java
        
        return line
    
    def detect_cheating(self, code: str) -> Tuple[bool, List[str]]:
        """Detect potential cheating attempts"""
        violations = []
        normalized_code = self.normalize_code(code)
        
        # Check for hardcoded outputs and suspicious patterns
        for pattern in self.anti_cheat_patterns:
            matches = re.findall(pattern, normalized_code, re.IGNORECASE | re.MULTILINE)
            if matches:
                violations.append(f"Potential cheating detected: {pattern} - {matches}")
        
        # Check for commented out buggy lines
        lines = normalized_code.split('\n')
        for i, line in enumerate(lines):
            # Check if line contains commented code patterns
            if re.search(r'#.*\b(if|for|while|return|print)\b', line, re.IGNORECASE):
                violations.append(f"Suspicious commented code at line {i+1}: {line}")
            elif re.search(r'//.*\b(if|for|while|return|print)\b', line, re.IGNORECASE):
                violations.append(f"Suspicious commented code at line {i+1}: {line}")
        
        return len(violations) > 0, violations
    
    def evaluate_single_bug(self, normalized_code: str, bug: BugDefinition) -> Dict:
        """Evaluate if a single bug is fixed correctly"""
        # Normalize both buggy line and expected fix
        normalized_buggy = self.normalize_line(bug.buggy_line)
        normalized_fix = self.normalize_line(bug.expected_fix)
        
        # Check if buggy line exists (should NOT exist)
        buggy_present = normalized_buggy in normalized_code
        
        # Check if fixed line exists (should exist)
        fix_present = normalized_fix in normalized_code
        
        # Evaluation logic
        if not buggy_present and fix_present:
            return {
                "bug_id": bug.bug_id,
                "status": EvaluationStatus.PASSED.value,
                "message": f"Bug {bug.bug_id} fixed correctly",
                "points_earned": bug.points,
                "max_points": bug.points,
                "buggy_line_found": False,
                "fix_line_found": True,
                "description": bug.description
            }
        elif buggy_present and fix_present:
            return {
                "bug_id": bug.bug_id,
                "status": EvaluationStatus.FAILED.value,
                "message": f"Bug {bug.bug_id} still present alongside fix",
                "points_earned": 0,
                "max_points": bug.points,
                "buggy_line_found": True,
                "fix_line_found": True,
                "description": bug.description
            }
        elif buggy_present and not fix_present:
            return {
                "bug_id": bug.bug_id,
                "status": EvaluationStatus.FAILED.value,
                "message": f"Bug {bug.bug_id} still present, fix not found",
                "points_earned": 0,
                "max_points": bug.points,
                "buggy_line_found": True,
                "fix_line_found": False,
                "description": bug.description
            }
        elif not buggy_present and not fix_present:
            return {
                "bug_id": bug.bug_id,
                "status": EvaluationStatus.FAILED.value,
                "message": f"Bug {bug.bug_id} removed but fix not found",
                "points_earned": 0,
                "max_points": bug.points,
                "buggy_line_found": False,
                "fix_line_found": False,
                "description": bug.description
            }
        
        return {
            "bug_id": bug.bug_id,
            "status": EvaluationStatus.FAILED.value,
            "message": f"Bug {bug.bug_id} evaluation failed",
            "points_earned": 0,
            "max_points": bug.points,
            "buggy_line_found": False,
            "fix_line_found": False,
            "description": bug.description
        }
    
    def evaluate_submission(self, problem: ProblemDefinition, user_code: str, user_language: str) -> EvaluationResult:
        """Evaluate user submission against problem requirements"""
        start_time = time.time()
        
        # Language check
        if problem.language != user_language:
            return EvaluationResult(
                status=EvaluationStatus.SYSTEM_ERROR,
                score=0,
                total_points=problem.total_points,
                bugs_evaluated=[],
                message=f"Language mismatch. Expected: {problem.language}, Got: {user_language}",
                execution_time=0
            )
        
        # Anti-cheating check
        is_cheating, violations = self.detect_cheating(user_code)
        if is_cheating:
            return EvaluationResult(
                status=EvaluationStatus.CHEATING_DETECTED,
                score=0,
                total_points=problem.total_points,
                bugs_evaluated=[],
                message=f"Cheating detected: {'; '.join(violations)}",
                execution_time=0
            )
        
        # Normalize user code
        normalized_code = self.normalize_code(user_code)
        
        # Evaluate each bug
        bugs_evaluated = []
        total_score = 0
        
        for bug in problem.bugs:
            bug_result = self.evaluate_single_bug(normalized_code, bug)
            bugs_evaluated.append(bug_result)
            
            if bug_result["status"] == EvaluationStatus.PASSED.value:
                total_score += bug.points
        
        # Determine overall status
        all_passed = all(bug["status"] == EvaluationStatus.PASSED.value for bug in bugs_evaluated)
        any_passed = any(bug["status"] == EvaluationStatus.PASSED.value for bug in bugs_evaluated)
        
        if all_passed:
            overall_status = EvaluationStatus.PASSED
            message = f"All {len(problem.bugs)} bugs fixed correctly! Score: {total_score}/{problem.total_points}"
        elif any_passed:
            overall_status = EvaluationStatus.FAILED
            passed_count = sum(1 for bug in bugs_evaluated if bug["status"] == EvaluationStatus.PASSED.value)
            message = f"Partial fix: {passed_count}/{len(problem.bugs)} bugs fixed. Score: {total_score}/{problem.total_points}"
        else:
            overall_status = EvaluationStatus.FAILED
            message = f"No bugs fixed. Score: {total_score}/{problem.total_points}"
        
        execution_time = time.time() - start_time
        
        return EvaluationResult(
            status=overall_status,
            score=total_score,
            total_points=problem.total_points,
            bugs_evaluated=bugs_evaluated,
            message=message,
            execution_time=execution_time
        )

# Example usage and testing
def create_sample_problems():
    """Create sample debugging problems"""
    
    # Problem 1: Count Set Bits - Multiple bugs
    problem1 = ProblemDefinition(
        problem_id=1,
        title="Count Set Bits - Fix Multiple Bugs",
        description="Fix all bugs in the set bits counting algorithm",
        bugs=[
            BugDefinition(
                bug_id="bitwise_or_bug",
                buggy_line="if (n | 1) == 1:",
                expected_fix="if (n & 1) == 1:",
                line_number=4,
                description="Change OR (|) to AND (&) operator",
                points=10
            ),
            BugDefinition(
                bug_id="shift_bug",
                buggy_line="n = n << 1",
                expected_fix="n = n >> 1",
                line_number=6,
                description="Fix left shift to right shift",
                points=10
            ),
            BugDefinition(
                bug_id="initialization_bug",
                buggy_line="count = 2",
                expected_fix="count = 0",
                line_number=2,
                description="Initialize count to 0 instead of 2",
                points=10
            )
        ],
        total_points=30,
        language="python"
    )
    
    # Problem 2: Array bounds - Loop condition bug
    problem2 = ProblemDefinition(
        problem_id=2,
        title="Array Bounds - Fix Loop Bug",
        description="Fix the array bounds issue in the loop",
        bugs=[
            BugDefinition(
                bug_id="loop_bounds_bug",
                buggy_line="for i in range(len(arr) + 1):",
                expected_fix="for i in range(len(arr)):",
                line_number=3,
                description="Remove +1 from loop bounds",
                points=15
            )
        ],
        total_points=15,
        language="python"
    )
    
    return [problem1, problem2]

def main():
    """Example usage of line comparison judge system"""
    judge = LineComparisonJudge()
    
    # Add sample problems
    problems = create_sample_problems()
    
    # Example submissions
    submissions = [
        {
            "problem_id": 1,
            "language": "python",
            "code": """n = int(input())
count = 0
while n > 0:
    if (n & 1) == 1:  # Fixed: OR -> AND
        count += 1
    n = n >> 1          # Fixed: left shift -> right shift
print(count)"""
        },
        {
            "problem_id": 1,
            "language": "python",
            "code": """n = int(input())
count = 2
while n > 0:
    if (n | 1) == 1:  # Still buggy
        count += 1
    n = n << 1          # Still buggy
print(count)"""
        },
        {
            "problem_id": 2,
            "language": "python",
            "code": """arr = [1, 2, 3, 4, 5]
for i in range(len(arr)):  # Fixed bounds
    print(arr[i])"""
        }
    ]
    
    # Evaluate submissions
    for i, submission in enumerate(submissions):
        print(f"\n{'='*60}")
        print(f"Submission {i+1}")
        print(f"{'='*60}")
        
        problem = next((p for p in problems if p.problem_id == submission["problem_id"]), None)
        if not problem:
            print(f"Problem {submission['problem_id']} not found!")
            continue
        
        result = judge.evaluate_submission(
            problem, 
            submission["code"], 
            submission["language"]
        )
        
        print(f"Status: {result.status.value}")
        print(f"Score: {result.score}/{result.total_points}")
        print(f"Message: {result.message}")
        print(f"Execution Time: {result.execution_time:.4f}s")
        
        print("\nBug Evaluation Details:")
        for bug_result in result.bugs_evaluated:
            print(f"  Bug {bug_result['bug_id']}: {bug_result['status']}")
            print(f"    {bug_result['message']}")
            print(f"    Points: {bug_result['points_earned']}/{bug_result['max_points']}")
            print(f"    Buggy line found: {bug_result['buggy_line_found']}")
            print(f"    Fix line found: {bug_result['fix_line_found']}")

if __name__ == "__main__":
    main()
