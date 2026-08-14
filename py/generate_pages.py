import os
import re

# Configuration
TEMPLATE_FILE = 'reader.html'
OUTPUT_DIR = '.'

BOOKS = [
    # Taurat
    {
        'id': 'kejadian',
        'filename': 'taurat-kejadian.html',
        'title_ar': 'سفر التكوين',
        'title_id': 'Kitab Taurat: Kejadian',
        'meta_desc': 'Kitab Taurat: Kejadian - Baca naskah asli dalam Bahasa Indonesia'
    },
    {
        'id': 'keluaran',
        'filename': 'taurat-keluaran.html',
        'title_ar': 'سفر الخروج',
        'title_id': 'Kitab Taurat: Keluaran',
        'meta_desc': 'Kitab Taurat: Keluaran - Baca naskah asli dalam Bahasa Indonesia'
    },
    {
        'id': 'imamat',
        'filename': 'taurat-imamat.html',
        'title_ar': 'سفر اللاويين',
        'title_id': 'Kitab Taurat: Imamat',
        'meta_desc': 'Kitab Taurat: Imamat - Baca naskah asli dalam Bahasa Indonesia'
    },
    {
        'id': 'bilangan',
        'filename': 'taurat-bilangan.html',
        'title_ar': 'سفر العدد',
        'title_id': 'Kitab Taurat: Bilangan',
        'meta_desc': 'Kitab Taurat: Bilangan - Baca naskah asli dalam Bahasa Indonesia'
    },
    {
        'id': 'ulangan',
        'filename': 'taurat-ulangan.html',
        'title_ar': 'سفر التثنية',
        'title_id': 'Kitab Taurat: Ulangan',
        'meta_desc': 'Kitab Taurat: Ulangan - Baca naskah asli dalam Bahasa Indonesia'
    },
    # Zabur
    {
        'id': 'mazmur',
        'filename': 'zabur-mazmur.html',
        'title_ar': 'سفر المزامير',
        'title_id': 'Kitab Zabur: Mazmur',
        'meta_desc': 'Kitab Zabur: Mazmur - Baca naskah asli dalam Bahasa Indonesia'
    },
    # Injil
    {
        'id': 'matius',
        'filename': 'injil-matius.html',
        'title_ar': 'إنجيل متى',
        'title_id': 'Injil Matius',
        'meta_desc': 'Injil Matius - Kabar Baik Isa Al-Masih'
    },
    {
        'id': 'markus',
        'filename': 'injil-markus.html',
        'title_ar': 'إنجيل مرقس',
        'title_id': 'Injil Markus',
        'meta_desc': 'Injil Markus - Kabar Baik Isa Al-Masih'
    },
    {
        'id': 'lukas',
        'filename': 'injil-lukas.html',
        'title_ar': 'إنجيل لوقا',
        'title_id': 'Injil Lukas',
        'meta_desc': 'Injil Lukas - Kabar Baik Isa Al-Masih'
    },
    {
        'id': 'yahya',
        'filename': 'injil-yahya.html',
        'title_ar': 'إنجيل يوحنا',
        'title_id': 'Injil Yahya',
        'meta_desc': 'Injil Yahya - Kabar Baik Isa Al-Masih'
    }
]

def generate():
    if not os.path.exists(TEMPLATE_FILE):
        print("Template file not found!")
        return

    with open(TEMPLATE_FILE, 'r', encoding='utf-8') as f:
        template = f.read()

    print(f"Generating {len(BOOKS)} pages...")

    for book in BOOKS:
        # Prepare content
        content = template
        
        # 1. Update Title Tag
        # <title>Injil Yohanes | Gospel of John</title> -> <title>... | Pusat Studi Kitabullah</title>
        content = re.sub(
            r'<title>.*?</title>',
            f"<title>{book['title_id']} | Pusat Studi Kitabullah</title>",
            content,
            count=1,
        )
        
        # 2. Update Meta Description
        content = re.sub(
            r'<meta name="description" content="[^"]*">',
            f'<meta name="description" content="{book["meta_desc"]}">',
            content,
            count=1,
        )

        # 3. Update Header Title (Toggle style)
        # Target the spans inside bookToggleBtn
        content = content.replace('<span class="toggle-arabic">إنج일 يوح나</span>', f'<span class="toggle-arabic">{book["title_ar"]}</span>')
        content = content.replace('<span class="toggle-arabic">إنجيل يوحنا</span>', f'<span class="toggle-arabic">{book["title_ar"]}</span>')
        content = content.replace('<span class="toggle-indonesian">Injil Yahya</span>', f'<span class="toggle-indonesian">{book["title_id"]}</span>')

        # 4. Inject CURRENT_BOOK_ID before script.js
        # Match the versioned reader script and keep one explicit book ID per page.
        script_injection = f'<script>window.CURRENT_BOOK_ID = "{book["id"]}";</script>\n    <script src="script.js?v=mbcl-20260814-3"></script>'
        content = re.sub(r'<script src="script\.js(?:\?[^\"]*)?"></script>', script_injection, content, count=1)

        # Write file
        out_path = os.path.join(OUTPUT_DIR, book['filename'])
        with open(out_path, 'w', encoding='utf-8') as f_out:
            f_out.write(content)
        
        print(f"  -> Generated {book['filename']}")

if __name__ == '__main__':
    generate()
