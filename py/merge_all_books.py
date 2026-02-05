import csv
import os

# Configuration: List of (Source A Base Name, Source B Scraped Name, Output Name)
# Source A is expected to be in c:\work\kitab-hikmah\database_all\
# Source B is expected to be in c:\work\kitab-hikmah\
# Output will be in c:\work\kitab-hikmah\

BASE_DIR = r"c:\work\kitab-hikmah"
DB_ALL_DIR = os.path.join(BASE_DIR, "database_all")
OUTPUT_DIR = os.path.join(BASE_DIR, "database_set")

# Books Mapping
# (Original File Name in database_all, Scraped File Name, Output File Name)
BOOKS_TO_PROCESS = [
    # Injil (Gospels) - Lukas is already done
    ("Injil_Markus_Arabic_Indonesian_indayt_arbvd_chapnotes.csv", "Injil_Markus_KitabSuciMobi.csv", "Injil_Markus_indayt_arbvd_shellabear.csv"),
    ("Injil_Matius_Arabic_Indonesian_indayt_arbvd_chapnotes.csv", "Injil_Matius_KitabSuciMobi.csv", "Injil_Matius_indayt_arbvd_shellabear.csv"),
    ("Injil_Yohanes_Arabic_Indonesian_indayt_arbvd_chapnotes.csv", "Injil_Yahya_KitabSuciMobi.csv", "Injil_Yahya_indayt_arbvd_shellabear.csv"),
    
    # Taurat
    ("Taurat_Bilangan_Arabic_Indonesian_indayt_arbvd_chapnotes.csv", "Taurat_Bilangan_KitabSuciMobi.csv", "Taurat_Bilangan_indayt_arbvd_shellabear.csv"),
    ("Taurat_Imamat_Arabic_Indonesian_indayt_arbvd_chapnotes.csv", "Taurat_Imamat_KitabSuciMobi.csv", "Taurat_Imamat_indayt_arbvd_shellabear.csv"),
    ("Taurat_Kejadian_Arabic_Indonesian_indayt_arbvd_chapnotes.csv", "Taurat_Kejadian_KitabSuciMobi.csv", "Taurat_Kejadian_indayt_arbvd_shellabear.csv"),
    ("Taurat_Keluaran_Arabic_Indonesian_indayt_arbvd_chapnotes.csv", "Taurat_Keluaran_KitabSuciMobi.csv", "Taurat_Keluaran_indayt_arbvd_shellabear.csv"),
    ("Taurat_Ulangan_Arabic_Indonesian_indayt_arbvd_chapnotes.csv", "Taurat_Ulangan_KitabSuciMobi.csv", "Taurat_Ulangan_indayt_arbvd_shellabear.csv"),
    
    # Zabur
    ("Zabur_Mazmur_Arabic_Indonesian_indayt_arbvd_chapnotes.csv", "Zabur_Mazmur_KitabSuciMobi.csv", "Zabur_Mazmur_indayt_arbvd_shellabear.csv")
]

def read_csv_to_dict(path, key_cols):
    data = {}
    if not os.path.exists(path):
        print(f"Warning: Source file not found: {path}")
        return {}
        
    with open(path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                key = tuple(int(row[k]) for k in key_cols)
                data[key] = row
            except ValueError:
                continue
    return data

def process_book(source_a_name, source_b_name, output_name):
    source_a_path = os.path.join(DB_ALL_DIR, source_a_name)
    source_b_path = os.path.join(BASE_DIR, source_b_name)
    output_path = os.path.join(OUTPUT_DIR, output_name)
    
    print(f"Processing: {source_a_name} + {source_b_name} -> {output_name}")
    
    # Read Source B (KitabSuci / Shellabear)
    source_b_data = read_csv_to_dict(source_b_path, ["Chapter", "Verse"])
    
    merged_rows = []
    
    if not os.path.exists(source_a_path):
        print(f"Error: Base file not found {source_a_path}")
        return

    with open(source_a_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        
        for row_idx, row in enumerate(reader, start=1):
            try:
                chapter = int(row["Chapter"])
                verse = int(row["Verse"])
                key = (chapter, verse)
                
                # Get KitabSuci text and Subheading
                kitab_suci_text = ""
                subheading = ""
                if key in source_b_data:
                    kitab_suci_text = source_b_data[key].get("Indonesian", "")
                    subheading = source_b_data[key].get("Subheading", "")
                
                new_row = {
                    "Book": row.get("Book", ""),
                    "Chapter": row.get("Chapter", ""),
                    "Verse": row.get("Verse", ""),
                    "Ref": row.get("Ref", ""),
                    "Arabic": row.get("Arabic", ""),
                    "Indonesian": row.get("Indonesian", ""),
                    "KitabSuci": kitab_suci_text,
                    "Subheading": subheading,
                    "Notes": row.get("Notes", "")
                }
                merged_rows.append(new_row)
            except Exception as e:
                print(f"  Error at row {row_idx}: {e}")
                # We continue despite errors to save valid data
    
    # Write Output
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ["Book", "Chapter", "Verse", "Ref", "Arabic", "Indonesian", "KitabSuci", "Subheading", "Notes"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(merged_rows)
    
    print(f"  Saved {len(merged_rows)} rows to {output_name}")

def main():
    print("Starting Batch Merge...")
    for src_a, src_b, out in BOOKS_TO_PROCESS:
        process_book(src_a, src_b, out)
    print("Batch Processing Complete.")

if __name__ == "__main__":
    main()
