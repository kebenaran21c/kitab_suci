const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const failures = [];

function assert(condition, message) {
    if (!condition) failures.push(message);
}

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

const toggleSource = read('lang-toggle.js');
const translationSource = toggleSource.split('document.addEventListener("DOMContentLoaded"')[0]
    + '\nglobalThis.__translations = translations;';
const sandbox = {};
vm.runInNewContext(translationSource, sandbox, { filename: 'lang-toggle.translations.js' });
const translations = sandbox.__translations;
const languages = ['id', 'en', 'ko', 'bn'];

assert(languages.every(language => translations[language]), 'One or more required landing languages are missing.');
assert((toggleSource.match(/class="lang-btn"/g) || []).length === 4, 'Language toggle must contain exactly four buttons.');
assert(toggleSource.includes('data-lang="bn">বাংলা</button>'), 'The Bengali language control is missing.');
assert(toggleSource.includes('aria-pressed'), 'Language controls must expose their selected state.');
assert(toggleSource.includes('localStorage.setItem("selectedLang", lang)'), 'Language selection is not persisted through selectedLang.');

const indexHtml = read('index.html');
const landingStyle = read('landing-style.css');
const landingKeys = Array.from(indexHtml.matchAll(/data-i18n="([^"]+)"/g), match => match[1]);
for (const language of languages) {
    const missing = landingKeys.filter(key => !translations[language][key]);
    assert(missing.length === 0, `${language} is missing landing keys: ${missing.join(', ')}`);
}

const coreBengaliKeys = [
    'hero_title_indo', 'hero_subtitle_main', 'hero_subtitle_sec', 'why_read_title', 'lib_title', 'lib_intro',
    'lib_taurat_title', 'lib_zabur_title', 'lib_injil_title', 'book_genesis', 'book_psalms',
    'book_matthew', 'book_john', 'ref_title', 'cta_text', 'cta_btn'
];
const bengaliPattern = /[\u0980-\u09ff]/;
for (const key of coreBengaliKeys) {
    assert(bengaliPattern.test(translations.bn[key] || ''), `Core Bengali landing key is not Bengali: ${key}`);
}
assert((indexHtml.match(/class="book-link"/g) || []).length === 10, 'Landing library must expose all ten reader books.');
assert(indexHtml.includes('src="lang-toggle.js?v=mbcl-20260814-3"'), 'Landing page does not load the versioned shared language control.');
assert(indexHtml.includes('content="width=device-width, initial-scale=1.0, viewport-fit=cover"'), 'Landing viewport must expose mobile safe-area insets.');
assert(indexHtml.includes('href="landing-style.css?v=1.0.7"'), 'Landing page does not load the footer-clearance stylesheet version.');
assert(landingStyle.includes('--mobile-bottom-nav-clearance: 6rem;'), 'Mobile navigation clearance token is missing.');
assert(landingStyle.includes('--mobile-footer-clearance: 9.5rem;'), 'Mobile footer clearance token is missing.');
assert(landingStyle.includes('padding-bottom: calc(var(--mobile-footer-clearance) + env(safe-area-inset-bottom, 0px));'), 'Mobile footer does not reserve fixed-control clearance.');
assert(landingStyle.includes('bottom: calc(var(--mobile-bottom-nav-clearance) + env(safe-area-inset-bottom, 0px));'), 'Mobile floating CTA does not clear the bottom navigation.');

const readerPages = {
    'taurat-kejadian.html': 'kejadian',
    'taurat-keluaran.html': 'keluaran',
    'taurat-imamat.html': 'imamat',
    'taurat-bilangan.html': 'bilangan',
    'taurat-ulangan.html': 'ulangan',
    'zabur-mazmur.html': 'mazmur',
    'injil-matius.html': 'matius',
    'injil-markus.html': 'markus',
    'injil-lukas.html': 'lukas',
    'injil-yahya.html': 'yahya'
};

