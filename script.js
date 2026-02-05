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

// State
let currentChapter = CONFIG.defaultChapter;
let selectedVerse = null;
let currentBook = 'yahya'; // Default book
let chapterFootnotes = []; // Store footnotes for current chapter
let currentFontSize = localStorage.getItem('readerFontSize') || 17; // Default 17px

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
function init() {
    // 1. Determine Book (Priority: Static HTML Config > URL Param > Default)
    if (window.CURRENT_BOOK_ID) {
        currentBook = window.CURRENT_BOOK_ID;
    } else {
        const urlParams = new URLSearchParams(window.location.search);
        const bookParam = urlParams.get('book');
        if (bookParam) {
            currentBook = bookParam.toLowerCase();
        }
    }

    // Map keys to display titles
    const bookTitleMap = {
        // Taurat
        'kejadian': 'Kitab Taurat: Kejadian',
        'keluaran': 'Kitab Taurat: Keluaran',
        'imamat': 'Kitab Taurat: Imamat',
        'bilangan': 'Kitab Taurat: Bilangan',
        'ulangan': 'Kitab Taurat: Ulangan',
        // Zabur
        'mazmur': 'Kitab Zabur: Mazmur',
        // Injil
        'matius': 'Injil Matius',
        'markus': 'Injil Markus',
        'lukas': 'Injil Lukas',
        'yahya': 'Injil Yahya'
    };

    const titleEl = document.querySelector('.book-toggle-btn .toggle-indonesian');
    const arTitleEl = document.querySelector('.book-toggle-btn .toggle-arabic');

    if (bookTitleMap[currentBook]) {
        if (titleEl) titleEl.textContent = bookTitleMap[currentBook];
        // For Arabic title, we could map them too but keeping it simple for now or using common ones
        const arBookMap = {
            'kejadian': 'سفر التكوين', 'keluaran': 'سفر الخروج', 'imamat': 'سفر اللاويين',
            'bilangan': 'سفر العدد', 'ulangan': 'سفر التثنية', 'mazmur': 'سفر المزامير',
            'matius': 'إنجيل متى', 'markus': 'إنجيل مرقس', 'lukas': 'إنجيل لوقا', 'yahya': 'إنجيل يوحنا'
        };
        if (arTitleEl && arBookMap[currentBook]) arTitleEl.textContent = arBookMap[currentBook];
    }

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

    // Populate chapter selector
    populateChapterSelector();

    // Load default chapter
    loadChapter(currentChapter);

    // Setup event listeners
    setupEventListeners();
}

/**
 * Populate the chapter dropdown selector
 */
function populateChapterSelector() {
    const chapters = Object.keys(window.CURRENT_BOOK_DATA).sort((a, b) => parseInt(a) - parseInt(b));

    chapterSelect.innerHTML = chapters.map(chapter =>
        `<option value="${chapter}">Pasal ${chapter}</option>`
    ).join('');

    chapterSelect.value = currentChapter;
}

/**
 * Load and render verses for a specific chapter
 */
