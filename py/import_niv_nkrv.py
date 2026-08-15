#!/usr/bin/env python3
"""Reproducibly collect the approved NIV 2011 and KBS GAE/NKRV reader corpus.

Raw responses stay in --cache-dir (outside the public payload directory).  The
public output is ten lazy-load files for each edition plus one manifest.  A
chapter is never emitted unless its official identity marker and body gate pass.
"""
from __future__ import annotations
import argparse, hashlib, html, json, os, re, time, urllib.request
from datetime import date
from html.parser import HTMLParser
from pathlib import Path

BOOKS = (
 ("kejadian","GEN","gen",50),("keluaran","EXO","exo",40),("imamat","LEV","lev",27),
 ("bilangan","NUM","num",36),("ulangan","DEU","deu",34),("mazmur","PSA","psa",150),
 ("matius","MAT","mat",28),("markus","MRK","mrk",16),("lukas","LUK","luk",24),("yahya","JHN","jhn",21))
NIV_COPYRIGHT = "The Holy Bible, New International Version® NIV® Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.® Used by Permission of Biblica, Inc.® All rights reserved worldwide."
NKRV_COPYRIGHT = "성경전서 개역개정판 © 대한성서공회 1998. New Korean Revised Version © Korean Bible Society 1998."
BRACKETED = {("JHN",7,53)} | {("JHN",8,v) for v in range(1,12)} | {("MRK",16,v) for v in range(9,21)}
OMITTED_SEEDS = {("MAT",17,21),("MAT",18,11),("MAT",23,14),("MRK",7,16),("MRK",9,44),("MRK",9,46),("MRK",11,26),("MRK",15,28),("LUK",17,36),("LUK",23,17),("JHN",5,4)}

def norm(s): return re.sub(r"\s+", " ", html.unescape(s)).strip()
def strip_tags(s): return norm(re.sub(r"<[^>]+>", "", re.sub(r"<br\s*/?>", " ", s, flags=re.I)))
def sha(v): return hashlib.sha256(json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()).hexdigest()
def get(url, cache, delay):
    if cache.exists(): return cache.read_text(encoding="utf-8")
    cache.parent.mkdir(parents=True,exist_ok=True)
    last=None
    for n in range(5):
      try:
       if delay: time.sleep(delay)
       r=urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; kitab-suci-reader/1.0)","Accept-Language":"en,ko;q=0.9"}),timeout=45)
       body=r.read().decode(r.headers.get_content_charset() or "utf-8")
       cache.write_text(body,encoding="utf-8",newline="\n"); return body
      except Exception as e: last=e; time.sleep(n+1)
    raise RuntimeError(f"fetch failed {url}: {last}")
class NIVParser(HTMLParser):
 def __init__(self, osis, chap):
  super().__init__(convert_charrefs=True); self.prefix=f"{osis}.{chap}."; self.stack=[]; self.current=None; self.verse_depth=None; self.content_depth=0; self.note_depth=0; self.parts={}; self.anchors=set()
 def handle_starttag(self, tag, attrs):
  a=dict(attrs); classes=a.get("class",""); self.stack.append((tag,classes))
  usfm=a.get("data-usfm","")
  if tag=="span" and usfm.startswith(self.prefix) and usfm[len(self.prefix):].isdigit():
   self.current=int(usfm[len(self.prefix):]); self.anchors.add(self.current); self.verse_depth=len(self.stack); self.content_depth=0; self.note_depth=0
  if self.current is not None:
   if "__note" in classes: self.note_depth += 1
   if "__content" in classes: self.content_depth += 1
 def handle_endtag(self, tag):
  if self.current is not None:
   _,classes=self.stack[-1] if self.stack else (tag,"")
   if "__content" in classes: self.content_depth -= 1
   if "__note" in classes: self.note_depth -= 1
   if len(self.stack)==self.verse_depth: self.current=None; self.verse_depth=None
  if self.stack: self.stack.pop()
 def handle_data(self, data):
  if self.current is not None and self.content_depth and not self.note_depth: self.parts.setdefault(self.current,[]).append(data)

