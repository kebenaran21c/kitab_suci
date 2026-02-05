import csv
import os
import glob

TARGET_DIR = r"c:\work\kitab-hikmah\database_set"

def is_valid_row(row):
    # Check if Chapter and Verse are valid integers
    try:
        int(row.get("Chapter", "0"))
        int(row.get("Verse", "0"))
        # Also explicitly check if "Catatan" is in Chapter or Verse just in case
        if "Catatan" in row.get("Chapter", "") or "Catatan" in row.get("Verse", ""):
            return False
        return True
    except ValueError:
        return False

def clean_file(filepath):
    print(f"Cleaning {filepath}...")
    temp_rows = []
    headers = []
    
    with open(filepath, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames
        for row in reader:
            if is_valid_row(row):
                temp_rows.append(row)
            else:
                # print(f"  Removing row: {row}") # Verbose
                pass
                
    # Overwrite the file
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(temp_rows)
    
    print(f"  Done. Kept {len(temp_rows)} rows.")

def main():
    if not os.path.exists(TARGET_DIR):
        print(f"Directory not found: {TARGET_DIR}")
        return

    csv_files = glob.glob(os.path.join(TARGET_DIR, "*.csv"))
    print(f"Found {len(csv_files)} CSV files in {TARGET_DIR}")
    
    for csv_file in csv_files:
        clean_file(csv_file)
        
    print("All files cleaned.")

if __name__ == "__main__":
    main()
