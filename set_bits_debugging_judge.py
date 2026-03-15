#!/usr/bin/env python3
"""
FixIt Platform - Set Bits Counting Problem Integration
Multi-language debugging problem with line comparison evaluation
"""

import json
import time
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum

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
    description: str
    points: int = 10

@dataclass
class LanguageCode:
    """Code definitions for different languages"""
    buggy_code: str
    correct_code: str

@dataclass
class ProblemDefinition:
    """Complete debugging problem definition"""
    problem_id: int
    title: str
    description: str
    bugs: List[BugDefinition]
    total_points: int
    languages: Dict[str, LanguageCode]

class SetBitsDebuggingJudge:
    """Specialized judge for set bits counting debugging problem"""
    
    def __init__(self):
        self.problem = self.create_set_bits_problem()
    
    def create_set_bits_problem(self) -> ProblemDefinition:
        """Create the set bits counting debugging problem"""
        
        # Bug definitions (common across all languages)
        bugs = [
            BugDefinition(
                bug_id="count_initialization",
                buggy_line="count = 2",
                expected_fix="count = 0",
                description="Count should start from 0",
                points=10
            ),
            BugDefinition(
                bug_id="loop_condition",
                buggy_line="while n < 0",
                expected_fix="while n > 0",
                description="Loop should run while n is positive",
                points=15
            ),
            BugDefinition(
                bug_id="bitwise_operator",
                buggy_line="if (n | 1)",
                expected_fix="if (n & 1)",
                description="Use AND to check the last bit",
                points=15
            ),
            BugDefinition(
                bug_id="comparison_operator",
                buggy_line="= 1",
                expected_fix="== 1",
                description="Use comparison operator instead of assignment",
                points=15
            ),
            BugDefinition(
                bug_id="shift_direction",
                buggy_line="n = n << 1",
                expected_fix="n = n >> 1",
                description="Shift right to remove processed bit",
                points=15
            ),
            BugDefinition(
                bug_id="print_typo",
                buggy_line="print(cout)",
                expected_fix="print(count)",
                description="Variable name typo",
                points=10
            )
        ]
        
        # Language-specific code
        languages = {
            "python": LanguageCode(
                buggy_code='''n = int(input())

count = 2

while n < 0:
    if (n | 1) = 1:
        count = count + 1
    n = n << 1

print(cout)''',
                correct_code='''n = int(input())

count = 0

while n > 0:
    if (n & 1) == 1:
        count = count + 1
    n = n >> 1

print(count)'''
            ),
            "java": LanguageCode(
                buggy_code='''import java.util.*;

public class Main {
    public static void main(String[] args) {

        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();

        int count = 2;

        while (n < 0) {
            if ((n | 1) = 1) {
                count = count + 1;
            }
            n = n << 1;
        }

        System.out.println(cout);
    }
}''',
                correct_code='''import java.util.*;

public class Main {
    public static void main(String[] args) {

        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();

        int count = 0;

        while (n > 0) {
            if ((n & 1) == 1) {
                count = count + 1;
            }
            n = n >> 1;
        }

        System.out.println(count);
    }
}'''
            ),
            "cpp": LanguageCode(
                buggy_code='''#include <iostream>
using namespace std;

int main() {

    int n;
    cin >> n;

    int count = 2;

    while (n < 0) {
        if ((n | 1) = 1) {
            count = count + 1;
        }
        n = n << 1;
    }

    cout << cout;

    return 0;
}''',
                correct_code='''#include <iostream>
using namespace std;

int main() {

    int n;
    cin >> n;

    int count = 0;

    while (n > 0) {
        if ((n & 1) == 1) {
            count = count + 1;
        }
        n = n >> 1;
    }

    cout << count;

    return 0;
}'''
            )
        }
        
        return ProblemDefinition(
            problem_id=1,
            title="Count Set Bits - Debug the Algorithm",
            description="Given an integer N, count the number of set bits (1s) in its binary representation. Fix all bugs in the provided code.",
            bugs=bugs,
            total_points=80,
            languages=languages
        )
    
    def normalize_code(self, code: str, language: str) -> str:
        """Normalize code for consistent comparison"""
        if not code:
            return ""
        
        # Convert to string and strip whitespace
        code = str(code).strip()
        
        # Normalize line endings
        code = code.replace('\r\n', '\n').replace('\r', '\n')
        
        # Split into lines and normalize each line
        lines = code.split('\n')
        normalized_lines = []
        
        for line in lines:
            # Remove leading/trailing whitespace
            line = line.strip()
            
            # Normalize internal whitespace (multiple spaces -> single space)
            line = ' '.join(line.split())
            
            # Language-specific comment removal
            if language == "python":
                line = line.split('#')[0]  # Remove Python comments
            elif language in ["java", "cpp"]:
                line = line.split('//')[0]  # Remove C++/Java comments
                # Remove C-style comments
                if '/*' in line:
                    line = line.split('/*')[0]
            
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
        line = ' '.join(line.split())
        
        return line
    
    def detect_cheating(self, code: str, language: str) -> Tuple[bool, List[str]]:
        """Detect potential cheating attempts"""
        violations = []
        normalized_code = self.normalize_code(code, language)
        
        # Check for hardcoded outputs
        hardcoded_patterns = [
            r'print\s*\(\s*\d+\s*\)',           # print(42)
            r'cout\s*<<\s*\d+',                  # cout << 42
            r'System\.out\.println\s*\(\s*\d+\s*\)',  # System.out.println(42)
            r'return\s+\d+',                       # return 42
        ]
        
        # Only check for obvious hardcoded patterns
        import re
        for pattern in hardcoded_patterns:
            matches = re.findall(pattern, normalized_code, re.IGNORECASE)
            if matches:
                violations.append(f"Hardcoded output detected: {pattern}")
        
        # Check for suspicious comments (only if they contain actual code)
        lines = normalized_code.split('\n')
        for i, line in enumerate(lines):
            # Only flag if line has actual comment patterns with code keywords
            if (('#' in line and any(keyword in line.lower() for keyword in ['if', 'while', 'for', 'return', 'print'])) or
                ('//' in line and any(keyword in line.lower() for keyword in ['if', 'while', 'for', 'return', 'print']))):
                violations.append(f"Suspicious commented code at line {i+1}: {line}")
        
        return len(violations) > 0, violations
    
    def evaluate_single_bug(self, normalized_code: str, bug: BugDefinition, language: str) -> Dict:
        """Evaluate if a single bug is fixed correctly"""
        # Normalize both buggy line and expected fix
        normalized_buggy = self.normalize_line(bug.buggy_line)
        normalized_fix = self.normalize_line(bug.expected_fix)
        
        # Language-specific adjustments
        if language == "java":
            # Java-specific normalization
            normalized_buggy = normalized_buggy.replace('cout', 'System.out.println')
            normalized_fix = normalized_fix.replace('cout', 'System.out.println')
        elif language == "cpp":
            # C++ specific normalization
            normalized_buggy = normalized_buggy.replace('print(', 'cout <<')
            normalized_fix = normalized_fix.replace('print(', 'cout <<')
        
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
    
    def evaluate_submission(self, user_code: str, user_language: str) -> Dict:
        """Evaluate user submission against problem requirements"""
        start_time = time.time()
        
        # Language validation
        if user_language not in self.problem.languages:
            return {
                "status": EvaluationStatus.SYSTEM_ERROR.value,
                "score": 0,
                "total_points": self.problem.total_points,
                "bugs_evaluated": [],
                "message": f"Unsupported language: {user_language}",
                "execution_time": 0
            }
        
        # Anti-cheating check
        is_cheating, violations = self.detect_cheating(user_code, user_language)
        if is_cheating:
            return {
                "status": EvaluationStatus.CHEATING_DETECTED.value,
                "score": 0,
                "total_points": self.problem.total_points,
                "bugs_evaluated": [],
                "message": f"Cheating detected: {'; '.join(violations)}",
                "execution_time": 0
            }
        
        # Normalize user code
        normalized_code = self.normalize_code(user_code, user_language)
        
        # Evaluate each bug
        bugs_evaluated = []
        total_score = 0
        
        for bug in self.problem.bugs:
            bug_result = self.evaluate_single_bug(normalized_code, bug, user_language)
            bugs_evaluated.append(bug_result)
            
            if bug_result["status"] == EvaluationStatus.PASSED.value:
                total_score += bug.points
        
        # Determine overall status
        all_passed = all(bug["status"] == EvaluationStatus.PASSED.value for bug in bugs_evaluated)
        any_passed = any(bug["status"] == EvaluationStatus.PASSED.value for bug in bugs_evaluated)
        
        if all_passed:
            overall_status = EvaluationStatus.PASSED
            message = f"All {len(self.problem.bugs)} bugs fixed correctly! Score: {total_score}/{self.problem.total_points}"
        elif any_passed:
            overall_status = EvaluationStatus.FAILED
            passed_count = sum(1 for bug in bugs_evaluated if bug["status"] == EvaluationStatus.PASSED.value)
            message = f"Partial fix: {passed_count}/{len(self.problem.bugs)} bugs fixed. Score: {total_score}/{self.problem.total_points}"
        else:
            overall_status = EvaluationStatus.FAILED
            message = f"No bugs fixed. Score: {total_score}/{self.problem.total_points}"
        
        execution_time = time.time() - start_time
        
        return {
            "status": overall_status.value,
            "score": total_score,
            "total_points": self.problem.total_points,
            "bugs_evaluated": bugs_evaluated,
            "message": message,
            "execution_time": execution_time,
            "fixed_bugs": sum(1 for bug in bugs_evaluated if bug["status"] == EvaluationStatus.PASSED.value),
            "total_bugs": len(self.problem.bugs)
        }
    
    def get_problem_definition(self) -> Dict:
        """Get problem definition for frontend"""
        return {
            "problem_id": self.problem.problem_id,
            "title": self.problem.title,
            "description": self.problem.description,
            "total_points": self.problem.total_points,
            "bugs": [
                {
                    "bug_id": bug.bug_id,
                    "buggy_line": bug.buggy_line,
                    "expected_fix": bug.expected_fix,
                    "description": bug.description,
                    "points": bug.points
                }
                for bug in self.problem.bugs
            ],
            "languages": {
                lang: {
                    "buggy_code": code.buggy_code,
                    "correct_code": code.correct_code
                }
                for lang, code in self.problem.languages.items()
            }
        }

