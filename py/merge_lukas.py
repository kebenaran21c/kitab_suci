import csv
import os

# Configuration
SOURCE_A_PATH = r"c:\work\kitab-hikmah\database_all\Injil_Lukas_Arabic_Indonesian_indayt_arbvd_chapnotes.csv"
SOURCE_B_PATH = r"c:\work\kitab-hikmah\Injil_Lukas_KitabSuciMobi.csv"
OUTPUT_PATH = "Injil_Lukas_indayt_ardvd_shellabear.csv"

def read_csv_to_dict(path, key_cols):
    data = {}
    with open(path, 'r', encoding='utf-8-sig') as f: # Use utf-8-sig to handle potential BOM
        reader = csv.DictReader(f)
        for row in reader:
            try:
                # Create a tuple key, e.g., (1, 1) for Chapter 1, Verse 1
                key = tuple(int(row[k]) for k in key_cols)
                data[key] = row
            except ValueError:
                continue # Skip bad rows
    return data

def main():
    print(f"Reading Source B: {SOURCE_B_PATH}")
    # Source B keys: Chapter, Verse
    # We want the 'Indonesian' text from Source B to represent 'KitabSuci'
    source_b_data = read_csv_to_dict(SOURCE_B_PATH, ["Chapter", "Verse"])
    
    print(f"Reading Source A: {SOURCE_A_PATH}")
    merged_rows = []
    
    with open(SOURCE_A_PATH, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        
        # Verify Source A columns match expectations roughly or handle missing ones gracefully
        # Target Columns: Book, Chapter, Verse, Ref, Arabic, Indonesian, KitabSuci, Notes
        
        for row_idx, row in enumerate(reader, start=1):
            try:
                chapter = int(row["Chapter"])
                verse = int(row["Verse"])
                key = (chapter, verse)
                
                # Get KitabSuci text from Source B
                kitab_suci_text = ""
                if key in source_b_data:
                    kitab_suci_text = source_b_data[key].get("Indonesian", "")
                
                new_row = {
                    "Book": row.get("Book", ""),
                    "Chapter": row.get("Chapter", ""),
                    "Verse": row.get("Verse", ""),
                    "Ref": row.get("Ref", ""),
                    "Arabic": row.get("Arabic", ""),
                    "Indonesian": row.get("Indonesian", ""),  # From Source A
                    "KitabSuci": kitab_suci_text,             # From Source B
                    "Notes": row.get("Notes", "")
                }
                merged_rows.append(new_row)
            except Exception as e:
                print(f"Error at row {row_idx}: {e}")
                print(f"Row content: {row}")
                # continue or break? Let's continue to see if it's just one header row issue


    print(f"Writing to {OUTPUT_PATH}")
    with open(OUTPUT_PATH, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ["Book", "Chapter", "Verse", "Ref", "Arabic", "Indonesian", "KitabSuci", "Notes"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(merged_rows)
    
    print("Done!")

if __name__ == "__main__":
    main()
