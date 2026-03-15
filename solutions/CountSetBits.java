/*
Count Set Bits - Reference Solution (Java)
Problem: Given an integer N, count the number of set bits (1s) in its binary representation.

Time Complexity: O(log N) where N is the input number
Space Complexity: O(1)
*/

import java.util.Scanner;
import java.util.*;

public class CountSetBits {
    
    // Method 1: Brian Kernighan's Algorithm
    public static int countSetBitsBrianKernighan(int n) {
        int count = 0;
        while (n > 0) {
            // Remove the rightmost set bit
            n &= (n - 1);
            count++;
        }
        return count;
    }
    
    // Method 2: Bit shifting approach
    public static int countSetBitsShift(int n) {
        int count = 0;
        while (n > 0) {
            count += (n & 1);
            n >>= 1;
        }
        return count;
    }
    
    // Method 3: Using Java's builtin method
    public static int countSetBitsBuiltin(int n) {
        return Integer.bitCount(n);
    }
    
    // Method 4: Lookup table for 8-bit chunks
    public static int countSetBitsLookup(int n) {
        // Precomputed lookup table for 0-255
        int[] lookup = new int[256];
        for (int i = 0; i < 256; i++) {
            lookup[i] = (i & 1) + lookup[i / 2];
        }
        
        int count = 0;
        while (n > 0) {
            count += lookup[n & 0xff];
            n >>= 8;
        }
        return count;
    }
    
    // Method 5: String conversion approach
    public static int countSetBitsString(int n) {
        String binary = Integer.toBinaryString(n);
        int count = 0;
        for (char c : binary.toCharArray()) {
            if (c == '1') {
                count++;
            }
        }
        return count;
    }
    
    // Method 6: Recursive approach
    public static int countSetBitsRecursive(int n) {
        if (n == 0) {
            return 0;
        }
        return (n & 1) + countSetBitsRecursive(n >> 1);
    }
    
    // Method 7: Divide and conquer
    public static int countSetBitsDivideAndConquer(int n) {
        // 32-bit number: process in chunks
        n = n - ((n >> 1) & 0x55555555);
        n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
        n = (n + (n >> 4)) & 0x0F0F0F0F;
        n = n + (n >> 8);
        n = n + (n >> 16);
        return n & 0x3F;
    }
    
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        
        try {
            // Read input
            int n = scanner.nextInt();
            
            // Validate input
            if (n < 0) {
                System.err.println("Error: Input must be non-negative");
                return;
            }
            
            // Calculate result using the most efficient method
            int result = countSetBitsBrianKernighan(n);
            
            // Output result
            System.out.println(result);
            
        } catch (InputMismatchException e) {
            System.err.println("Error: Invalid input format");
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
        } finally {
            scanner.close();
        }
    }
}