def main():
    """Test the set bits debugging judge"""
    judge = SetBitsDebuggingJudge()
    
    print("=== FixIt Platform - Set Bits Counting Debugging Problem ===\n")
    
    # Test submissions
    test_submissions = [
        {
            "language": "python",
            "code": '''n = int(input())

count = 0

while n > 0:
    if (n & 1) == 1:
        count = count + 1
    n = n >> 1

print(count)''',
            "expected": "PASSED"
        },
        {
            "language": "python", 
            "code": '''n = int(input())

count = 2

while n < 0:
    if (n | 1) = 1:
        count = count + 1
    n = n << 1

print(cout)''',
            "expected": "FAILED"
        },
        {
            "language": "java",
            "code": '''import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int count = 0;
        while (n > 0) {
            if ((n & 1) == 1) {
                count = count + 1;
            }
            n = n >> 1;
        }
        System.out.println(count);
    }
}''',
            "expected": "PASSED"
        },
        {
            "language": "cpp",
            "code": '''#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    int count = 0;
    while (n > 0) {
        if ((n & 1) == 1) {
            count = count + 1;
        }
        n = n >> 1;
    }
    cout << count;
    return 0;
}''',
            "expected": "PASSED"
        }
    ]
    
    for i, submission in enumerate(test_submissions):
        print(f"{'='*60}")
        print(f"Test Submission {i+1} ({submission['language'].upper()})")
        print(f"{'='*60}")
        
        result = judge.evaluate_submission(submission["code"], submission["language"])
        
        print(f"Status: {result['status']}")
        print(f"Expected: {submission['expected']}")
        print(f"Score: {result['score']}/{result['total_points']}")
        print(f"Fixed Bugs: {result.get('fixed_bugs', 'N/A')}/{result.get('total_bugs', 'N/A')}")
        print(f"Message: {result['message']}")
        print(f"Execution Time: {result['execution_time']:.4f}s")
        
        print("\nBug Evaluation Details:")
        for bug_result in result["bugs_evaluated"]:
            print(f"  {bug_result['bug_id']}: {bug_result['status']}")
            print(f"    {bug_result['message']}")
            print(f"    Points: {bug_result['points_earned']}/{bug_result['max_points']}")
        
        print()

if __name__ == "__main__":
    main()
