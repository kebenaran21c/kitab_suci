/**
 * Kitab Hikmah Web App - Main Script
 * Features: Dynamic verse rendering, chapter navigation, copy/share functionality
 * Updated: Supports Taurat, Zabur, Injil (10 books) with new footnote structure
 */

// Configuration
const CONFIG = {
    notionHomeUrl: 'https://daniel21c.notion.site/pusat-studi-kitabullah-hikmah',
    defaultChapter: '1'
};

const SUPPORTED_LANGUAGES = ['id', 'en', 'ko', 'bn'];
const READER_COPY = {
    id: {
        chapter: 'Pasal', previousChapter: 'Pasal Sebelumnya', nextChapter: 'Pasal Selanjutnya',
        chooseBook: 'Pilih Kitab', chooseChapter: 'Pilih Pasal', textSize: 'Ukuran Teks', footnotes: 'Catatan Kaki',
        copyVerse: 'Salin Ayat', shareVerse: 'Bagikan Ayat', copyLink: 'Salin Tautan', copied: 'Ayat berhasil disalin!',
        copyFailed: 'Gagal menyalin ayat', linkCopied: 'Tautan berhasil disalin!', loading: 'Memuat Kitabul Mukkadas…',
        loadFailed: 'Data Kitabul Mukkadas tidak dapat dimuat.', verse: 'Ayat', backLibrary: 'Kembali ke Perpustakaan', close: 'Tutup'
    },
    en: {
        chapter: 'Chapter', previousChapter: 'Previous Chapter', nextChapter: 'Next Chapter',
        chooseBook: 'Choose Book', chooseChapter: 'Choose Chapter', textSize: 'Text Size', footnotes: 'Footnotes',
        copyVerse: 'Copy Verse', shareVerse: 'Share Verse', copyLink: 'Copy Link', copied: 'Verse copied!',
        copyFailed: 'Could not copy verse', linkCopied: 'Link copied!', loading: 'Loading Kitabul Mukkadas…',
        loadFailed: 'Kitabul Mukkadas data could not be loaded.', verse: 'Verse', backLibrary: 'Back to Library', close: 'Close'
    },
    ko: {
        chapter: '장', previousChapter: '이전 장', nextChapter: '다음 장',
        chooseBook: '책 선택', chooseChapter: '장 선택', textSize: '글자 크기', footnotes: '각주',
        copyVerse: '구절 복사', shareVerse: '구절 공유', copyLink: '링크 복사', copied: '구절을 복사했습니다!',
        copyFailed: '구절을 복사하지 못했습니다', linkCopied: '링크를 복사했습니다!', loading: '끼따불 모카도스를 불러오는 중…',
        loadFailed: '끼따불 모카도스 데이터를 불러오지 못했습니다.', verse: '절', backLibrary: '성경 도서관으로 돌아가기', close: '닫기'
    },
    bn: {
        chapter: 'অধ্যায়', previousChapter: 'আগের অধ্যায়', nextChapter: 'পরের অধ্যায়',
        chooseBook: 'কিতাব বেছে নিন', chooseChapter: 'অধ্যায় বেছে নিন', textSize: 'লেখার আকার', footnotes: 'টীকা',
        copyVerse: 'আয়াত কপি করুন', shareVerse: 'আয়াত শেয়ার করুন', copyLink: 'লিংক কপি করুন', copied: 'আয়াত কপি হয়েছে!',
        copyFailed: 'আয়াত কপি করা যায়নি', linkCopied: 'লিংক কপি হয়েছে!', loading: 'কিতাবুল মোকাদ্দস লোড হচ্ছে…',
        loadFailed: 'কিতাবুল মোকাদ্দসের তথ্য লোড করা যায়নি।', verse: 'আয়াত', backLibrary: 'পাঠাগারে ফিরে যান', close: 'বন্ধ করুন'
    }
};