def niv_parse(page, osis, chap):
    if 'data-vid="111"' not in page or "Biblica" not in page: raise ValueError("NIV identity gate failed")
    parser=NIVParser(osis,chap); parser.feed(page)
    if not parser.anchors or 1 not in parser.anchors: raise ValueError("NIV body gate failed")
    rows=[]
    for v in sorted(parser.anchors):
      text=norm(" ".join(parser.parts.get(v,[])))
      status="omitted" if not text else ("bracketed" if (osis,chap,v) in BRACKETED else "present")
      rows.append({"v":v,"text":text,"status":status})
    seed={(o,c,v) for o,c,v in OMITTED_SEEDS if o==osis and c==chap}
    actual={(osis,chap,row["v"]) for row in rows if row["status"]=="omitted"}
    if not seed.issubset(actual): raise ValueError(f"NIV omitted-anchor gate failed: expected {seed}, got {actual}")
    return rows
def gae_body(page):
    """Return only tdBible1's div subtree; KBS does not consistently emit tdBible2."""
    marker=re.search(r'<div\b[^>]*\bid\s*=\s*[\'\"]tdBible1[\'\"][^>]*>', page, re.I)
    if not marker: raise ValueError("GAE reader container missing")
    depth=0
    for tag in re.finditer(r'</?div\b[^>]*>', page[marker.start():], re.I):
      depth += -1 if tag.group(0).startswith('</') else 1
      if depth == 0: return page[marker.start():marker.start()+tag.end()]
    raise ValueError("GAE reader container is not closed")
def gae_parse(page, osis, chap):
    if "개역개정" not in page or 'id="tdBible1"' not in page: raise ValueError("GAE identity gate failed")
    body=gae_body(page)
    body=re.sub(r'<font\b[^>]*\bclass\s*=\s*(?:[\'\"])?smallTitle(?:[\'\"])?[^>]*>.*?</font\s*>', '', body, flags=re.S | re.I)
    body=re.sub(r'<div\b[^>]*\bclass\s*=\s*(?:[\'\"])?D2(?:[\'\"])?[^>]*>.*?</div\s*>', '', body, flags=re.S | re.I)
    body=re.sub(r'<a\b[^>]*\bclass\s*=\s*(?:[\'\"])?comment(?:[\'\"])?[^>]*>.*?</a\s*>', '', body, flags=re.S | re.I)
    rows=re.findall(r'<span[^>]*>\s*<span class="number">\s*(\d+)(?:\s*-\s*(\d+))?.*?</span>(.*?)</span>\s*(?=<br\s*/?>|</div\s*>)',body,re.S)
    data=[]
    for start,end,raw in rows:
      v=int(start); ve=int(end or start); text=strip_tags(raw)
      if text:
        data.append({"v":v,"ve":ve,"vl":f"{v}-{ve}" if ve != v else str(v),"text":text,"status":"omitted" if text == "(없음)" else ("bracketed" if any((osis,chap,anchor) in BRACKETED for anchor in range(v,ve+1)) else "present"),"mergedSourceLabel":f"{v}-{ve}" if ve != v else None})
    for verse in data:
      if verse["mergedSourceLabel"] is None: verse.pop("mergedSourceLabel")
    if not data or data[0]["v"] != 1: raise ValueError("GAE body gate failed")
    return data
def canonical_last_verses(repo):
    source=(repo/'database'/'kitab_full_data.js').read_text(encoding='utf-8')
    data=json.loads(source.split(' = ',1)[1].rstrip(';\n'))
    return {book: {int(chapter): len(verses) for chapter,verses in chapters.items()} for book,chapters in data.items()}
