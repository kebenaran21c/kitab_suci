import requests
from bs4 import BeautifulSoup
import csv
import time
import random

# Configuration
# URL Pattern: https://kitabsuci.mobi/kitabsuci/{BOOK_ABBR}/{CHAPTER}/
BOOKS_CONFIG = [
    # Gospels
    {"abbr": "Mat", "name": "Matius", "chapters": 28, "category": "Injil"},
    {"abbr": "Mrk", "name": "Markus", "chapters": 16, "category": "Injil"},
    {"abbr": "Luk", "name": "Lukas", "chapters": 24, "category": "Injil"},
    {"abbr": "Yoh", "name": "Yahya", "chapters": 21, "category": "Injil"},
    
    # Taurat
    {"abbr": "Kej", "name": "Kejadian", "chapters": 50, "category": "Taurat"},
    {"abbr": "Kel", "name": "Keluaran", "chapters": 40, "category": "Taurat"},
    {"abbr": "Ima", "name": "Imamat", "chapters": 27, "category": "Taurat"},
    {"abbr": "Bil", "name": "Bilangan", "chapters": 36, "category": "Taurat"},
    {"abbr": "Ula", "name": "Ulangan", "chapters": 34, "category": "Taurat"},
    
    # Zabur
    {"abbr": "Zbr", "name": "Mazmur", "chapters": 150, "category": "Zabur"} 
]

BASE_URL = "https://kitabsuci.mobi/kitabsuci"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

def fetch_page(book_abbr, chapter):
    url = f"{BASE_URL}/{book_abbr}/{chapter}/"
    try:
        print(f"Fetching {url}...")
        response = requests.get(url, headers=HEADERS, timeout=10)
        # response.raise_for_status() # kitabsuci.mobi might return 404 for missing chapters?
        if response.status_code != 200:
             print(f"  -> Error {response.status_code}")
             return None
        return response.text
    except Exception as e:
        print(f"Error: {e}")
        return None

def parse_page(html, book_name, chapter_num):
    soup = BeautifulSoup(html, 'html.parser')
    verses_data = []
    
    # Global search for subheadings and verses
    current_subheading = None
    
    # We look at all p tags as they usually contain either titles or verses
    elements = soup.find_all(['p', 'div', 'h3', 'h4'])
    
    for el in elements:
        # Avoid processing nested elements twice if they are both in the list
        # (Though Beautiful Soup find_all behaves okay here)
        
        classes = el.get('class', [])
        if not isinstance(classes, list): classes = [classes]
        
        # 1. Check for Subheading
        # Look for paragraphtitle class or similar in el or its children
        sh_el = el if 'paragraphtitle' in classes else el.find(class_='paragraphtitle')
        if sh_el:
            text = sh_el.get_text(strip=True)
            if text and text != current_subheading:
                current_subheading = text
            continue
            
        # 2. Check for Verse (reftext is the class for the number span)
        ref_span = el.find('span', class_='reftext')
        if not ref_span and 'reftext' in classes:
            ref_span = el
            
        verse_num = None
        verse_text = ""
        
        if ref_span:
            try:
                num_text = ref_span.get_text(strip=True).strip('.')
                if num_text.isdigit():
                    verse_num = int(num_text)
                    # Extract full text from parent or el
                    full_text = el.get_text(" ", strip=True)
                    num_full = ref_span.get_text(" ", strip=True)
                    # Remove number and any leading whitespace
                    verse_text = full_text.replace(num_full, "", 1).strip()
            except ValueError:
                pass
        
        # Fallback: paragraph starts with number
        if not verse_num:
            t = el.get_text(strip=True)
            import re
            match = re.match(r'^(\d+)\.?\s*(.*)', t)
            if match:
                verse_num = int(match.group(1))
                verse_text = match.group(2).strip()
        
        if verse_num and verse_text and len(verse_text) > 1:
            # Check for duplicates
            if not any(v['Verse'] == verse_num for v in verses_data):
                verses_data.append({
                    "Book": book_name,
                    "Chapter": chapter_num,
                    "Verse": verse_num,
                    "Ref": f"{book_name} {chapter_num}:{verse_num}",
                    "Indonesian": verse_text,
                    "Subheading": current_subheading if current_subheading else ""
                })
                current_subheading = None # Attached
                
    return verses_data

def main():
    for book in BOOKS_CONFIG:
        book_name = book['name']
        book_abbr = book['abbr']
        max_chapters = book['chapters']
        
        print(f"\n--- Starting Processing for {book_name} ({book_abbr}) ---")
        book_verses = []
        
        for chapter in range(1, max_chapters + 1):
            html = fetch_page(book_abbr, chapter)
            if html:
                verses = parse_page(html, book_name, chapter)
                if verses:
                    print(f"  -> {book_name} Ch {chapter}: Found {len(verses)} verses.")
                    book_verses.extend(verses)
                else:
                    print(f"  -> {book_name} Ch {chapter}: No verses found.")
            time.sleep(random.uniform(0.5, 1.0)) # Polite delay

        # Save per book (safer against crashes)
        category = book.get('category', 'Injil')
        output_filename = f"{category}_{book_name}_KitabSuciMobi.csv"
        if book_verses:
            with open(output_filename, 'w', newline='', encoding='utf-8') as f:
                # Columns matching database_all format (subset)
                fieldnames = ["Book", "Chapter", "Verse", "Ref", "Indonesian", "Subheading"]
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(book_verses)
            print(f"Saved {len(book_verses)} verses to {output_filename}")
        else:
            print(f"Warning: No data collected for {book_name}")

if __name__ == "__main__":
    main()