const BOOK_LABELS = {
    kejadian: { id: 'Kitab Taurat: Kejadian', en: 'Torah: Genesis', ko: '타우라트: 창세기', bn: 'তৌরাত: আদিপুস্তক', ar: 'سفر التكوين' },
    keluaran: { id: 'Kitab Taurat: Keluaran', en: 'Torah: Exodus', ko: '타우라트: 출애굽기', bn: 'তৌরাত: যাত্রাপুস্তক', ar: 'سفر الخروج' },
    imamat: { id: 'Kitab Taurat: Imamat', en: 'Torah: Leviticus', ko: '타우라트: 레위기', bn: 'তৌরাত: লেবীয় পুস্তক', ar: 'سفر اللاويين' },
    bilangan: { id: 'Kitab Taurat: Bilangan', en: 'Torah: Numbers', ko: '타우라트: 민수기', bn: 'তৌরাত: গণনা পুস্তক', ar: 'سفر العدد' },
    ulangan: { id: 'Kitab Taurat: Ulangan', en: 'Torah: Deuteronomy', ko: '타우라트: 신명기', bn: 'তৌরাত: দ্বিতীয় বিবরণ', ar: 'سفر التثنية' },
    mazmur: { id: 'Kitab Zabur: Mazmur', en: 'Psalms', ko: '자부르: 시편', bn: 'জবুর: গীত', ar: 'سفر المزامير' },
    matius: { id: 'Injil Matius', en: 'Gospel of Matthew', ko: '마태복음', bn: 'মথি', ar: 'إنجيل متى' },
    markus: { id: 'Injil Markus', en: 'Gospel of Mark', ko: '마가복음', bn: 'মার্ক', ar: 'إنجيل مرقس' },
    lukas: { id: 'Injil Lukas', en: 'Gospel of Luke', ko: '누가복음', bn: 'লূক', ar: 'إنجيل لوقا' },
    yahya: { id: 'Injil Yahya', en: 'Gospel of John', ko: '요한복음', bn: 'যোহন', ar: 'إنجيل يوحنا' }
};

// State
let currentChapter = CONFIG.defaultChapter;
let selectedVerse = null;
let currentBook = 'yahya'; // Default book
let chapterFootnotes = []; // Store footnotes for current chapter
let currentFontSize = localStorage.getItem('readerFontSize') || 17; // Default 17px
let currentLanguage = 'id';
let currentRenderedVerses = [];
let mbclLoadPromise = null;
const editionLoadPromises = { niv: null, nkrv: null };
let languageRequestGeneration = 0;
// This is intentionally unset until a reader render has completed. Indonesian
// remains the deterministic local fallback if the first remote edition fails.
let lastSuccessfulLanguage = null;

// DOM Elements
const chapterSelect = document.getElementById('chapterSelect');
const versesContainer = document.getElementById('versesContainer');
const modalOverlay = document.getElementById('modalOverlay');
const actionModal = document.getElementById('actionModal');
const modalClose = document.getElementById('modalClose');
const copyBtn = document.getElementById('copyBtn'); // Note: This might be null now if removed from HTML
const shareWhatsAppBtn = document.getElementById('shareWhatsAppBtn');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const prevChapterBtn = document.getElementById('prevChapterBtn');
const nextChapterBtn = document.getElementById('nextChapterBtn');
const footnotesSection = document.getElementById('footnotes-section');
const footnotesList = document.getElementById('footnotes-list');

/**
 * Initialize the application
 */
async function init() {
    const urlParams = new URLSearchParams(window.location.search);

    // 1. Determine Book (Priority: Static HTML Config > URL Param > Default)
    if (window.CURRENT_BOOK_ID) {
        currentBook = window.CURRENT_BOOK_ID;
    } else {
        const bookParam = urlParams.get('book');
        if (bookParam) {
            currentBook = bookParam.toLowerCase();
        }
    }

    const requestedLang = urlParams.get('lang') || localStorage.getItem('selectedLang') || 'id';
    currentLanguage = SUPPORTED_LANGUAGES.includes(requestedLang) ? requestedLang : 'id';
    localStorage.setItem('selectedLang', currentLanguage);

    const requestedChapter = urlParams.get('chapter');
    if (requestedChapter && /^\d+$/.test(requestedChapter)) currentChapter = requestedChapter;

    // Load Data from Pre-loaded JS Object
    // Changed from INJIL_FULL_DATA to KITAB_FULL_DATA
    if (!window.KITAB_FULL_DATA) {
        showError('System Error: kitab_full_data.js tidak dimuat.');
        return;
    }

    // Assign the correct book data
    window.CURRENT_BOOK_DATA = window.KITAB_FULL_DATA[currentBook] || {};

    // Validate data availability
    if (Object.keys(window.CURRENT_BOOK_DATA).length === 0) {
        showError(`Data ${currentBook} tidak ditemukan atau belum tersedia.`);
        return;
    }

    if (!window.KITAB_MBCL_MANIFEST || window.KITAB_MBCL_MANIFEST.edition.id !== 'MBCL') {
        showError('System Error: MBCL manifest tidak dimuat.');
        return;
    }

    if (currentLanguage === 'bn') {
        const loaded = await ensureMbclBookLoaded();
        if (!loaded) return;
    }
    if (currentLanguage === 'en' || currentLanguage === 'ko') {
        const loaded = await ensureEditionBookLoaded(currentLanguage === 'en' ? 'niv' : 'nkrv');
        if (!loaded) return;
    }

    updateReaderChrome();
    populateChapterSelector();
    loadChapter(currentChapter, { preserveHash: true });
    setupEventListeners();
    initBookNavigator();
    restoreDeepLink();
    markLanguageSuccessful();
}

