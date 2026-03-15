// Count Set Bits - Debugging Challenge (Java)
// Problem: Given an integer N, count the number of set bits (1s) in its binary representation.

// BUGS TO FIX:
// 1. Wrong bitwise operator (using | instead of &)
// 2. Wrong increment method (using count = count + 1 instead of count += 1)
// 3. Potential loop condition issue

import java.util.Scanner;

public class starter_java {
    public static int countSetBits(int n) {
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
    
    public static void main(String[] args) {
        // Read input from judge system
        Scanner scanner = new Scanner(System.in);
        int n = scanner.nextInt();
        scanner.close();
        
        // Calculate and print result
        int result = countSetBits(n);
        System.out.println(result);
    }
}