for (const [page, bookId] of Object.entries(readerPages)) {
    const html = read(page);
    const positions = [
        html.indexOf('database/kitab_full_data.js'),
        html.indexOf('database/mbcl/manifest.js'),
        html.indexOf('lang-toggle.js'),
        html.indexOf(`window.CURRENT_BOOK_ID = "${bookId}"`),
        html.indexOf('script.js')
    ];
    assert(positions.every(position => position >= 0), `${page} is missing one or more required reader scripts.`);
    assert(positions.every((position, index) => index === 0 || position > positions[index - 1]), `${page} has an invalid script load order.`);
    assert(html.includes('Noto+Sans+Bengali'), `${page} does not load the Bengali font.`);
    assert(html.includes('class="reader-page"'), `${page} is not marked as a reader page.`);
    assert(html.includes('id="editionNotice"'), `${page} is missing the public edition attribution surface.`);
    assert(html.includes('script.js?v=niv-nkrv-20260815-1'), `${page} has an outdated reader script version.`);
}

const readerTemplate = read('reader.html');
assert(readerTemplate.includes('database/mbcl/manifest.js'), 'Reader template is missing the MBCL manifest.');
assert(readerTemplate.includes('database/niv-nkrv/manifest.js'), 'Reader template is missing the NIV/NKRV manifest.');
assert(readerTemplate.includes('lang-toggle.js'), 'Reader template is missing the shared language control.');
assert(readerTemplate.includes('script.js?v=niv-nkrv-20260815-1'), 'Reader template has an outdated reader script version.');

const readerScript = read('script.js');
for (const marker of [
    "const SUPPORTED_LANGUAGES = ['id', 'en', 'ko', 'bn']",
    "script.src = `database/mbcl/${currentBook}.js`",
    "currentLanguage === 'bn'",
    "ensureEditionBookLoaded",
    "const editionLoadPromises = { niv: null, nkrv: null }",
    "database/niv-nkrv/${edition}/${currentBook}.js",
    "Verse omitted in NIV.",
    "verse-english",
    "verse-korean",
    "url.searchParams.set('lang', currentLanguage)",
    "url.searchParams.set('chapter', currentChapter)",
    'data-verse-end',
    "window.addEventListener('kitab:languagechange'",
    'let lastSuccessfulLanguage = null;',
    'markLanguageSuccessful();',
    'const rollbackLanguage = lastSuccessfulLanguage || \'id\';',
    'if (requestGeneration === languageRequestGeneration) rollbackLanguageChange();',
    'if (requestGeneration !== languageRequestGeneration) return;',
    'if (currentLanguage === rollbackLanguage) return;',
    'window.setKitabLanguage(rollbackLanguage)'
]) {
    assert(readerScript.includes(marker), `Reader integration marker is missing: ${marker}`);
}
assert((readerScript.match(/markLanguageSuccessful\(\);/g) || []).length === 2,
    'Last successful language must be recorded once after initialization and once after a successful language render.');
assert(/restoreDeepLink\(\);\s*markLanguageSuccessful\(\);[\s\S]*window\.addEventListener\('kitab:languagechange'/.test(readerScript),
    'Initial language success must be recorded only after reader rendering and deep-link restoration.');
assert(/if \(requestGeneration !== languageRequestGeneration\) return;[\s\S]*restoreDeepLink\(\);\s*markLanguageSuccessful\(\);/.test(readerScript),
    'Stale language requests must return before rendering or recording a successful language.');
assert(!readerScript.includes('rollbackLanguageChange(previousLanguage)'),
    'Language rollback must not use the immediately previous in-flight language.');

const ledger = JSON.parse(read('BBS_MBCL_DEPLOY_TASKS.json'));
assert(Array.isArray(ledger.tasks) && ledger.tasks.length === 12, 'Deployment ledger must contain G00-G11.');
assert(ledger.tasks.every(task => ledger.allowedStatuses.includes(task.status)), 'Deployment ledger contains an invalid status.');

if (failures.length) {
    console.error('SITE_LOCALIZATION_GATE=FAIL');
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exit(1);
}

console.log('SITE_LOCALIZATION_GATE=PASS');
console.log(JSON.stringify({
    languages: languages.length,
    landingTranslationKeys: landingKeys.length,
    readerPages: Object.keys(readerPages).length,
    books: Object.values(readerPages)
}));