function copyFor(key) {
    return (READER_COPY[currentLanguage] || READER_COPY.id)[key] || READER_COPY.id[key] || key;
}

function updateReaderChrome() {
    document.documentElement.lang = currentLanguage;
    const label = BOOK_LABELS[currentBook];
    const titleEl = document.querySelector('.book-toggle-btn .toggle-indonesian');
    const arTitleEl = document.querySelector('.book-toggle-btn .toggle-arabic');
    if (label && titleEl) titleEl.textContent = label[currentLanguage] || label.id;
    if (label && arTitleEl) arTitleEl.textContent = label.ar;

    document.querySelectorAll('[data-reader-i18n]').forEach(element => {
        element.textContent = copyFor(element.dataset.readerI18n);
    });
    const attributes = [
        ['#bookToggleBtn', 'aria-label', 'chooseBook'],
        ['#fontSettingsBtn', 'aria-label', 'textSize'],
        ['#chapterSelect', 'aria-label', 'chooseChapter'],
        ['#backBtn', 'aria-label', 'backLibrary'],
        ['#closeSelectorBtn', 'aria-label', 'close'],
        ['#modalClose', 'aria-label', 'close']
    ];
    attributes.forEach(([selector, attribute, key]) => {
        const element = document.querySelector(selector);
        if (element) element.setAttribute(attribute, copyFor(key));
    });

    const editionNotice = document.getElementById('editionNotice');
    const editionFooter = editionNotice?.closest('.reader-edition-footer');
    if (editionNotice && currentLanguage === 'bn') {
        const edition = window.KITAB_MBCL_MANIFEST.edition;
        if (editionFooter) editionFooter.hidden = false;
        editionNotice.hidden = false;
        editionNotice.innerHTML = `<strong>${edition.titleBn} (${edition.id})</strong><span>${edition.publisher}</span><span>${edition.copyright.singleColumn} · ${edition.copyright.doubleColumn}</span>`;
    } else if (editionNotice && (currentLanguage === 'en' || currentLanguage === 'ko')) {
        const edition = currentLanguage === 'en' ? window.KITAB_NIV_NKRV_MANIFEST?.editions?.NIV : window.KITAB_NIV_NKRV_MANIFEST?.editions?.NKRV;
        if (!edition) { showError(copyFor('loadFailed')); return; }
        if (editionFooter) editionFooter.hidden = false;
        editionNotice.hidden = false;
        editionNotice.innerHTML = `<strong>${edition.title}</strong><span>${edition.copyright}</span>`;
    } else if (editionNotice) {
        if (editionFooter) editionFooter.hidden = true;
        editionNotice.hidden = true;
        editionNotice.innerHTML = '';
    }

    const backBtn = document.querySelector('.back-btn');
    if (backBtn) backBtn.href = `index.html?lang=${currentLanguage}#library`;
    if (label) document.title = `${label[currentLanguage] || label.id} | Pusat Studi Kitabullah`;
}

function ensureMbclBookLoaded() {
    if (window.KITAB_MBCL_DATA && window.KITAB_MBCL_DATA[currentBook]) return Promise.resolve(true);
    if (mbclLoadPromise) return mbclLoadPromise;
    showError(copyFor('loading'));
    mbclLoadPromise = new Promise(resolve => {
        const script = document.createElement('script');
        script.src = `database/mbcl/${currentBook}.js`;
        script.onload = () => {
            mbclLoadPromise = null;
            const loaded = Boolean(window.KITAB_MBCL_DATA && window.KITAB_MBCL_DATA[currentBook]);
            if (!loaded) showError(copyFor('loadFailed'));
            resolve(loaded);
        };
        script.onerror = () => {
            mbclLoadPromise = null;
            showError(copyFor('loadFailed'));
            resolve(false);
        };
        document.head.appendChild(script);
    });
    return mbclLoadPromise;
}

function ensureEditionBookLoaded(edition) {
    const key = edition === 'niv' ? 'KITAB_NIV_DATA' : 'KITAB_NKRV_DATA';
    if (!window.KITAB_NIV_NKRV_MANIFEST) { showError(copyFor('loadFailed')); return Promise.resolve(false); }
    if (window[key] && window[key][currentBook]) return Promise.resolve(true);
    if (editionLoadPromises[edition]) return editionLoadPromises[edition];
    showError(copyFor('loading'));
    editionLoadPromises[edition] = new Promise(resolve => {
        const script = document.createElement('script');
        script.src = `database/niv-nkrv/${edition}/${currentBook}.js`;
        script.onload = () => { editionLoadPromises[edition] = null; const ok = Boolean(window[key] && window[key][currentBook]); if (!ok) showError(copyFor('loadFailed')); resolve(ok); };
        script.onerror = () => { editionLoadPromises[edition] = null; showError(copyFor('loadFailed')); resolve(false); };
        document.head.appendChild(script);
    });
    return editionLoadPromises[edition];
}

