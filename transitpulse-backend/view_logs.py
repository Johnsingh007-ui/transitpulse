import os

def view_logs():
    log_file = 'gtfs_rt_processor.log'
    if os.path.exists(log_file):
        try:
            with open(log_file, 'r', encoding='utf-8') as f:
                print(f"=== Contents of {log_file} ===")
                print(f.read())
                print("=" * 50)
        except Exception as e:
            print(f"Error reading log file: {e}")
    else:
        print(f"Log file {log_file} does not exist")

if __name__ == "__main__":
    view_logs()
