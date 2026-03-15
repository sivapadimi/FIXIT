#!/usr/bin/env python3
"""
FixIt Debugging Competition Judge System
Lightweight evaluation based on bug detection and fix validation
"""

import re
import json
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum

class ValidationStatus(Enum):
    PASSED = "PASSED"
    FAILED = "FAILED"
    PARTIAL = "PARTIAL"
    CHEATING_DETECTED = "CHEATING_DETECTED"

@dataclass
class BugDefinition:
    """Defines a single bug in a problem"""
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

class DebuggingJudge:
    """Lightweight judge for debugging competitions"""
    
    def __init__(self):
        self.problems: Dict[int, ProblemDefinition] = {}
        self.anti_cheat_patterns = self._init_anti_cheat_patterns()
    
    def _init_anti_cheat_patterns(self) -> List[str]:
        """Initialize patterns to detect cheating attempts"""
        return [
            r'print\s*\(\s*\d+\s*\)',  # Hardcoded outputs: print(42)
            r'return\s+\d+',               # Hardcoded returns: return 42
            r'//.*hardcoded|/\*.*hardcoded',  # Comments about hardcoding
            r'input\s*\(\s*["\'].*["\']\s*\)',  # Bypassing input: input("5")
            r'exit\s*\(\s*\d+\s*\)',        # Direct exit codes
            r'sys\.exit\s*\(\s*\d+\s*\)',    # System exit
        ]
    
    def normalize_line(self, line: str) -> str:
        """Normalize code line for comparison"""
        # Remove leading/trailing whitespace
        line = line.strip()
        
        # Normalize internal whitespace (multiple spaces -> single space)
        line = re.sub(r'\s+', ' ', line)
        
        # Remove trailing comments (for languages that support them)
        line = re.sub(r'#.*$', '', line)  # Python comments
        line = re.sub(r'//.*$', '', line)  # C++/Java comments
        
        # Remove trailing whitespace again
        line = line.strip()
        
        return line
    
    def detect_cheating(self, code: str) -> Tuple[bool, List[str]]:
        """Detect potential cheating attempts"""
        violations = []
        
        # Check for hardcoded outputs
        hardcoded_patterns = [
            r'print\s*\(\s*\d+\s*\)',  # print(42)
            r'return\s+\d+',               # return 42
            r'input\s*\(\s*["\'].*["\']\s*\)',  # input("5")
            r'exit\s*\(\s*\d+\s*\)',        # exit(42)
            r'sys\.exit\s*\(\s*\d+\s*\)',    # sys.exit(42)
        ]
        
        for pattern in hardcoded_patterns:
            matches = re.findall(pattern, code, re.IGNORECASE | re.MULTILINE)
            if matches:
                violations.append(f"Potential hardcoding detected: {matches}")
        
        # Only check for suspicious comments if they contain actual code patterns
        lines = code.split('\n')
        for i, line in enumerate(lines):
            # Skip if it's just a regular comment without suspicious patterns
            if '#' in line or '//' in line:
                # Extract commented content
                if '#' in line:
                    commented = line[line.index('#') + 1:].strip()
                else:
                    commented = line[line.index('//') + 1:].strip()
                
                # Only flag if comment contains code-like patterns
                if (re.search(r'[a-zA-Z_][a-zA-Z0-9_]*\s*[=+\-*/]', commented) or 
                    re.search(r'(if|for|while|return|print)\s*\(', commented)):
                    violations.append(f"Suspicious commented code at line {i+1}: {commented}")
        
        return len(violations) > 0, violations
    
    def extract_lines(self, code: str) -> List[str]:
        """Extract and normalize lines from code"""
        lines = code.split('\n')
        normalized_lines = [self.normalize_line(line) for line in lines]
        return [line for line in normalized_lines if line]  # Remove empty lines
    
    def validate_single_bug(self, code: str, bug: BugDefinition) -> Tuple[ValidationStatus, str]:
        """Validate if a single bug is fixed correctly"""
        lines = self.extract_lines(code)
        normalized_buggy = self.normalize_line(bug.buggy_line)
        normalized_fixed = self.normalize_line(bug.expected_fix)
        
        # Check if buggy line exists (should NOT exist)
        buggy_present = normalized_buggy in lines
        
        # Check if fixed line exists (should exist)
        fixed_present = normalized_fixed in lines
        
        # Validation logic
        if not buggy_present and fixed_present:
            return ValidationStatus.PASSED, f"Bug {bug.bug_id} fixed correctly"
        elif buggy_present and fixed_present:
            return ValidationStatus.FAILED, f"Bug {bug.bug_id} still present alongside fix"
        elif buggy_present and not fixed_present:
            return ValidationStatus.FAILED, f"Bug {bug.bug_id} still present, fix not found"
        elif not buggy_present and not fixed_present:
            return ValidationStatus.PARTIAL, f"Bug {bug.bug_id} removed but fix not found"
        
        return ValidationStatus.FAILED, f"Bug {bug.bug_id} validation failed"
    
    def validate_submission(self, problem_id: int, user_code: str, user_language: str) -> Dict:
        """Validate user submission against problem requirements"""
        if problem_id not in self.problems:
            return {
                "status": ValidationStatus.FAILED,
                "message": f"Problem {problem_id} not found",
                "score": 0,
                "total_points": 0
            }
        
        problem = self.problems[problem_id]
        
        # Language check
        if problem.language != user_language:
            return {
                "status": ValidationStatus.FAILED,
                "message": f"Language mismatch. Expected: {problem.language}, Got: {user_language}",
                "score": 0,
                "total_points": problem.total_points
            }
        
        # Anti-cheating check
        is_cheating, violations = self.detect_cheating(user_code)
        if is_cheating:
            return {
                "status": ValidationStatus.CHEATING_DETECTED,
                "message": f"Cheating detected: {'; '.join(violations)}",
                "score": 0,
                "total_points": problem.total_points,
                "violations": violations
            }
        
        # Validate each bug
        results = []
        total_score = 0
        
        for bug in problem.bugs:
            status, message = self.validate_single_bug(user_code, bug)
            results.append({
                "bug_id": bug.bug_id,
                "status": status.value,
                "message": message,
                "points_earned": bug.points if status == ValidationStatus.PASSED else 0,
                "max_points": bug.points
            })
            
            if status == ValidationStatus.PASSED:
                total_score += bug.points
        
        # Determine overall status
        if all(r["status"] == ValidationStatus.PASSED.value for r in results):
            overall_status = ValidationStatus.PASSED
        elif any(r["status"] == ValidationStatus.PASSED.value for r in results):
            overall_status = ValidationStatus.PARTIAL
        else:
            overall_status = ValidationStatus.FAILED
        
        return {
            "status": overall_status.value,
            "message": f"Score: {total_score}/{problem.total_points}",
            "score": total_score,
            "total_points": problem.total_points,
            "bugs_validated": results
        }
    
    def add_problem(self, problem: ProblemDefinition):
        """Add a problem to the judge system"""
        self.problems[problem.problem_id] = problem
    
    def load_problems_from_config(self, config_file: str):
        """Load problems from JSON configuration file"""
        with open(config_file, 'r') as f:
            config = json.load(f)
        
        for problem_data in config['problems']:
            bugs = []
            for bug_data in problem_data['bugs']:
                bug = BugDefinition(
                    bug_id=bug_data['bug_id'],
                    buggy_line=bug_data['buggy_line'],
                    expected_fix=bug_data['expected_fix'],
                    line_number=bug_data.get('line_number'),
                    description=bug_data.get('description', ''),
                    points=bug_data.get('points', 10)
                )
                bugs.append(bug)
            
            problem = ProblemDefinition(
                problem_id=problem_data['problem_id'],
                title=problem_data['title'],
                description=problem_data['description'],
                bugs=bugs,
                total_points=problem_data['total_points'],
                language=problem_data.get('language', 'python')
            )
            
            self.add_problem(problem)