/**
 * Populate the chapter dropdown selector
 */
function populateChapterSelector() {
    const chapters = Object.keys(window.CURRENT_BOOK_DATA).sort((a, b) => parseInt(a) - parseInt(b));

    chapterSelect.innerHTML = chapters.map(chapter =>
        `<option value="${chapter}">${copyFor('chapter')} ${chapter}</option>`
    ).join('');

    if (!chapters.includes(String(currentChapter))) currentChapter = chapters[0];
    chapterSelect.value = currentChapter;
}

/**
 * Load and render verses for a specific chapter
 */
function loadChapter(chapterNum, { preserveHash = false } = {}) {
    const canonicalVerses = window.CURRENT_BOOK_DATA[chapterNum];

    if (!canonicalVerses || canonicalVerses.length === 0) {
        showError(`${copyFor('chapter')} ${chapterNum} tidak ditemukan.`);
        footnotesSection.style.display = 'none';
        return;
    }

    currentChapter = chapterNum;
    chapterSelect.value = chapterNum;

    // Reset footnotes
    chapterFootnotes = [];
    let footnoteCounter = 1;

    let sourceVerses = canonicalVerses;
    if (currentLanguage === 'bn') {
        const mbclBook = window.KITAB_MBCL_DATA && window.KITAB_MBCL_DATA[currentBook];
        const mbclRanges = mbclBook && mbclBook.chapters[chapterNum];
        if (!mbclRanges) {
            showError(copyFor('loadFailed'));
            return;
        }
        sourceVerses = mbclRanges.map(range => ({
            ...range,
            ar: canonicalVerses
                .filter(verse => verse.v >= range.v && verse.v <= range.ve)
                .map(verse => verse.ar)
                .join(' '),
            id: range.bn,
            sh: range.heading || '',
            isMbcl: true
        }));
    }
    if (currentLanguage === 'en' || currentLanguage === 'ko') {
        const data = currentLanguage === 'en' ? window.KITAB_NIV_DATA : window.KITAB_NKRV_DATA;
        const editionChapter = data && data[currentBook] && data[currentBook].chapters[chapterNum];
        if (!editionChapter) { showError(copyFor('loadFailed')); return; }
        sourceVerses = editionChapter.map(verse => ({
            ...verse, id: verse.status === 'omitted' && currentLanguage === 'en' ? 'Verse omitted in NIV.' : verse.text, ar: canonicalVerses.filter(item => item.v >= verse.v && item.v <= (verse.ve || verse.v)).map(item => item.ar).join(' '),
            sh: '', editionStatus: verse.status
        }));
    }

    // Process verses and collect footnotes from data
    const processedVerses = sourceVerses.map(verse => {
        let noteId = null;

        // Check if verse has a note field (pre-processed from CSV)
        if (verse.note) {
            noteId = footnoteCounter++;
            chapterFootnotes.push({
                id: noteId,
                verse: verse.v,
                text: verse.note
            });
        }

        return {
            ...verse,
            noteId: noteId
        };
    });
    currentRenderedVerses = processedVerses;

    // Render verses
    versesContainer.innerHTML = processedVerses.map(verse => createVerseCard(verse, chapterNum)).join('');

    // Render footnotes
    renderFootnotes();

    syncReaderUrl(null, { preserveHash });

    // Update navigation state
    updateNavigationButtons(chapterNum);

    // Attach click handlers to verse cards
    attachVerseClickHandlers();

}

function buildShareUrl(verseNum) {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', currentLanguage);
    url.searchParams.set('chapter', currentChapter);
    url.hash = `v${verseNum}`;
    return url.toString();
}

function syncReaderUrl(verseNum = null, { preserveHash = false } = {}) {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', currentLanguage);
    url.searchParams.set('chapter', currentChapter);
    if (verseNum !== null) {
        url.hash = `v${verseNum}`;
    } else if (!preserveHash) {
        url.hash = '';
    }
    window.history.replaceState({}, '', url);
}

