// Count Set Bits - Debugging Challenge (C++)
// Problem: Given an integer N, count the number of set bits (1s) in its binary representation.

// BUGS TO FIX:
// 1. Wrong bitwise operator (using | instead of &)
// 2. Wrong increment method (using count = count + 1 instead of count += 1)
// 3. Potential loop condition issue

#include <iostream>
using namespace std;

int countSetBits(int n) {
    int count = 0;
    
    // BUG 1: Using OR (|) instead of AND (&) operator
    // BUG 2: Using count = count + 1 instead of count += 1
    while (n > 0) {
        if ((n | 1) == 1) {  // Should be (n & 1) == 1
            count = count + 1;  // Should be count += 1
        }
        n = n >> 1;
    }
    
    return count;
}

int main() {
    // Read input from judge system
    int n;
    cin >> n;
    
    // Calculate and print result
    int result = countSetBits(n);
    cout << result << endl;
    
    return 0;
}