# Example usage and configuration
def create_sample_problems():
    """Create sample debugging problems"""
    
    # Problem 1: Count Set Bits - Bitwise operator bug
    problem1 = ProblemDefinition(
        problem_id=1,
        title="Count Set Bits - Fix Bitwise Bug",
        description="Fix the bitwise operator bug in the set bits counting algorithm",
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
                buggy_line="n = n >> 2",
                expected_fix="n = n >> 1",
                line_number=6,
                description="Fix right shift from 2 to 1",
                points=10
            )
        ],
        total_points=20,
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
    """Example usage of debugging judge system"""
    judge = DebuggingJudge()
    
    # Add sample problems
    for problem in create_sample_problems():
        judge.add_problem(problem)
    
    # Example submissions
    submissions = [
        {
            "problem_id": 1,
            "language": "python",
            "code": """n = int(input())
count = 0
while n > 0:
    if (n & 1) == 1:
        count += 1
    n = n >> 1
print(count)"""
        },
        {
            "problem_id": 1,
            "language": "python", 
            "code": """n = int(input())
count = 0
while n > 0:
    if (n | 1) == 1:
        count += 1
    n = n >> 2
print(count)"""
        },
        {
            "problem_id": 2,
            "language": "python",
            "code": """arr = [1, 2, 3, 4, 5]
for i in range(len(arr)):
    print(arr[i])"""
        }
    ]
    
    # Validate submissions
    for i, submission in enumerate(submissions):
        print(f"\n=== Submission {i+1} ===")
        result = judge.validate_submission(
            submission["problem_id"],
            submission["code"],
            submission["language"]
        )
        
        print(f"Status: {result['status']}")
        print(f"Score: {result['score']}/{result['total_points']}")
        print(f"Message: {result['message']}")
        
        if 'bugs_validated' in result:
            for bug_result in result['bugs_validated']:
                print(f"  Bug {bug_result['bug_id']}: {bug_result['status']} ({bug_result['points_earned']}/{bug_result['max_points']} points)")

if __name__ == "__main__":
    main()