function restoreDeepLink() {
    const match = window.location.hash.match(/^#v(?:(\d+):)?(\d+)$/);
    if (!match) return;

    const linkedChapter = match[1];
    const linkedVerse = parseInt(match[2], 10);
    if (linkedChapter && window.CURRENT_BOOK_DATA[linkedChapter] && linkedChapter !== currentChapter) {
        loadChapter(linkedChapter, { preserveHash: true });
    }

    const card = Array.from(document.querySelectorAll('.verse-card')).find(element => {
        const start = parseInt(element.dataset.verse, 10);
        const end = parseInt(element.dataset.verseEnd || element.dataset.verse, 10);
        return linkedVerse >= start && linkedVerse <= end;
    });
    if (!card) return;

    // Preserve the requested verse even when the MBCL source presents it as
    // part of a merged range such as 3-5.
    syncReaderUrl(linkedVerse);
    window.requestAnimationFrame(() => {
        card.classList.add('deep-linked');
        card.setAttribute('tabindex', '-1');
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.focus({ preventScroll: true });
    });
}

/**
 * Initialize Book Navigator (Toggle Overlay)
 */
function initBookNavigator() {
    const toggleBtn = document.getElementById('bookToggleBtn');
    const overlay = document.getElementById('bookSelectorOverlay');
    const closeBtn = document.getElementById('closeSelectorBtn');
    const container = document.getElementById('bookCategories');

    if (!toggleBtn || !overlay || !container) return;

    const categoryNames = {
        id: ['Injil (Isa Al-Masih)', 'Kitab Taurat (Nabi Musa)', 'Kitab Zabur (Nabi Daud)'],
        en: ['Gospel (Isa Al-Masih)', 'Torah (Prophet Musa)', 'Psalms (Prophet Daud)'],
        ko: ['인질 (이사 알마시)', '타우라트 (무사 선지자)', '자부르 (다윗 선지자)'],
        bn: ['ইঞ্জিল (ঈসা আল-মসীহ্‌)', 'তৌরাত (নবী মূসা)', 'জবুর (নবী দাউদ)']
    }[currentLanguage];
    const localizedBook = (id) => BOOK_LABELS[id][currentLanguage] || BOOK_LABELS[id].id;

    // 1. Data Structure for Categories
    const categories = [
        {
            name: categoryNames[0],
            books: [
                { id: 'matius', url: 'injil-matius.html' },
                { id: 'markus', url: 'injil-markus.html' },
                { id: 'lukas', url: 'injil-lukas.html' },
                { id: 'yahya', url: 'injil-yahya.html' }
            ]
        },
        {
            name: categoryNames[1],
            books: [
                { id: 'kejadian', url: 'taurat-kejadian.html' },
                { id: 'keluaran', url: 'taurat-keluaran.html' },
                { id: 'imamat', url: 'taurat-imamat.html' },
                { id: 'bilangan', url: 'taurat-bilangan.html' },
                { id: 'ulangan', url: 'taurat-ulangan.html' }
            ]
        },
        {
            name: categoryNames[2],
            books: [
                { id: 'mazmur', url: 'zabur-mazmur.html' }
            ]
        }
    ];

    // 2. Populate HTML
    container.innerHTML = categories.map(cat => `
        <div class="category-group">
            <h3>${cat.name}</h3>
            <div class="selector-grid">
                ${cat.books.map(book => `
                    <a href="${book.url}?lang=${currentLanguage}&chapter=1" class="selector-item ${book.id === currentBook ? 'current' : ''}">
                        <span class="item-ar">${BOOK_LABELS[book.id].ar}</span>
                        <span class="item-id">${localizedBook(book.id)}</span>
                    </a>
                `).join('')}
            </div>
        </div>
    `).join('');

    // 3. Event Listeners (bind once; language changes only rebuild the list)
    if (toggleBtn.dataset.navigatorReady === 'true') return;
    toggleBtn.dataset.navigatorReady = 'true';
    toggleBtn.addEventListener('click', () => {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    closeBtn.addEventListener('click', () => {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    });

    // Close on background click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

/**
 * Update the reading progress bar
 */
function updateProgressBar() {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    const bar = document.getElementById('readingProgress');
    if (bar) bar.style.width = scrolled + "%";
}

/**
 * Render footnotes section
 */
function renderFootnotes() {
    if (chapterFootnotes.length === 0) {
        footnotesSection.style.display = 'none';
        return;
    }

    footnotesList.innerHTML = chapterFootnotes.map(note => `
        <div class="footnote-item" id="footnote-${note.id}">
            <span class="footnote-ref">[${note.id}]</span>
            <span class="footnote-text"><em>(${copyFor('verse')} ${note.verse})</em> ${note.text}</span>
        </div>
    `).join('');

    footnotesSection.style.display = 'block';
}

/**
 * Update navigation buttons state
 */
function updateNavigationButtons(chapterNum) {
    const chapters = Object.keys(window.CURRENT_BOOK_DATA).map(Number).sort((a, b) => a - b);
    const current = parseInt(chapterNum);

    const minChapter = chapters[0];
    const maxChapter = chapters[chapters.length - 1];

    if (prevChapterBtn) {
        prevChapterBtn.disabled = current <= minChapter;
        prevChapterBtn.onclick = () => {
            if (current > minChapter) loadChapter(String(current - 1));
        };
    }

    if (nextChapterBtn) {
        nextChapterBtn.disabled = current >= maxChapter;
        nextChapterBtn.onclick = () => {
            if (current < maxChapter) loadChapter(String(current + 1));
        };
    }
}

/**
 * Create HTML for a verse card (Quran.com Style)
 */
function createVerseCard(verse, chapterNum) {
    const footNoteMarker = verse.noteId ?
        `<sup class="note-marker" onclick="event.stopPropagation(); window.scrollTo({top: document.getElementById('footnote-${verse.noteId}').offsetTop - 100, behavior: 'smooth'});">[${verse.noteId}]</sup>` : '';

    const subheadingHtml = verse.sh ? `<div class="verse-subheading" lang="${currentLanguage}">${verse.sh}</div>` : '';
    const verseLabel = verse.vl || (verse.ve && verse.ve !== verse.v ? `${verse.v}-${verse.ve}` : String(verse.v));
    const translationClass = ({ bn: 'verse-bengali', en: 'verse-english', ko: 'verse-korean', id: 'verse-indonesian' })[currentLanguage] || 'verse-indonesian';
    const translationLang = ({ bn: 'bn', en: 'en', ko: 'ko', id: 'id' })[currentLanguage] || 'id';

    return `
        <div class="verse-card" id="v${verse.v}" data-chapter="${chapterNum}" data-verse="${verse.v}" data-verse-end="${verse.ve || verse.v}">
            ${subheadingHtml}
            <div class="verse-header">
                <span class="verse-ref-id">${chapterNum}:${verseLabel}</span>
                <div class="verse-actions-top">
                    <button class="action-icon-btn" onclick="copyIndividualVerse(event, '${chapterNum}', '${verse.v}')" title="${copyFor('copyVerse')}" aria-label="${copyFor('copyVerse')} ${chapterNum}:${verseLabel}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                    </button>
                    <button class="action-icon-btn" onclick="shareIndividualVerse(event, '${chapterNum}', '${verse.v}')" title="${copyFor('shareVerse')}" aria-label="${copyFor('shareVerse')} ${chapterNum}:${verseLabel}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                            <polyline points="16 6 12 2 8 6" />
                            <line x1="12" y1="2" x2="12" y2="15" />
                        </svg>
                    </button>
                </div>
            </div>
            <div class="verse-content">
                <p class="verse-arabic" lang="ar" dir="rtl">${verse.ar}</p>
                <p class="${translationClass}" lang="${translationLang}" dir="ltr">${verse.id}${footNoteMarker}</p>
            </div>
        </div>
    `;
}

/**
 * Helper to get verse text for copying/sharing
 */
function getVersePayload(chapter, verseNum) {
    const rawVerse = currentRenderedVerses.find(v => v.v === parseInt(verseNum));
    if (!rawVerse) return null;

    const localizedBook = BOOK_LABELS[currentBook][currentLanguage] || BOOK_LABELS[currentBook].id;
    const verseLabel = rawVerse.vl || (rawVerse.ve && rawVerse.ve !== rawVerse.v ? `${rawVerse.v}-${rawVerse.ve}` : String(rawVerse.v));

    return {
        ref: `${localizedBook} ${chapter}:${verseLabel}`,
        ar: rawVerse.ar,
        text: rawVerse.id,
        label: verseLabel
    };
}

/**
 * Individual Verse Copy Handler
 */
async function copyIndividualVerse(event, chapter, verseNum) {
    event.stopPropagation();
    const payload = getVersePayload(chapter, verseNum);
    if (!payload) return;

    const text = `${payload.ref}\n\n${payload.ar}\n\n${payload.text}`;

    try {
        await navigator.clipboard.writeText(text);
        showToast(copyFor('copied'));
    } catch (err) {
        showToast(copyFor('copyFailed'), 'error');
    }
}

/**
 * Individual Verse Share Handler
 */
function shareIndividualVerse(event, chapter, verseNum) {
    event.stopPropagation();
    openVerseActionModal(chapter, verseNum);
}

/**
 * Share via Facebook
 */
function shareViaFacebook() {
    if (!selectedVerse) return;
    const url = buildShareUrl(selectedVerse.verse);
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(fbUrl, '_blank');
}

/**
 * Share via X (Twitter)
 */
function shareViaX() {
    if (!selectedVerse) return;
    const text = `${selectedVerse.ref}\n\n“${selectedVerse.text}”`;
    const url = buildShareUrl(selectedVerse.verse);
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(xUrl, '_blank');
}

/**
 * Copy Share Link
 */
async function copyShareLink() {
    if (!selectedVerse) return;
    const url = buildShareUrl(selectedVerse.verse);

    try {
        await navigator.clipboard.writeText(url);
        showToast(copyFor('linkCopied'));
        closeModal();
    } catch (err) {
        showToast(copyFor('copyFailed'), 'error');
    }
}

/**
 * Attach click handlers to all verse cards
 */
function attachVerseClickHandlers() {
    const verseCards = document.querySelectorAll('.verse-card');

    verseCards.forEach(card => {
        card.addEventListener('click', (e) => {
            // Prevent if clicking on footnote link
            if (e.target.tagName === 'SUP') return;

            const chapter = card.dataset.chapter;
            const verseNum = card.dataset.verse;
            openVerseActionModal(chapter, verseNum);
        });
    });
}

/**
 * Open the action modal for a specific verse
 */
function openVerseActionModal(chapter, verseNum) {
    const payload = getVersePayload(chapter, verseNum);
    if (!payload) return;

    // We use the raw text for copying/sharing
    selectedVerse = {
        chapter,
        verse: verseNum,
        ar: payload.ar,
        text: payload.text,
        ref: payload.ref
    };

    // Update modal title
    document.getElementById('modalTitle').textContent = selectedVerse.ref;

    // Show modal
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Close the action modal
 */
function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    selectedVerse = null;
}

/**
 * Copy verse text to clipboard
 */
async function copyToClipboard() {
    if (!selectedVerse) return;

    const text = `${selectedVerse.ref}\n\n${selectedVerse.ar}\n\n${selectedVerse.text}`;

    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }

        closeModal();
        showToast(copyFor('copied'));
    } catch (error) {
        console.error('Copy failed:', error);
        showToast(copyFor('copyFailed'), 'error');
    }
}

/**
 * Share verse via WhatsApp
 */
function shareViaWhatsApp() {
    if (!selectedVerse) return;

    const text = `*${selectedVerse.ref}*\n\n${selectedVerse.ar}\n\n${selectedVerse.text}\n\n${buildShareUrl(selectedVerse.verse)}`;
    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/?text=${encodedText}`;

    window.open(whatsappUrl, '_blank');
    closeModal();
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
    toastMessage.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * Show error message
 */
function showError(message) {
    versesContainer.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #999;">
            <p>${message}</p>
        </div>
    `;
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Chapter selector
    chapterSelect.addEventListener('change', (e) => {
        loadChapter(e.target.value);
    });

    // Modal controls
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    modalClose.addEventListener('click', closeModal);

    // Modal Action Buttons (Quran.com Style)
    const fbBtn = document.getElementById('shareFacebookBtn');
    const xBtn = document.getElementById('shareXBtn');
    const waBtn = document.getElementById('shareWhatsAppBtn');
    const linkBtn = document.getElementById('copyLinkBtn');
    const textCopyBtn = document.getElementById('copyTextBtn'); // In case we add it back

    if (fbBtn) fbBtn.addEventListener('click', shareViaFacebook);
    if (xBtn) xBtn.addEventListener('click', shareViaX);
    if (waBtn) waBtn.addEventListener('click', shareViaWhatsApp);
    if (linkBtn) linkBtn.addEventListener('click', copyShareLink);
    if (copyBtn) copyBtn.addEventListener('click', copyToClipboard); // Fallback for old shell

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // ESC to close modal
        if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
            closeModal();
        }

        // Arrow keys for chapter navigation
        if (!modalOverlay.classList.contains('active')) {
            const chapters = Object.keys(window.CURRENT_BOOK_DATA).sort((a, b) => parseInt(a) - parseInt(b));
            const currentIndex = chapters.indexOf(currentChapter);

            if (e.key === 'ArrowLeft' && currentIndex > 0) {
                loadChapter(chapters[currentIndex - 1]);
            } else if (e.key === 'ArrowRight' && currentIndex < chapters.length - 1) {
                loadChapter(chapters[currentIndex + 1]);
            }
        }
    });

    // Back button
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            // URL navigation handled by HTML anchor tag
        });
    }

    // Font Settings
    setupFontSettings();
    window.addEventListener('scroll', updateProgressBar, { passive: true });
}