function loadChapter(chapterNum) {
    const verses = window.CURRENT_BOOK_DATA[chapterNum];

    if (!verses || verses.length === 0) {
        showError(`Pasal ${chapterNum} tidak ditemukan.`);
        footnotesSection.style.display = 'none';
        return;
    }

    currentChapter = chapterNum;
    chapterSelect.value = chapterNum;

    // Reset footnotes
    chapterFootnotes = [];
    let footnoteCounter = 1;

    // Process verses and collect footnotes from data
    const processedVerses = verses.map(verse => {
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

    // Render verses
    versesContainer.innerHTML = processedVerses.map(verse => createVerseCard(verse, chapterNum)).join('');

    // Render footnotes
    renderFootnotes();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update navigation state
    updateNavigationButtons(chapterNum);

    // Attach click handlers to verse cards
    attachVerseClickHandlers();

    // Setup Scroll listener for progress bar
    window.addEventListener('scroll', updateProgressBar);

    // Initialize Navigator (Toggle Overlay)
    initBookNavigator();
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

    // 1. Data Structure for Categories
    const categories = [
        {
            name: 'Injil (Isa Al-Masih)',
            books: [
                { id: 'matius', id_name: 'Matius', ar_name: 'إنجيل متى', url: 'injil-matius.html' },
                { id: 'markus', id_name: 'Markus', ar_name: 'إنجيل مرقس', url: 'injil-markus.html' },
                { id: 'lukas', id_name: 'Lukas', ar_name: 'إنجيل لوقا', url: 'injil-lukas.html' },
                { id: 'yahya', id_name: 'Yahya', ar_name: 'إنجيل يوحنا', url: 'injil-yahya.html' }
            ]
        },
        {
            name: 'Kitab Taurat (Nabi Musa)',
            books: [
                { id: 'kejadian', id_name: 'Kejadian', ar_name: 'سفر التكوين', url: 'taurat-kejadian.html' },
                { id: 'keluaran', id_name: 'Keluaran', ar_name: 'سفر الخروج', url: 'taurat-keluaran.html' },
                { id: 'imamat', id_name: 'Imamat', ar_name: 'سفر اللاويين', url: 'taurat-imamat.html' },
                { id: 'bilangan', id_name: 'Bilangan', ar_name: 'سفر العدد', url: 'taurat-bilangan.html' },
                { id: 'ulangan', id_name: 'Ulangan', ar_name: 'سفر التثنية', url: 'taurat-ulangan.html' }
            ]
        },
        {
            name: 'Kitab Zabur (Nabi Daud)',
            books: [
                { id: 'mazmur', id_name: 'Mazmur', ar_name: 'سفر المزامير', url: 'zabur-mazmur.html' }
            ]
        }
    ];

    // 2. Populate HTML
    container.innerHTML = categories.map(cat => `
        <div class="category-group">
            <h3>${cat.name}</h3>
            <div class="selector-grid">
                ${cat.books.map(book => `
                    <a href="${book.url}" class="selector-item ${book.id === currentBook ? 'current' : ''}">
                        <span class="item-ar">${book.ar_name}</span>
                        <span class="item-id">${book.id_name}</span>
                    </a>
                `).join('')}
            </div>
        </div>
    `).join('');

    // 3. Event Listeners
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
            <span class="footnote-text"><em>(Ayat ${note.verse})</em> ${note.text}</span>
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

    const subheadingHtml = verse.sh ? `<div class="verse-subheading">${verse.sh}</div>` : '';

    return `
        <div class="verse-card" data-chapter="${chapterNum}" data-verse="${verse.v}">
            ${subheadingHtml}
            <div class="verse-header">
                <span class="verse-ref-id">${chapterNum}:${verse.v}</span>
                <div class="verse-actions-top">
                    <button class="action-icon-btn" onclick="copyIndividualVerse(event, '${chapterNum}', '${verse.v}')" title="Salin Ayat">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                    </button>
                    <button class="action-icon-btn" onclick="shareIndividualVerse(event, '${chapterNum}', '${verse.v}')" title="Bagikan Ayat">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                            <polyline points="16 6 12 2 8 6" />
                            <line x1="12" y1="2" x2="12" y2="15" />
                        </svg>
                    </button>
                </div>
            </div>
            <div class="verse-content">
                <p class="verse-arabic">${verse.ar}</p>
                <p class="verse-indonesian">${verse.id}${footNoteMarker}</p>
            </div>
        </div>
    `;
}

/**
 * Helper to get verse text for copying/sharing
 */
function getVersePayload(chapter, verseNum) {
    const verses = window.CURRENT_BOOK_DATA[chapter];
    const rawVerse = verses.find(v => v.v === parseInt(verseNum));
    if (!rawVerse) return null;

    const bookNameFormatted = currentBook.charAt(0).toUpperCase() + currentBook.slice(1);
    const displayBook = bookNameFormatted.replace('Yahya', 'Yahya (Yohanes)'); // Example refinement

    return {
        ref: `${bookNameFormatted} ${chapter}:${verseNum}`,
        ar: rawVerse.ar,
        id: rawVerse.id
    };
}

/**
 * Individual Verse Copy Handler
 */
async function copyIndividualVerse(event, chapter, verseNum) {
    event.stopPropagation();
    const payload = getVersePayload(chapter, verseNum);
    if (!payload) return;

    const text = `${payload.ref}\n\n${payload.ar}\n\n${payload.id}`;

    try {
        await navigator.clipboard.writeText(text);
        showToast('Ayat berhasil disalin!');
    } catch (err) {
        showToast('Gagal menyalin ayat', 'error');
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
    const url = window.location.href.split('#')[0] + `#v${selectedVerse.chapter}:${selectedVerse.verse}`;
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(fbUrl, '_blank');
}

/**
 * Share via X (Twitter)
 */
function shareViaX() {
    if (!selectedVerse) return;
    const text = `Baca ${selectedVerse.ref} di Pusat Studi Kitabullah\n\n"${selectedVerse.id}"`;
    const url = window.location.href.split('#')[0] + `#v${selectedVerse.chapter}:${selectedVerse.verse}`;
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(xUrl, '_blank');
}

/**
 * Copy Share Link
 */
async function copyShareLink() {
    if (!selectedVerse) return;
    const url = window.location.href.split('#')[0] + `#v${selectedVerse.chapter}:${selectedVerse.verse}`;

    try {
        await navigator.clipboard.writeText(url);
        showToast('Tautan berhasil disalin!');
        closeModal();
    } catch (err) {
        showToast('Gagal menyalin tautan', 'error');
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
    const verses = window.CURRENT_BOOK_DATA[chapter];
    const rawVerse = verses.find(v => v.v === parseInt(verseNum));

    if (!rawVerse) return;

    // We use the raw text for copying/sharing
    selectedVerse = {
        chapter,
        verse: verseNum,
        ar: rawVerse.ar,
        id: rawVerse.id,
        ref: `${currentBook.charAt(0).toUpperCase() + currentBook.slice(1)} ${chapter}:${verseNum}`
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

    const text = `${selectedVerse.ref}\n\n${selectedVerse.ar}\n\n${selectedVerse.id}`;

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
        showToast('Teks berhasil disalin!');
    } catch (error) {
        console.error('Copy failed:', error);
        showToast('Gagal menyalin teks', 'error');
    }
}

/**
 * Share verse via WhatsApp
 */
function shareViaWhatsApp() {
    if (!selectedVerse) return;

    const text = `*${selectedVerse.ref}*\n\n${selectedVerse.ar}\n\n${selectedVerse.id}`;
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
            const chapters = Object.keys(window.CURRENT_BOOK_DATA);
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
