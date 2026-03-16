import sqlite3
from datetime import datetime

# Connect to database
conn = sqlite3.connect('fixit_database.db')
cursor = conn.cursor()

try:
    print("🔍 COMPREHENSIVE TEAM DATABASE ANALYSIS")
    print("=" * 60)
    
    # Check if database file exists and is accessible
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='login_details'")
    table_exists = cursor.fetchone()
    
    if table_exists:
        print("✅ Table 'login_details' exists")
        
        # Get total count
        cursor.execute('SELECT COUNT(*) FROM login_details')
        total_count = cursor.fetchone()[0]
        print(f"📊 Total teams in database: {total_count}")
        
        # Get all teams with details
        cursor.execute('''
            SELECT id, team_name, team_code, created_at,
                   COUNT(*) OVER () as row_number
            FROM login_details 
            ORDER BY created_at DESC
        ''')
        all_teams = cursor.fetchall()
        
        print(f"\n📋 All Teams in Database ({len(all_teams)} rows):")
        print("-" * 60)
        
        for i, team in enumerate(all_teams, 1):
            team_id = team[0]
            team_name = team[1]
            team_code = team[2]
            created_at = team[3]
            row_num = team[4]  # Row number from window function
            
            print(f"Row {row_num}: Team #{i}")
            print(f"  🏷️  Name: {team_name}")
            print(f"  🔑 Code: {team_code}")
            print(f"  📅 Created: {created_at}")
            print(f"  🆔 ID: {team_id}")
            print()
        
        # Check for any potential issues
        if total_count != len(all_teams):
            print(f"⚠️  WARNING: Count mismatch! COUNT={total_count}, Actual={len(all_teams)}")
        
        # Check for duplicate team names
        cursor.execute('''
            SELECT team_name, COUNT(*) as count 
            FROM login_details 
            GROUP BY team_name 
            HAVING COUNT(*) > 1
        ''')
        duplicates = cursor.fetchall()
        
        if duplicates:
            print("\n⚠️  DUPLICATE TEAM NAMES FOUND:")
            for dup in duplicates:
                print(f"  🏷️  '{dup[0]}' appears {dup[1]} times")
        
        # Check for duplicate team codes
        cursor.execute('''
            SELECT team_code, COUNT(*) as count 
            FROM login_details 
            GROUP BY team_code 
            HAVING COUNT(*) > 1
        ''')
        duplicate_codes = cursor.fetchall()
        
        if duplicate_codes:
            print("\n⚠️  DUPLICATE TEAM CODES FOUND:")
            for dup in duplicate_codes:
                print(f"  🔑 '{dup[0]}' appears {dup[1]} times")
        
        # Most recent team
        cursor.execute('SELECT * FROM login_details ORDER BY created_at DESC LIMIT 1')
        most_recent = cursor.fetchone()
        
        if most_recent:
            print(f"\n🆕 Most Recent Team Added:")
            print(f"  🏷️  Name: {most_recent[1]}")
            print(f"  🔑 Code: {most_recent[2]}")
            print(f"  📅 Added: {most_recent[3]}")
        
        print("\n" + "=" * 60)
        print("🎯 DATABASE STATUS SUMMARY:")
        print(f"  📊 Total Teams: {total_count}")
        print(f"  📋 Table: login_details")
        print(f"  🗄️  Database: fixit_database.db")
        print(f"  ✅ Status: Accessible and readable")
        
        if total_count < 26:
            print(f"\n❌ ISSUE: You mentioned adding 26 teams, but only {total_count} found in database!")
            print("💡 Possible causes:")
            print("  1. Teams were added but not saved due to database error")
            print("  2. Admin panel showed success but database transaction failed")
            print("  3. Different database file being accessed")
            print("  4. Server restart cleared recent additions")
            print("  5. Database file permissions issue")
        
    else:
        print("❌ ERROR: Table 'login_details' does not exist!")
    
except Exception as e:
    print(f"❌ Database error: {e}")
    
finally:
    conn.close()

print("\n💡 RECOMMENDATION:")
print("If you added 26 teams but only see 6, check:")
print("  1. Admin panel success messages")
print("  2. Server logs for database errors")
print("  3. Database file permissions")
print("  4. Whether server was restarted after adding teams")
