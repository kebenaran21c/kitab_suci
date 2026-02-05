import csv
import json
import os
import re

# Configuration
DATABASE_DIR = 'database_set'
OUTPUT_FILE = 'database/kitab_full_data.js'

# Map keys to filenames in database_set (merged Shellabear files)
BOOK_MAPPING = {
    # Taurat
    'kejadian': 'Taurat_Kejadian_indayt_arbvd_shellabear.csv',
    'keluaran': 'Taurat_Keluaran_indayt_arbvd_shellabear.csv',
    'imamat': 'Taurat_Imamat_indayt_arbvd_shellabear.csv',
    'bilangan': 'Taurat_Bilangan_indayt_arbvd_shellabear.csv',
    'ulangan': 'Taurat_Ulangan_indayt_arbvd_shellabear.csv',
    
    # Zabur
    'mazmur': 'Zabur_Mazmur_indayt_arbvd_shellabear.csv',
    
    # Injil
    'matius': 'Injil_Matius_indayt_arbvd_shellabear.csv',
    'markus': 'Injil_Markus_indayt_arbvd_shellabear.csv',
    'lukas': 'Injil_Lukas_indayt_arbvd_shellabear.csv',
    'yahya': 'Injil_Yahya_indayt_arbvd_shellabear.csv'
}

def parse_csv_file(filepath):
    """Parse a single CSV file with the new structure."""
    chapters = {}
    
    if not os.path.exists(filepath):
        print(f"Warning: File not found {filepath}")
        return {}

    try:
        with open(filepath, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            raw_rows = list(reader)
            
            # Group by chapter
            chap_data = {}
            for row in raw_rows:
                c = row['Chapter']
                if c not in chap_data: chap_data[c] = []
                chap_data[c].append(row)
            
            for chap_num, rows in chap_data.items():
                processed_verses = []
                verse_notes_map = {}
                
                # 1. First pass: Find 'Catatan' row/note logic (if any remains)
                # Since we cleaned the files, this might be redundant but safe to keep
                for row in rows:
                    if row.get('Verse') == 'Catatan' or 'Catatan' in str(row.get('Chapter', '')):
                         continue # Cleaned files shouldn't have this, but just in case
                
                # 2. Process verses
                for row in rows:
                    v_num = row['Verse']
                    
                    # Skip non-numeric verses (header/notes)
                    if not v_num.isdigit():
                        continue
                        
                    entry = {
                        'v': int(v_num),
                        'ar': row.get('Arabic', ''),
                        # USE KITABSUCI (Shellabear) for Indonesian Display
                        'id': row.get('KitabSuci') if row.get('KitabSuci') else row.get('Indonesian', ''),
                        'ref': row.get('Ref', '').replace('Yohanes', 'Yahya'),
                        'book_name': row.get('Book', '').replace('Yohanes', 'Yahya'),
                        'sh': row.get('Subheading', '')
                    }

                    # Attach notes if any (Currently assuming notes handled differently or removed)
                    # If the cleaned CSV removed note rows, we don't have footnotes unless 
                    # we want to parse the 'Notes' column on the verse row itself?
                    # The previous logic parsed a separate 'Catatan' row. 
                    # If that row is gone, we rely on per-verse 'Notes' column if it exists.
                    if row.get('Notes'):
                         entry['note'] = row.get('Notes')
                        
                    processed_verses.append(entry)
                
                # Sort by verse number
                processed_verses.sort(key=lambda x: x['v'])
                chapters[int(chap_num)] = processed_verses
            
        return chapters
        
    except Exception as e:
        print(f"Error parsing {filepath}: {e}")
        import traceback
        traceback.print_exc()
        return {}

def main():
    full_data = {}
    
    print("Converting Database_All CSV data to JavaScript...")
    
    for book_key, filename in BOOK_MAPPING.items():
        filepath = os.path.join(DATABASE_DIR, filename)
        print(f"Processing {book_key} from {filename}...")
        
        book_data = parse_csv_file(filepath)
        full_data[book_key] = book_data
        
        verse_count = sum(len(v) for v in book_data.values())
        print(f"  -> Loaded {len(book_data)} chapters, {verse_count} verses.")

    # Generate JS content
    js_content = f"// Auto-generated Kitab Data (Taurat, Zabur, Injil)\n"
    js_content += f"// Generated on {os.path.basename(__file__)}\n\n"
    js_content += "window.KITAB_FULL_DATA = " + json.dumps(full_data, ensure_ascii=False, indent=2) + ";\n"
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(js_content)
        
    print(f"\nSuccess! Data written to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
