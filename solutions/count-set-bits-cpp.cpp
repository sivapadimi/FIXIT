/*
Count Set Bits - Reference Solution (C++)
Problem: Given an integer N, count the number of set bits (1s) in its binary representation.

Time Complexity: O(log N) where N is the input number
Space Complexity: O(1)
*/

#include <iostream>
#include <string>
#include <algorithm>
using namespace std;

// Method 1: Brian Kernighan's Algorithm
int countSetBitsBrianKernighan(unsigned int n) {
    int count = 0;
    while (n > 0) {
        // Remove the rightmost set bit
        n &= (n - 1);
        count++;
    }
    return count;
}

// Method 2: Bit shifting approach
int countSetBitsShift(unsigned int n) {
    int count = 0;
    while (n > 0) {
        count += (n & 1);
        n >>= 1;
    }
    return count;
}

// Method 3: Using builtin function (GCC/Clang)
int countSetBitsBuiltin(unsigned int n) {
    return __builtin_popcount(n);
}

// Method 4: Lookup table for 8-bit chunks
int countSetBitsLookup(unsigned int n) {
    // Precomputed lookup table for 0-255
    static const unsigned char lookup[256] = {
        0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4,
        1, 2, 2, 3, 2, 3, 3, 4, 2, 3, 3, 4, 3, 4, 4, 5,
        1, 2, 2, 3, 2, 3, 3, 4, 2, 3, 3, 4, 3, 4, 4, 5,
        2, 3, 3, 4, 3, 4, 4, 5, 3, 4, 4, 5, 4, 5, 5, 6,
        1, 2, 2, 3, 2, 3, 3, 4, 2, 3, 3, 4, 3, 4, 4, 5,
        2, 3, 3, 4, 3, 4, 4, 5, 3, 4, 4, 5, 4, 5, 5, 6,
        2, 3, 3, 4, 3, 4, 4, 5, 3, 4, 4, 5, 4, 5, 5, 6,
        3, 4, 4, 5, 4, 5, 5, 6, 4, 5, 5, 6, 5, 6, 6, 7,
        1, 2, 2, 3, 2, 3, 3, 4, 2, 3, 3, 4, 3, 4, 4, 5,
        2, 3, 3, 4, 3, 4, 4, 5, 3, 4, 4, 5, 4, 5, 5, 6,
        2, 3, 3, 4, 3, 4, 4, 5, 3, 4, 4, 5, 4, 5, 5, 6,
        3, 4, 4, 5, 4, 5, 5, 6, 4, 5, 5, 6, 5, 6, 6, 7,
        2, 3, 3, 4, 3, 4, 4, 5, 3, 4, 4, 5, 4, 5, 5, 6,
        3, 4, 4, 5, 4, 5, 5, 6, 4, 5, 5, 6, 5, 6, 6, 7,
        3, 4, 4, 5, 4, 5, 5, 6, 4, 5, 5, 6, 5, 6, 6, 7,
        4, 5, 5, 6, 5, 6, 6, 7, 5, 6, 6, 7, 6, 7, 7, 8
    };
    
    int count = 0;
    while (n > 0) {
        count += lookup[n & 0xff];
        n >>= 8;
    }
    return count;
}

// Method 5: String conversion approach
int countSetBitsString(unsigned int n) {
    string binary;
    while (n > 0) {
        binary += (n & 1) ? '1' : '0';
        n >>= 1;
    }
    reverse(binary.begin(), binary.end());
    return count(binary.begin(), binary.end(), '1');
}

int main() {
    unsigned int n;
    
    // Read input
    if (!(cin >> n)) {
        cerr << "Error: Invalid input format" << endl;
        return 1;
    }
    
    // Calculate result using the most efficient method
    int result = countSetBitsBrianKernighan(n);
    
    // Output result
    cout << result << endl;
    
    return 0;
}
