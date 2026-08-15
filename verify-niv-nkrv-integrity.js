const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const root = __dirname, base = path.join(root, 'database', 'niv-nkrv'), context = { window: {} };
const stable = value => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}` : JSON.stringify(value);
const hash = value => crypto.createHash('sha256').update(stable(value), 'utf8').digest('hex');
function load(file) { vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file }); }
function fail(message) { console.error(`FAIL: ${message}`); process.exitCode = 1; }
load(path.join(base, 'manifest.js'));
const manifest = context.window.KITAB_NIV_NKRV_MANIFEST;
const canonicalContext = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(root, 'database', 'kitab_full_data.js'), 'utf8'), canonicalContext);
const canonical = canonicalContext.window.KITAB_FULL_DATA;
if (!manifest || manifest.scope.books !== 10 || manifest.scope.chapters !== 426) fail('Invalid NIV/NKRV manifest scope.');
if (manifest.authorization?.status !== 'publisher-permission-user-attested') fail('Authorization status is missing or overstated.');
if (manifest.editions.NIV.copyright !== 'The Holy Bible, New International Version® NIV® Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.® Used by Permission of Biblica, Inc.® All rights reserved worldwide.') fail('NIV official copyright notice mismatch.');
if (!manifest.editions.NIV.source.identityMarker.includes('111') || !manifest.editions.NKRV.source.id.includes('gae')) fail('Official source identity metadata is incomplete.');
const expected = ['kejadian','keluaran','imamat','bilangan','ulangan','mazmur','matius','markus','lukas','yahya'], records = { niv: {}, nkrv: {} }; let nkrvAnchors = 0;
for (const edition of ['NIV','NKRV']) {
  const key = `KITAB_${edition}_DATA`, recordKey = edition.toLowerCase(); context.window[key] = {};
  const rows = manifest.books.filter(book => book.edition === edition); if (rows.length !== 10) fail(`${edition}: expected ten payload declarations.`);
  for (const row of rows) {
    if (!expected.includes(row.id) || !row.osis || !/^[a-z]{3}$/.test(row.sourceBookCode || '')) fail(`${edition}: invalid source identity for ${row.id}.`);
    load(path.join(root, row.file)); const book = context.window[key][row.id];
    if (!book || Object.keys(book.chapters).length !== row.chapters) { fail(`${edition}: chapter coverage mismatch for ${row.id}.`); continue; }
    if (hash(book.chapters) !== row.contentSha256 || book.contentSha256 !== row.contentSha256) fail(`${edition}: content SHA mismatch for ${row.id}.`);
    records[recordKey][row.id] = book.chapters;
    for (const [chapter, verses] of Object.entries(book.chapters)) { let previous = 0; for (const verse of verses) {
      const end = verse.ve || verse.v; if (!Number.isInteger(verse.v) || !Number.isInteger(end) || verse.v <= previous || end < verse.v || !['present','omitted','bracketed'].includes(verse.status)) fail(`${edition} ${row.osis}.${chapter}: invalid verse order/status.`);
      if (verse.text.includes('\ufffd')) fail(`${edition} ${row.osis}.${chapter}.${verse.v}: replacement character leaked.`);
      if (verse.status === 'present' && !verse.text.trim()) fail(`${edition} ${row.osis}.${chapter}.${verse.v}: empty present text.`);
      if (edition === 'NKRV' && /\d+\)/.test(verse.text)) fail(`NKRV footnote marker leaked at ${row.osis}.${chapter}.${verse.v}.`); previous = end;
    }
    if (edition === 'NKRV') {
      const lastRecord = book.chapters[chapter].at(-1), last = lastRecord && (lastRecord.ve || lastRecord.v), expectedLast = canonical[row.id]?.[chapter]?.at(-1)?.v;
      if (last !== expectedLast) fail(`NKRV ${row.osis}.${chapter}: last verse ${last} != canonical ${expectedLast}.`);
      const anchors = book.chapters[chapter].flatMap(verse => Array.from({length:(verse.ve || verse.v)-verse.v+1},(_,i)=>verse.v+i)), expectedAnchors = canonical[row.id]?.[chapter]?.map(verse => verse.v);
      if (anchors.join(',') !== expectedAnchors.join(',')) fail(`NKRV ${row.osis}.${chapter}: canonical anchor coverage mismatch.`); nkrvAnchors += anchors.length;
    }
    }
    if (edition === 'NKRV') { const corpus = Object.values(book.chapters).flat().map(verse => verse.text).join('\n'); for (const forbidden of ['search_keyword', 'setCookie', '검색 결과', 'rightCont', '<script']) if (corpus.includes(forbidden)) fail(`NKRV parser-contamination marker leaked in ${row.id}: ${forbidden}.`); }
  }
}
if (hash(records) !== manifest.contentSha256) fail('Manifest content SHA mismatch.');
if (nkrvAnchors !== 12092) fail(`NKRV expected 12092 canonical anchors; found ${nkrvAnchors}.`);
function verse(edition, osis, chapter, number) { const row = manifest.books.find(book => book.edition === edition && book.osis === osis); return row && context.window[`KITAB_${edition}_DATA`][row.id].chapters[String(chapter)].find(item => item.v === number); }
for (const anchor of manifest.specialVerses.omittedAnchors) { const [osis, chapter, number] = anchor.split('.'), item = verse('NIV', osis, chapter, Number(number)); if (!item || item.status !== 'omitted' || item.text) fail(`NIV omitted fixture failed for ${anchor}.`); }
for (const [osis, chapter, number] of [['JHN',7,53], ...Array.from({length: 11}, (_, index) => ['JHN',8,index + 1]), ...Array.from({length: 12}, (_, index) => ['MRK',16,index + 9])]) { const item = verse('NIV', osis, chapter, number); if (!item || item.status !== 'bracketed') fail(`NIV bracketed fixture failed for ${osis}.${chapter}.${number}.`); }
for (const [osis, chapter, number, forbidden] of [['MAT',2,1,['1)','점성가들이']],['JHN',1,1,['1)','헬','로고스']]]) { const item = verse('NKRV', osis, chapter, number); if (!item || forbidden.some(text => item.text.includes(text))) fail(`NKRV note-exclusion fixture failed for ${osis}.${chapter}.${number}.`); }
if (!verse('NKRV', 'MAT', 1, 1)?.text.startsWith('아브라함과 다윗의 자손')) fail('NKRV inline-tag spacing fixture failed for MAT.1.1.');
if (!verse('NKRV', 'MAT', 2, 1)?.text.includes('베들레헴에서')) fail('NKRV inline-tag spacing fixture failed for MAT.2.1.');
for (const [osis, chapter, start, end] of [['DEU',6,18,19],['DEU',15,4,5],['DEU',30,9,10],['PSA',92,1,3],['PSA',105,5,6]]) { const row = manifest.books.find(book => book.edition === 'NKRV' && book.osis === osis), item = context.window.KITAB_NKRV_DATA[row.id].chapters[String(chapter)].find(verse => verse.v === start); if (!item?.text || item.ve !== end || item.vl !== `${start}-${end}` || item.mergedSourceLabel !== `${start}-${end}`) fail(`NKRV merged-range fixture failed for ${osis}.${chapter}.${start}-${end}.`); }
if (!process.exitCode) console.log(`PASS: NIV/NKRV integrity verified for ${manifest.scope.books} books and ${manifest.scope.chapters} chapters with hashes, source IDs, fixtures, and note exclusion.`);
