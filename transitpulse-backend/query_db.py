import psycopg2
from psycopg2 import sql

def check_vehicles():
    try:
        # Connect to the database
        conn = psycopg2.connect(
            dbname="transitpulse_db",
            user="user",
            password="transitpulse_pass",
            host="localhost",
            port="5432"
        )
        
        # Create a cursor
        cur = conn.cursor()
        
        # Count total vehicles
        cur.execute("SELECT COUNT(*) FROM live_vehicle_positions")
        count = cur.fetchone()[0]
        print(f"Total vehicles in database: {count}")
        
        # Get some sample data
        if count > 0:
            cur.execute("""
                SELECT vehicle_id, route_id, latitude, longitude, timestamp 
                FROM live_vehicle_positions 
                ORDER BY timestamp DESC 
                LIMIT 5
            """)
            
            print("\nLatest vehicle positions:")
            for row in cur.fetchall():
                print(f"- {row[0]} on route {row[1]} at {row[2]}, {row[3]} (updated at {row[4]})")
        
        # Close the cursor and connection
        cur.close()
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    check_vehicles()
