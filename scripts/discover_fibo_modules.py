"""discover_fibo_modules.py — crawl FIBO Metadata files to enumerate every
ontology module URL transitively (via owl:imports), then keep only those
that resolve to RDF/XML (HTTP 200 + reasonable size).

Output: scripts/_fibo_module_list.json (used by load_fibo_local.py).
"""
from __future__ import annotations
import json, re, sys, pathlib
import truststore; truststore.inject_into_ssl()
import requests

BASE  = "https://spec.edmcouncil.org/fibo/ontology/master/latest/"
SEEDS = ["FND/MetadataFND.rdf", "BE/MetadataBE.rdf", "FBC/MetadataFBC.rdf"]
ONLY_DOMAINS = ("FND/", "BE/", "FBC/")  # keep our scope small

IMPORT_RE = re.compile(r'owl:imports\s+rdf:resource="([^"]+)"')
URI_TO_FILE = re.compile(r'^https?://[^/]+/fibo/ontology/(?:master/latest/)?(.+?)/?$')


def to_url(iri: str) -> str | None:
    m = URI_TO_FILE.match(iri)
    if not m:
        return None
    rel = m.group(1)
    if not rel.endswith('.rdf'):
        # last path component becomes the filename
        last = rel.split('/')[-1]
        rel = f"{rel}/{last}.rdf"
    if not rel.startswith(ONLY_DOMAINS):
        return None
    return BASE + rel


def fetch(url: str) -> str | None:
    try:
        r = requests.get(url, headers={"Accept": "application/rdf+xml"}, timeout=20)
        if r.status_code == 200 and len(r.text) > 200 and "<rdf:RDF" in r.text:
            return r.text
    except Exception:
        pass
    return None


def main() -> None:
    seen: dict[str, str] = {}   # url -> 'ok'
    queue: list[str] = [BASE + s for s in SEEDS]
    while queue:
        url = queue.pop(0)
        if url in seen:
            continue
        text = fetch(url)
        if not text:
            seen[url] = "FAIL"
            continue
        seen[url] = "OK"
        for iri in IMPORT_RE.findall(text):
            child = to_url(iri)
            if child and child not in seen:
                queue.append(child)
        print(f"[{len(seen):>4}] OK  {url}  (queue={len(queue)})")

    ok = [u for u, s in seen.items() if s == "OK"]
    fail = [u for u, s in seen.items() if s == "FAIL"]
    print(f"\nDiscovered: {len(ok)} OK / {len(fail)} not-found")

    out = pathlib.Path(__file__).parent / "_fibo_module_list.json"
    out.write_text(json.dumps(ok, indent=2))
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
