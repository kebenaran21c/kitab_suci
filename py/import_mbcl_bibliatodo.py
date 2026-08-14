#!/usr/bin/env python3
"""Import the BBS Kitabul Mukkadas (MBCL) text for the site's 10 books.

The importer reads the structured Kitabul Mukkadas chapter pages published by
Bibliatodo, validates their BBS attribution and verse coverage, and emits one
small JavaScript payload per book plus a manifest. Raw HTML is kept only in a
caller-selected cache outside the public payload directory.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable


SOURCE_BASE = "https://www.bibliatodo.com/la-biblia/kitabul-mukkadas"
COPYRIGHT_HOLDER = "The Bangladesh Bible Society"
EDITION = {
    "id": "MBCL",
    "youVersionId": 95,
    "title": "Kitabul Mukkadas",
    "titleBn": "কিতাবুল মোকাদ্দস",
    "publisher": COPYRIGHT_HOLDER,
    "copyright": {
        "singleColumn": "© The Bangladesh Bible Society, 2000",
        "doubleColumn": "© The Bangladesh Bible Society, 2006",
    },
}


@dataclass(frozen=True)
class Book:
    site_id: str
    source_id: int
    slug: str
    name_bn: str
    chapters: int


BOOKS = (
    Book("kejadian", 1, "আদিপুস্তক", "আদিপুস্তক", 50),
    Book("keluaran", 2, "যাত্রাপুস্তক", "যাত্রাপুস্তক", 40),
    Book("imamat", 3, "লেবীয়~পুস্তক", "লেবীয় পুস্তক", 27),
    Book("bilangan", 4, "গণনা~পুস্তক", "গণনা পুস্তক", 36),
    Book("ulangan", 5, "দ্বিতীয়~বিবরণ", "দ্বিতীয় বিবরণ", 34),
    Book("mazmur", 19, "গীত", "গীত", 150),
    Book("matius", 40, "মথি", "মথি", 28),
    Book("markus", 41, "মার্ক", "মার্ক", 16),
    Book("lukas", 42, "লূক", "লূক", 24),
    Book("yahya", 43, "যোহন", "যোহন", 21),
)

SAMPLE_EXPECTATIONS = {
    ("kejadian", 1, "1"): "সৃষ্টির শুরুতেই আল্লাহ্‌ আসমান ও জমীন সৃষ্টি করলেন।",
    ("kejadian", 1, "3-5"): (
        "আল্লাহ্‌ বললেন, “আলো হোক।” আর তাতে আলো হল। তিনি দেখলেন তা চমৎকার "
        "হয়েছে। তিনি অন্ধকার থেকে আলোকে আলাদা করে আলোর নাম দিলেন দিন আর "
        "অন্ধকারের নাম দিলেন রাত। এইভাবে সন্ধ্যাও গেল সকালও গেল, আর সেটাই ছিল "
        "প্রথম দিন।"
    ),
    ("yahya", 3, "16"): (
        "“আল্লাহ্‌ মানুষকে এত মহব্বত করলেন যে, তাঁর একমাত্র পুুত্রকে তিনি দান "
        "করলেন, যেন যে কেউ সেই পুত্রের উপর ঈমান আনে সে বিনষ্ট না হয় কিন্তু অনন্ত "
        "জীবন পায়।"
    ),
}

# MBCL follows the BBS numbering shown independently on YouVersion version 95.
# John 7 ends at 52; the sentence commonly labelled John 7:53 is included in
# MBCL John 8:1 together with the Mount of Olives sentence. This is a source
# versification difference, not a missing fetch, and must not be invented.
SOURCE_COVERAGE_OVERRIDES = {
    ("yahya", 7): {
        "sourceLastVerse": 52,
        "canonicalLastVerse": 53,
        "note": "MBCL John 7 ends at 52; MBCL John 8:1 begins with the text commonly numbered John 7:53.",
    }
}


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(value)).strip()


class ChapterParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.in_info = False
        self.info_div_depth = 0
        self.in_heading = False
        self.heading_parts: list[str] = []
        self.pending_heading = ""
        self.current: dict | None = None
        self.in_verse_text = False
        self.in_sup = False
        self.verses: list[dict] = []

    @staticmethod
    def _attrs(attrs: list[tuple[str, str | None]]) -> dict[str, str]:
        return {key: value or "" for key, value in attrs}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = self._attrs(attrs)
        classes = set(values.get("class", "").split())
        if tag == "div" and values.get("id") == "info_capitulo":
            self.in_info = True
            self.info_div_depth = 1
            return
        if self.in_info and tag == "div":
            self.info_div_depth += 1
        if not self.in_info:
            return
        if tag == "span" and "heading" in classes and self.current is None:
            self.in_heading = True
            self.heading_parts = []
        elif tag == "p" and "bt-verse" in classes:
            self.current = {
                "sourceBook": values.get("d-b", ""),
                "sourceChapter": values.get("d-cn") or values.get("d-ck", ""),
                "sourceVerse": values.get("d-v", ""),
                "labelParts": [],
                "textParts": [],
                "heading": self.pending_heading,
            }
            self.pending_heading = ""
        elif self.current is not None and tag == "sup":
            self.in_sup = True
        elif self.current is not None and tag == "span" and "bt-verse-text" in classes:
            self.in_verse_text = True

    def handle_endtag(self, tag: str) -> None:
        if not self.in_info:
            return
        if tag == "span" and self.in_heading:
            self.pending_heading = normalize_text("".join(self.heading_parts))
            self.in_heading = False
        elif tag == "span" and self.in_verse_text:
            self.in_verse_text = False
        elif tag == "sup" and self.in_sup:
            self.in_sup = False
        elif tag == "p" and self.current is not None:
            raw_label = normalize_text("".join(self.current.pop("labelParts")))
            text = normalize_text("".join(self.current.pop("textParts")))
            label = raw_label.replace("–", "-").replace("—", "-")
            match = re.fullmatch(r"(\d+)(?:\s*-\s*(\d+))?", label)
            if not match:
                raise ValueError(f"Unrecognized verse label: {raw_label!r}")
            start = int(match.group(1))
            end = int(match.group(2) or start)
            self.current.update({"v": start, "ve": end, "vl": label, "bn": text})
            self.verses.append(self.current)
            self.current = None
        if tag == "div":
            self.info_div_depth -= 1
            if self.info_div_depth == 0:
                self.in_info = False

    def handle_data(self, data: str) -> None:
        if not self.in_info:
            return
        if self.in_heading:
            self.heading_parts.append(data)
        elif self.current is not None and self.in_sup:
            self.current["labelParts"].append(data)
        elif self.current is not None and self.in_verse_text:
            self.current["textParts"].append(data)


def canonical_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def source_url(book: Book, chapter: int) -> str:
    encoded_slug = urllib.parse.quote(book.slug, safe="~")
    return f"{SOURCE_BASE}/{encoded_slug}-{chapter}"


def fetch(url: str, cache_file: Path, delay: float, retries: int = 4) -> str:
    if cache_file.exists():
        return cache_file.read_text(encoding="utf-8")
    cache_file.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "kitab-suci-mbcl-import/1.0 (+https://github.com/kebenaran21c/kitab_suci)",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "bn,en;q=0.8",
        },
    )
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            if delay:
                time.sleep(delay)
            with urllib.request.urlopen(request, timeout=35) as response:
                charset = response.headers.get_content_charset() or "utf-8"
                body = response.read().decode(charset, errors="strict")
            temp = cache_file.with_suffix(".tmp")
            temp.write_text(body, encoding="utf-8", newline="\n")
            os.replace(temp, cache_file)
            return body
        except (OSError, UnicodeError, urllib.error.URLError) as exc:
            last_error = exc
            if attempt < retries:
                time.sleep(attempt * 1.5)
    raise RuntimeError(f"Failed to fetch {url}: {last_error}")


def parse_chapter(page: str, book: Book, chapter: int) -> list[dict]:
    if "Kitabul Mukkadas" not in page:
        raise ValueError(f"{book.site_id} {chapter}: edition title not found")
    if COPYRIGHT_HOLDER not in page or "2000" not in page or "2006" not in page:
        raise ValueError(f"{book.site_id} {chapter}: BBS attribution not found")
    parser = ChapterParser()
    parser.feed(page)
    if not parser.verses:
        raise ValueError(f"{book.site_id} {chapter}: no verses found")
    expected_next = 1
    for verse in parser.verses:
        if verse["sourceBook"] != str(book.source_id):
            raise ValueError(f"{book.site_id} {chapter}: source book mismatch")
        if verse["sourceChapter"] != str(chapter):
            raise ValueError(f"{book.site_id} {chapter}: source chapter mismatch")
        if verse["sourceVerse"] != str(verse["v"]):
            raise ValueError(f"{book.site_id} {chapter}: source verse mismatch")
        if verse["v"] != expected_next or verse["ve"] < verse["v"]:
            raise ValueError(
                f"{book.site_id} {chapter}: non-contiguous range {verse['vl']} "
                f"after verse {expected_next - 1}"
            )
        if not verse["bn"] or "\ufffd" in verse["bn"]:
            raise ValueError(f"{book.site_id} {chapter}:{verse['vl']}: invalid Bengali text")
        expected_next = verse["ve"] + 1
        verse.pop("sourceBook")
        verse.pop("sourceChapter")
        verse.pop("sourceVerse")
        if not verse["heading"]:
            verse.pop("heading")
    return parser.verses


def load_existing_coverage(repo: Path) -> dict[str, dict[int, int]]:
    path = repo / "database" / "kitab_full_data.js"
    source = path.read_text(encoding="utf-8")
    prefix = "window.KITAB_FULL_DATA = "
    if not source.startswith(prefix):
        raise ValueError(f"Unexpected data wrapper in {path}")
    payload = source[len(prefix) :].strip()
    if payload.endswith(";"):
        payload = payload[:-1]
    data = json.loads(payload)
    coverage: dict[str, dict[int, int]] = {}
    for book in BOOKS:
        if book.site_id not in data:
            raise ValueError(f"Missing canonical book {book.site_id}")
        chapters = data[book.site_id]
        if len(chapters) != book.chapters:
            raise ValueError(
                f"{book.site_id}: canonical chapter count {len(chapters)} != {book.chapters}"
            )
        coverage[book.site_id] = {}
        for chapter in range(1, book.chapters + 1):
            verses = chapters.get(str(chapter))
            if not verses:
                raise ValueError(f"{book.site_id} {chapter}: canonical chapter missing")
            expected = [verse["v"] for verse in verses]
            if expected != list(range(1, len(verses) + 1)):
                raise ValueError(f"{book.site_id} {chapter}: canonical verse numbering is not contiguous")
            coverage[book.site_id][chapter] = len(verses)
    return coverage


def select_targets(sample: bool) -> Iterable[tuple[Book, int]]:
    if sample:
        return ((BOOKS[0], 1), (BOOKS[-1], 3))
    return ((book, chapter) for book in BOOKS for chapter in range(1, book.chapters + 1))


def validate_sample(book_id: str, chapter: int, verses: list[dict]) -> None:
    by_label = {verse["vl"]: verse["bn"] for verse in verses}
    for (sample_book, sample_chapter, label), expected in SAMPLE_EXPECTATIONS.items():
        if (sample_book, sample_chapter) != (book_id, chapter):
            continue
        actual = by_label.get(label)
        if actual != expected:
            raise ValueError(
                f"Sample mismatch {book_id} {chapter}:{label}\n"
                f"expected={expected!r}\nactual={actual!r}"
            )


def write_payloads(output_dir: Path, snapshot_date: str, books_data: dict[str, dict]) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    manifest_books = []
    overall_ranges = 0
    overall_verses = 0
    for book in BOOKS:
        payload = books_data[book.site_id]
        content_hash = sha256_text(canonical_json(payload))
        ranges = sum(len(chapter) for chapter in payload["chapters"].values())
        covered = sum(
            verse["ve"] - verse["v"] + 1
            for chapter in payload["chapters"].values()
            for verse in chapter
        )
        overall_ranges += ranges
        overall_verses += covered
        public_payload = {
            "edition": EDITION["id"],
            "book": {
                "id": book.site_id,
                "nameBn": book.name_bn,
                "chapters": book.chapters,
            },
            "contentSha256": content_hash,
            "chapters": payload["chapters"],
        }
        js = (
            "window.KITAB_MBCL_DATA = window.KITAB_MBCL_DATA || {};\n"
            f"window.KITAB_MBCL_DATA[{json.dumps(book.site_id)}] = "
            f"{json.dumps(public_payload, ensure_ascii=False, separators=(',', ':'))};\n"
        )
        target = output_dir / f"{book.site_id}.js"
        temp = target.with_suffix(".tmp")
        temp.write_text(js, encoding="utf-8", newline="\n")
        os.replace(temp, target)
        manifest_books.append(
            {
                "id": book.site_id,
                "sourceBookId": book.source_id,
                "nameBn": book.name_bn,
                "chapters": book.chapters,
                "ranges": ranges,
                "coveredVerses": covered,
                "contentSha256": content_hash,
                "file": f"database/mbcl/{book.site_id}.js",
            }
        )
    overall_source = {book_id: books_data[book_id] for book_id in sorted(books_data)}
    manifest = {
        "schemaVersion": 1,
        "edition": EDITION,
        "source": {
            "surface": "Bibliatodo structured Kitabul Mukkadas chapter pages",
            "baseUrl": SOURCE_BASE,
            "retrievedOn": snapshot_date,
            "authorization": "BBS permission user-attested; raw HTML excluded from public payloads",
            "versificationNotes": [
                value["note"] for value in SOURCE_COVERAGE_OVERRIDES.values()
            ],
        },
        "scope": {
            "books": len(BOOKS),
            "chapters": sum(book.chapters for book in BOOKS),
            "ranges": overall_ranges,
            "coveredVerses": overall_verses,
        },
        "contentSha256": sha256_text(canonical_json(overall_source)),
        "books": manifest_books,
    }
    manifest_js = "window.KITAB_MBCL_MANIFEST = " + json.dumps(
        manifest, ensure_ascii=False, separators=(",", ":")
    ) + ";\n"
    target = output_dir / "manifest.js"
    temp = target.with_suffix(".tmp")
    temp.write_text(manifest_js, encoding="utf-8", newline="\n")
    os.replace(temp, target)
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--cache-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--delay", type=float, default=0.2)
    parser.add_argument("--snapshot-date", default=date.today().isoformat())
    parser.add_argument("--sample", action="store_true")
    args = parser.parse_args()

    repo = args.repo.resolve()
    output_dir = (args.output_dir or repo / "database" / "mbcl").resolve()
    coverage = load_existing_coverage(repo)
    books_data: dict[str, dict] = {}
    completed = 0
    targets = list(select_targets(args.sample))
    for book, chapter in targets:
        cache_file = args.cache_dir.resolve() / f"{book.site_id}-{chapter:03d}.html"
        page = fetch(source_url(book, chapter), cache_file, args.delay)
        verses = parse_chapter(page, book, chapter)
        canonical_last = coverage[book.site_id][chapter]
        override = SOURCE_COVERAGE_OVERRIDES.get((book.site_id, chapter))
        expected_last = override["sourceLastVerse"] if override else canonical_last
        if override and override["canonicalLastVerse"] != canonical_last:
            raise ValueError(
                f"{book.site_id} {chapter}: canonical versification changed; "
                "review the MBCL override before importing"
            )
        if verses[-1]["ve"] != expected_last:
            raise ValueError(
                f"{book.site_id} {chapter}: MBCL covers through {verses[-1]['ve']}, "
                f"expected MBCL source coverage through {expected_last}"
            )
        validate_sample(book.site_id, chapter, verses)
        book_payload = books_data.setdefault(
            book.site_id,
            {"nameBn": book.name_bn, "chapters": {}},
        )
        book_payload["chapters"][str(chapter)] = verses
        completed += 1
        print(
            f"[{completed:03d}/{len(targets):03d}] {book.site_id} {chapter}: "
            f"{len(verses)} ranges / {expected_last} source verses",
            flush=True,
        )

    if args.sample:
        print("SAMPLE_GATE=PASS exact MBCL samples and chapter coverage verified")
        return 0
    manifest = write_payloads(output_dir, args.snapshot_date, books_data)
    print(json.dumps(manifest["scope"], ensure_ascii=False, sort_keys=True))
    print(f"CONTENT_SHA256={manifest['contentSha256']}")
    print(f"OUTPUT={output_dir}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"IMPORT_GATE=FAIL {error}", file=sys.stderr)
        raise
