"""load_fibo_local.py — download FIBO RDF/XML and import via n10s.rdf.import.inline.

Bypasses the Neo4j JVM truststore (which on Windows often can't validate
the EDM Council CDN cert). Python uses certifi.

Usage:
    python scripts/load_fibo_local.py
"""
from __future__ import annotations
import os, sys, ssl, time
import requests
from dotenv import load_dotenv
from neo4j import GraphDatabase

# --- Trust the Windows / corporate CA store (handles MITM proxies) ---
try:
    import truststore
    truststore.inject_into_ssl()
    print("[trust] using OS trust store via truststore")
except Exception:
    pass

load_dotenv()
URI  = os.getenv("NEO4J_URI", "neo4j://127.0.0.1:7687")
USER = os.getenv("NEO4J_USER", "neo4j")
PWD  = os.getenv("NEO4J_PASSWORD", "12345678")
DB   = os.getenv("NEO4J_DATABASE", "neo4j")

FIBO_BASE = "https://spec.edmcouncil.org/fibo/ontology/master/latest"

# Curated, focused subset (FND + BE + a touch of FBC) for the LEI/counterparty story.
FILES = [
    # --- FND (Foundations) ---
    "FND/Agreements/Agreements.rdf",
    "FND/Parties/Parties.rdf",
    "FND/Relations/Relations.rdf",
    "FND/Utilities/AnnotationVocabulary.rdf",

    # --- BE (Business Entities) — the heart ---
    "BE/LegalEntities/LegalPersons.rdf",
    "BE/LegalEntities/LEIEntities.rdf",
    "BE/LegalEntities/CorporateBodies.rdf",
    "BE/Corporations/Corporations.rdf",
    "BE/OwnershipAndControl/CorporateOwnership.rdf",
    "BE/OwnershipAndControl/CorporateControl.rdf",
    "BE/OwnershipAndControl/OwnershipParties.rdf",
    "BE/FunctionalEntities/FunctionalEntities.rdf",
    "BE/Partnerships/Partnerships.rdf",
    "BE/GovernmentEntities/GovernmentEntities.rdf",

    # --- FBC (Financial Business & Commerce) — minimum for banks ---
    "FBC/FunctionalEntities/FinancialServicesEntities.rdf",
    "FBC/FunctionalEntities/RegulatoryAgencies.rdf",
]


def fetch(path: str) -> str | None:
    url = f"{FIBO_BASE}/{path}"
    try:
        r = requests.get(url, timeout=30, headers={"Accept": "application/rdf+xml"})
        r.raise_for_status()
        return r.text
    except Exception as e:  # noqa: BLE001
        print(f"  ! fetch failed: {url}  ({e})")
        return None


def main() -> None:
    drv = GraphDatabase.driver(URI, auth=(USER, PWD))
    total_loaded = 0
    total_parsed = 0
    with drv.session(database=DB) as s:
        for i, path in enumerate(FILES, 1):
            print(f"[{i:02d}/{len(FILES)}] {path}")
            payload = fetch(path)
            if not payload:
                continue
            try:
                row = s.run(
                    "CALL n10s.rdf.import.inline($payload, 'RDF/XML')",
                    payload=payload
                ).single().data()
                status = row.get("terminationStatus")
                loaded = row.get("triplesLoaded", 0)
                parsed = row.get("triplesParsed", 0)
                total_loaded += loaded
                total_parsed += parsed
                print(f"        -> {status} | loaded={loaded:>6} parsed={parsed:>6}")
                if status != "OK":
                    print(f"        -> extraInfo: {row.get('extraInfo')}")
            except Exception as e:  # noqa: BLE001
                print(f"        -> ERR: {e}")
            time.sleep(0.1)

        # Summary
        print("\n=== Summary ===")
        print(f"Total triples loaded: {total_loaded}")
        print(f"Total triples parsed: {total_parsed}")
        for q, label in [
            ("MATCH (n) RETURN count(n) AS c", "all_nodes"),
            ("MATCH (n:Resource) RETURN count(n) AS c", "resources"),
            ("MATCH (n:Class) RETURN count(n) AS c", "classes"),
            ("MATCH (n:Relationship) RETURN count(n) AS c", "object_properties"),
        ]:
            print(f"  {label:>20}: {s.run(q).single()['c']}")
    drv.close()


if __name__ == "__main__":
    main()
