import sqlite3

# Connect to database
conn = sqlite3.connect('fixit_database.db')
cursor = conn.cursor()

try:
    # Get total number of teams
    cursor.execute('SELECT COUNT(*) FROM login_details')
    total_teams = cursor.fetchone()[0]
    print(f"📊 Total number of teams: {total_teams}")
    
    # Get all team details
    cursor.execute('SELECT * FROM login_details ORDER BY created_at DESC')
    teams = cursor.fetchall()
    
    print(f"\n🔧 Database name: fixit_database.db")
    print(f"📋 Table name: login_details")
    print(f"📝 Table structure:")
    print("   - id (INTEGER PRIMARY KEY)")
    print("   - team_name (TEXT UNIQUE NOT NULL)")
    print("   - team_code (TEXT NOT NULL)")
    print("   - created_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")
    
    print(f"\n👥 Team Details ({len(teams)} teams):")
    print("=" * 60)
    
    for i, team in enumerate(teams, 1):
        team_id = team[0]
        team_name = team[1]
        team_code = team[2]
        created_at = team[3]
        
        print(f"  Team #{i}:")
        print(f"    🏷️  Name: {team_name}")
        print(f"    🔑 Code: {team_code}")
        print(f"    📅 Created: {created_at}")
        print()
    
    print("=" * 60)
    print(f"🎯 Summary: {total_teams} teams registered in {len(teams)} rows")
    
except Exception as e:
    print(f"❌ Error accessing database: {e}")
    
finally:
    conn.close()
