# Count Set Bits - Debugging Challenge (Python)
# Problem: Given an integer N, count the number of set bits (1s) in its binary representation.

# BUGS TO FIX:
# 1. Wrong bitwise operator (using | instead of &)
# 2. Wrong increment method (using count = count + 1 instead of count += 1)
# 3. Potential off-by-one error in loop condition

def count_set_bits(n):
    count = 0
    
    # BUG 1: Using OR (|) instead of AND (&) operator
    # BUG 2: Using count = count + 1 instead of count += 1
    while n > 0:
        if (n | 1) == 1:  # Should be (n & 1) == 1
            count = count + 1  # Should be count += 1
        n = n >> 1
    
    return count

# Read input from judge system
n = int(input().strip())

# Calculate and print result
result = count_set_bits(n)
print(result)
