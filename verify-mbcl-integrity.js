const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

const root = __dirname;
const mbclDir = path.join(root, 'database', 'mbcl');
const context = { window: {} };
vm.createContext(context);

function runDataFile(file) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function contentHash(value) {
  return crypto
    .createHash('sha256')
    .update(stableStringify(value), 'utf8')
    .digest('hex');
}

function fail(message) {
  throw new Error(message);
}

runDataFile(path.join(mbclDir, 'manifest.js'));
runDataFile(path.join(root, 'database', 'kitab_full_data.js'));

const manifest = context.window.KITAB_MBCL_MANIFEST;
const canonical = context.window.KITAB_FULL_DATA;
if (!manifest || manifest.edition.id !== 'MBCL' || manifest.edition.youVersionId !== 95) {
  fail('MBCL manifest identity is invalid.');
}
if (manifest.edition.publisher !== 'The Bangladesh Bible Society') {
  fail('BBS publisher attribution is missing.');
}
if (!manifest.edition.copyright.singleColumn.includes('2000') ||
    !manifest.edition.copyright.doubleColumn.includes('2006')) {
  fail('BBS copyright years are incomplete.');
}

for (const book of manifest.books) {
  const resolved = path.resolve(root, book.file);
  if (!resolved.startsWith(path.resolve(mbclDir) + path.sep)) {
    fail(`Manifest points outside the MBCL directory: ${book.file}`);
  }
  runDataFile(resolved);
}

const mbcl = context.window.KITAB_MBCL_DATA;
const expectedBookIds = manifest.books.map((book) => book.id);
if (Object.keys(mbcl).length !== expectedBookIds.length) {
  fail(`Expected ${expectedBookIds.length} MBCL books; found ${Object.keys(mbcl).length}.`);
}

const sourcePayloads = {};
let totalChapters = 0;
let totalRanges = 0;
let totalCoveredVerses = 0;
for (const declared of manifest.books) {
  const payload = mbcl[declared.id];
  if (!payload || payload.edition !== 'MBCL') fail(`Missing MBCL payload: ${declared.id}`);
  if (!canonical[declared.id]) fail(`Missing canonical reader book: ${declared.id}`);
  if (payload.book.nameBn !== declared.nameBn) fail(`Bengali book name mismatch: ${declared.id}`);
  const chapterIds = Object.keys(payload.chapters);
  if (chapterIds.length !== declared.chapters) {
    fail(`${declared.id}: expected ${declared.chapters} chapters; found ${chapterIds.length}.`);
  }

  let bookRanges = 0;
  let bookCovered = 0;
  for (let chapter = 1; chapter <= declared.chapters; chapter += 1) {
    const ranges = payload.chapters[String(chapter)];
    const canonicalChapter = canonical[declared.id][String(chapter)];
    if (!Array.isArray(ranges) || !ranges.length) fail(`${declared.id} ${chapter}: empty chapter.`);
    if (!Array.isArray(canonicalChapter) || !canonicalChapter.length) {
      fail(`${declared.id} ${chapter}: canonical chapter missing.`);
    }
    let nextVerse = 1;
    for (const range of ranges) {
      if (!Number.isInteger(range.v) || !Number.isInteger(range.ve) || range.v !== nextVerse || range.ve < range.v) {
        fail(`${declared.id} ${chapter}:${range.vl}: invalid or colliding range.`);
      }
      const expectedLabel = range.v === range.ve ? String(range.v) : `${range.v}-${range.ve}`;
      if (range.vl !== expectedLabel) fail(`${declared.id} ${chapter}:${range.vl}: label mismatch.`);
      if (typeof range.bn !== 'string' || !range.bn.trim() || range.bn.includes('\uFFFD')) {
        fail(`${declared.id} ${chapter}:${range.vl}: invalid Bengali text.`);
      }
      if (range.heading && range.heading.includes('\uFFFD')) {
        fail(`${declared.id} ${chapter}:${range.vl}: invalid Bengali heading.`);
      }
      bookRanges += 1;
      bookCovered += range.ve - range.v + 1;
      nextVerse = range.ve + 1;
    }
    const canonicalLast = canonicalChapter.length;
    const expectedLast = declared.id === 'yahya' && chapter === 7 ? 52 : canonicalLast;
    if (ranges[ranges.length - 1].ve !== expectedLast) {
      fail(`${declared.id} ${chapter}: expected final MBCL verse ${expectedLast}.`);
    }
  }

  const hashInput = { nameBn: payload.book.nameBn, chapters: payload.chapters };
  const hash = contentHash(hashInput);
  if (hash !== payload.contentSha256 || hash !== declared.contentSha256) {
    fail(`${declared.id}: SHA-256 mismatch.`);
  }
  if (bookRanges !== declared.ranges || bookCovered !== declared.coveredVerses) {
    fail(`${declared.id}: declared range totals do not match payload.`);
  }
  sourcePayloads[declared.id] = hashInput;
  totalChapters += declared.chapters;
  totalRanges += bookRanges;
  totalCoveredVerses += bookCovered;
}

if (contentHash(sourcePayloads) !== manifest.contentSha256) fail('Overall content SHA-256 mismatch.');
const totals = {
  books: expectedBookIds.length,
  chapters: totalChapters,
  ranges: totalRanges,
  coveredVerses: totalCoveredVerses,
};
for (const [key, value] of Object.entries(totals)) {
  if (manifest.scope[key] !== value) fail(`Manifest ${key} mismatch.`);
}

const samples = [
  ['kejadian', '1', '1', 'সৃষ্টির শুরুতেই আল্লাহ্‌ আসমান ও জমীন সৃষ্টি করলেন।'],
  ['kejadian', '1', '3-5', 'আল্লাহ্‌ বললেন, “আলো হোক।” আর তাতে আলো হল। তিনি দেখলেন তা চমৎকার হয়েছে। তিনি অন্ধকার থেকে আলোকে আলাদা করে আলোর নাম দিলেন দিন আর অন্ধকারের নাম দিলেন রাত। এইভাবে সন্ধ্যাও গেল সকালও গেল, আর সেটাই ছিল প্রথম দিন।'],
  ['yahya', '3', '16', '“আল্লাহ্‌ মানুষকে এত মহব্বত করলেন যে, তাঁর একমাত্র পুুত্রকে তিনি দান করলেন, যেন যে কেউ সেই পুত্রের উপর ঈমান আনে সে বিনষ্ট না হয় কিন্তু অনন্ত জীবন পায়।'],
];
for (const [book, chapter, label, expected] of samples) {
  const found = mbcl[book].chapters[chapter].find((range) => range.vl === label);
  if (!found || found.bn !== expected) fail(`Representative sample mismatch: ${book} ${chapter}:${label}.`);
}

console.log('MBCL_INTEGRITY_GATE=PASS');
console.log(JSON.stringify(totals));
console.log(`CONTENT_SHA256=${manifest.contentSha256}`);
