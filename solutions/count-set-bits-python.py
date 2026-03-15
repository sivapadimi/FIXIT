#!/usr/bin/env python3
"""
Count Set Bits - Reference Solution (Python)
Problem: Given an integer N, count the number of set bits (1s) in its binary representation.

Time Complexity: O(log N) where N is the input number
Space Complexity: O(1)
"""

def count_set_bits_brian_kernighan(n):
    """
    Brian Kernighan's Algorithm
    Time: O(k) where k is the number of set bits
    Space: O(1)
    """
    count = 0
    while n > 0:
        # Remove the rightmost set bit
        n &= (n - 1)
        count += 1
    return count

def count_set_bits_builtin(n):
    """
    Using Python's built-in bin() function
    Time: O(log N) for conversion to binary
    Space: O(log N) for binary string
    """
    return bin(n).count('1')

def count_set_bits_shift(n):
    """
    Bit shifting approach
    Time: O(log N) where N is the input number
    Space: O(1)
    """
    count = 0
    while n > 0:
        count += n & 1
        n >>= 1
    return count

def count_set_bits_lookup(n):
    """
    Using lookup table for 8-bit chunks
    Time: O(log N / 8) = O(log N)
    Space: O(1) for the lookup table
    """
    # Precomputed lookup table for 0-255
    lookup = [0] * 256
    for i in range(256):
        lookup[i] = (i & 1) + lookup[i // 2]
    
    count = 0
    while n > 0:
        count += lookup[n & 0xff]
        n >>= 8
    return count

def main():
    """
    Main function to read input and output result
    """
    try:
        # Read input
        n = int(input().strip())
        
        # Validate input
        if n < 0:
            print("Error: Input must be non-negative")
            return
        
        # Calculate result using the most efficient method
        result = count_set_bits_brian_kernighan(n)
        
        # Output result
        print(result)
        
    except ValueError:
        print("Error: Invalid input format")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
