import json
import csv
import os

# Configuration
JS_FILE = 'database/kitab_full_data.js'
CSV_PATTERN = 'Injil_{book}_KitabSuciMobi.csv'
# Books to process
BOOKS = [
    ('matius', 'Matius'),
    ('markus', 'Markus'),
    ('lukas', 'Lukas'),
    ('yahya', 'Yahya'),
    ('kejadian', 'Kejadian'),
    ('keluaran', 'Keluaran'),
    ('imamat', 'Imamat'),
    ('bilangan', 'Bilangan'),
    ('ulangan', 'Ulangan'),
    ('mazmur', 'Mazmur')
]

def load_js_data(filepath):
    print(f"Loading existing JS data from {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        # Extract JSON from window.KITAB_FULL_DATA = { ... };
        json_str = content.split('window.KITAB_FULL_DATA = ')[1].strip()
        if json_str.endswith(';'):
            json_str = json_str[:-1]
        return json.loads(json_str)

def load_subheadings(book_name_file):
    # Try different prefixes
    prefixes = ['Injil', 'Taurat', 'Zabur']
    filepath = None
    for p in prefixes:
        test_path = f'{p}_{book_name_file}_KitabSuciMobi.csv'
        if os.path.exists(test_path):
            filepath = test_path
            break
            
    if not filepath:
        print(f"  Warning: Scraped file for {book_name_file} not found with any known prefix.")
        return {}
    
    subheadings = {}
    with open(filepath, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                chapter = row['Chapter']
                verse = row['Verse']
                sh = row.get('Subheading', '').strip()
                if sh:
                    subheadings[(chapter, verse)] = sh
            except:
                continue
    return subheadings

def main():
    # 1. Load existing data
    data = load_js_data(JS_FILE)
    
    # 2. Patch each book
    for book_key, file_name_part in BOOKS:
        print(f"Patching {book_key}...")
        subheading_map = load_subheadings(file_name_part)
        
        if book_key not in data:
            print(f"  Warning: Book {book_key} not in JS data.")
            continue
            
        patched_count = 0
        for chap_num, verses in data[book_key].items():
            for v in verses:
                key = (str(chap_num), str(v['v']))
                if key in subheading_map:
                    v['sh'] = subheading_map[key]
                    patched_count += 1
                else:
                    v['sh'] = "" # Clear if not found
        
        print(f"  -> Patched {patched_count} subheadings.")

    # 3. Write back
    js_content = f"// Auto-generated Kitab Data (Taurat, Zabur, Injil) - PATCHED with Subheadings\n"
    js_content += "window.KITAB_FULL_DATA = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n"
    
    with open(JS_FILE, 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print(f"\nSuccess! Patched data written to {JS_FILE}")

if __name__ == "__main__":
    main()