def write(repo, out, records):
    manifests=[]
    for edition in ("niv","nkrv"):
      ed={}
      for bid,osis,legacy,count in BOOKS:
       chapters=records[edition][bid]; payload={"edition":edition.upper(),"book":{"id":bid,"osis":osis,"sourceBookCode":legacy,"chapters":count},"chapters":chapters}
       payload["contentSha256"]=sha(payload["chapters"])
       target=out/edition/f"{bid}.js"; target.parent.mkdir(parents=True,exist_ok=True)
       target.write_text(f"window.KITAB_{edition.upper()}_DATA = window.KITAB_{edition.upper()}_DATA || {{}};\nwindow.KITAB_{edition.upper()}_DATA[{json.dumps(bid)}] = {json.dumps(payload,ensure_ascii=False,separators=(',',':'))};\n",encoding="utf-8",newline="\n")
       manifests.append({"edition":edition.upper(),"id":bid,"osis":osis,"sourceBookCode":legacy,"chapters":count,"file":f"database/niv-nkrv/{edition}/{bid}.js","contentSha256":payload["contentSha256"]})
    manifest={"schemaVersion":1,"authorization":{"status":"publisher-permission-user-attested","attestedOn":"2026-08-15","scope":"crawl-and-use for this 10-book web reader"},"editions":{"NIV":{"title":"New International Version (NIV) 2011","copyright":NIV_COPYRIGHT,"source":{"id":"youversion-111","urlTemplate":"https://www.bible.com/bible/111/{OSIS}.{chapter}.NIV","identityMarker":"data-vid=111"}},"NKRV":{"title":"성경전서 개역개정판","copyright":NKRV_COPYRIGHT,"source":{"id":"kbs-gae","urlTemplate":"https://www.bskorea.or.kr/bible/korbibReadpage.php?version=GAE&book={legacyBook}&chap={chapter}&sec=1","identityMarker":"개역개정"},"crossCheck":{"id":"kbs-nkrv","urlTemplate":"https://bible.bskorea.or.kr/bible/NKRV/{OSIS}.{chapter}","notice":NKRV_COPYRIGHT}}},"scope":{"books":10,"chapters":426},"specialVerses":{"omittedAnchors":["MAT.17.21","MAT.18.11","MAT.23.14","MRK.7.16","MRK.9.44","MRK.9.46","MRK.11.26","MRK.15.28","LUK.17.36","LUK.23.17","JHN.5.4"],"bracketedRanges":["JHN.7.53-JHN.8.11","MRK.16.9-MRK.16.20"]},"books":manifests}
    manifest["contentSha256"]=sha(records)
    (out/"manifest.js").write_text("window.KITAB_NIV_NKRV_MANIFEST = "+json.dumps(manifest,ensure_ascii=False,separators=(",",":"))+";\n",encoding="utf-8",newline="\n")
    return manifest
def main():
 p=argparse.ArgumentParser(); p.add_argument("--repo",type=Path,default=Path(__file__).resolve().parents[1]); p.add_argument("--cache-dir",type=Path,required=True); p.add_argument("--output-dir",type=Path); p.add_argument("--delay",type=float,default=.2); p.add_argument("--sample",action="store_true"); a=p.parse_args(); out=a.output_dir or a.repo/"database"/"niv-nkrv"; records={"niv":{},"nkrv":{}}; canonical=canonical_last_verses(a.repo)
 targets=[(b,1) for b in BOOKS] if a.sample else [(b,c) for b in BOOKS for c in range(1,b[3]+1)]
 for (bid,osis,legacy,_),chap in targets:
  niv=get(f"https://www.bible.com/bible/111/{osis}.{chap}.NIV",a.cache_dir/f"niv-{osis}-{chap}.html",a.delay); gae=get(f"https://www.bskorea.or.kr/bible/korbibReadpage.php?version=GAE&book={legacy}&chap={chap}&sec=1",a.cache_dir/f"gae-{legacy}-{chap}.html",a.delay)
  niv_rows=niv_parse(niv,osis,chap); nkrv_rows=gae_parse(gae,osis,chap)
  expected=list(range(1, canonical[bid][chap] + 1)); anchors=[anchor for row in nkrv_rows for anchor in range(row['v'], row.get('ve',row['v']) + 1)]
  if anchors != expected or (nkrv_rows[-1].get('ve', nkrv_rows[-1]['v']) != canonical[bid][chap]): raise ValueError(f"GAE anchor gate failed for {osis}.{chap}")
  records["niv"].setdefault(bid,{})[str(chap)]=niv_rows; records["nkrv"].setdefault(bid,{})[str(chap)]=nkrv_rows; print(f"{bid} {chap}: PASS")
 if a.sample: print("SAMPLE_GATE=PASS"); return
 print("CONTENT_SHA256="+write(a.repo,out,records)["contentSha256"])
if __name__ == "__main__": main()