/**
 * Setup Font Settings Panel logic
 */
function setupFontSettings() {
    const settingsBtn = document.getElementById('fontSettingsBtn');
    const settingsPanel = document.getElementById('fontSettingsPanel');
    const fontSizeSlider = document.getElementById('fontSizeSlider');

    // Initialize state
    updateFontSize(currentFontSize);
    if (fontSizeSlider) fontSizeSlider.value = currentFontSize;

    // Toggle Panel
    if (settingsBtn && settingsPanel) {
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = settingsPanel.classList.toggle('active');
            settingsBtn.classList.toggle('active', isActive);
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!settingsPanel.contains(e.target) && !settingsBtn.contains(e.target)) {
                settingsPanel.classList.remove('active');
                settingsBtn.classList.remove('active');
            }
        });

        // Prevent closing when clicking or touching inside panel
        ['click', 'touchstart', 'pointerdown'].forEach(evt => {
            settingsPanel.addEventListener(evt, (e) => {
                e.stopPropagation();
            }, { passive: false });
        });
    }

    // Slider Change
    if (fontSizeSlider) {
        // Desktop standard events
        fontSizeSlider.addEventListener('input', (e) => {
            updateFontSize(e.target.value);
        });

        // Stop propagation for touchstart and pointerdown to prevent panel closing
        ['touchstart', 'pointerdown'].forEach(evt => {
            fontSizeSlider.addEventListener(evt, (e) => {
                e.stopPropagation();
            }, { passive: false });
        });

        // Robust Mobile Touch Handler
        const handleTouch = (e) => {
            // Check if it's a valid single touch
            if (e.touches.length > 1) return;

            // Prevent page scrolling while dragging slider and stop propagation
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();

            const touch = e.touches[0];
            const rect = fontSizeSlider.getBoundingClientRect();

            // Calculate percentage (0 to 1) based on touch X position relative to slider width
            // Clamped between 0 and 1
            const percent = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));

            // Get min/max from slider attributes (default fallbacks: 14-24)
            const min = parseInt(fontSizeSlider.min || 14);
            const max = parseInt(fontSizeSlider.max || 24);

            // Calculate new value
            const newValue = Math.round(min + (max - min) * percent);

            // Update if value changed
            if (fontSizeSlider.value != newValue) {
                fontSizeSlider.value = newValue;
                updateFontSize(newValue);
            }
        };

        // Attach non-passive listeners for touch
        fontSizeSlider.addEventListener('touchstart', handleTouch, { passive: false });
        fontSizeSlider.addEventListener('touchmove', handleTouch, { passive: false });
        // touchend doesn't have touches[0], but the last move set the value correctly.
    }
}

