import requests
import json

def test_code(code, description):
    print(f"\n=== Testing {description} ===")
    
    test_cases = [
        ("1", "1"),
        ("2", "1"), 
        ("3", "2"),
        ("4", "1"),
        ("5", "2")
    ]
    
    for input_val, expected in test_cases:
        try:
            r = requests.post('http://localhost:8080/api/execute', json={
                'code': code,
                'language': 'python',
                'input': input_val
            })
            
            result = r.json()
            actual = result.get('output', '')
            status = 'PASS' if actual == expected else 'FAIL'
            
            print(f"Input: {input_val}, Expected: {expected}, Actual: {actual}, Status: {status}")
            
        except Exception as e:
            print(f"Error testing input {input_val}: {e}")

# Test correct code
correct_code = '''n = int(input())
count = 0
while n > 0:
    if (n & 1) == 1:
        count += 1
    n >>= 1
print(count)'''

test_code(correct_code, "Correct Code")

# Test incorrect code  
incorrect_code = '''n = int(input())
count = 0
while n > 0:
    if (n | 1) == 1:
        count += 1
    n >>= 1
print(count)'''

test_code(incorrect_code, "Incorrect Code")