/**
 * Update Font Size CSS Variable and Persist
 */
function updateFontSize(size) {
    currentFontSize = size;
    document.documentElement.style.setProperty('--font-size-verse', `${size / 16}rem`);
    document.documentElement.style.setProperty('--font-size-verse-px', `${size}px`);
    localStorage.setItem('readerFontSize', size);
}

window.addEventListener('kitab:languagechange', async event => {
    const nextLanguage = event.detail && event.detail.lang;
    if (!SUPPORTED_LANGUAGES.includes(nextLanguage) || !window.CURRENT_BOOK_DATA) return;
    const requestGeneration = ++languageRequestGeneration;
    currentLanguage = nextLanguage;
    if (currentLanguage === 'bn') {
        const loaded = await ensureMbclBookLoaded();
        if (!loaded) { if (requestGeneration === languageRequestGeneration) rollbackLanguageChange(); return; }
    }
    if (currentLanguage === 'en' || currentLanguage === 'ko') {
        const loaded = await ensureEditionBookLoaded(currentLanguage === 'en' ? 'niv' : 'nkrv');
        if (!loaded) { if (requestGeneration === languageRequestGeneration) rollbackLanguageChange(); return; }
    }
    if (requestGeneration !== languageRequestGeneration) return;

    updateReaderChrome();
    populateChapterSelector();
    loadChapter(currentChapter, { preserveHash: true });
    initBookNavigator();
    restoreDeepLink();
    markLanguageSuccessful();
});

function markLanguageSuccessful() {
    lastSuccessfulLanguage = currentLanguage;
}

function rollbackLanguageChange() {
    const rollbackLanguage = lastSuccessfulLanguage || 'id';
    // A fallback request can itself fail only if its previously rendered corpus
    // disappeared. Do not dispatch a duplicate event and create a rollback loop.
    if (currentLanguage === rollbackLanguage) return;
    currentLanguage = rollbackLanguage;
    if (typeof window.setKitabLanguage === 'function') window.setKitabLanguage(rollbackLanguage);
    else { localStorage.setItem('selectedLang', rollbackLanguage); updateReaderChrome(); }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        init().catch(error => {
            console.error('Reader initialization failed:', error);
            showError(copyFor('loadFailed'));
        });
    });
} else {
    init().catch(error => {
        console.error('Reader initialization failed:', error);
        showError(copyFor('loadFailed'));
    });
}
