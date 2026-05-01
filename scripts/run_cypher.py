"""run_cypher.py — execute a .cypher file against the local Neo4j database.

Splits on `;` (ignoring those inside line comments) and runs each statement.

Usage:
    python scripts/run_cypher.py cypher/00_setup.cypher
    python scripts/run_cypher.py cypher/25_seed_abox.cypher
"""
from __future__ import annotations
import os, sys, re, pathlib
from dotenv import load_dotenv
from neo4j import GraphDatabase

load_dotenv()
URI  = os.getenv("NEO4J_URI", "neo4j://127.0.0.1:7687")
USER = os.getenv("NEO4J_USER", "neo4j")
PWD  = os.getenv("NEO4J_PASSWORD", "12345678")
DB   = os.getenv("NEO4J_DATABASE", "neo4j")


def split_statements(text: str) -> list[str]:
    # strip line comments (// ...) but DO NOT eat scheme-style "://" inside URLs.
    # A real comment starts at a // that is NOT immediately preceded by ':'.
    cleaned_lines = []
    for line in text.splitlines():
        # remove trailing // comment using negative lookbehind for ':'
        cleaned_lines.append(re.sub(r"(?<!:)//.*$", "", line))
    cleaned = "\n".join(cleaned_lines)
    parts = [s.strip() for s in cleaned.split(";")]
    return [p for p in parts if p]


def main(path: str) -> None:
    sql_path = pathlib.Path(path)
    if not sql_path.exists():
        sys.exit(f"File not found: {sql_path}")
    statements = split_statements(sql_path.read_text(encoding="utf-8"))
    print(f"Running {len(statements)} statements from {sql_path.name} ...")
    with GraphDatabase.driver(URI, auth=(USER, PWD)) as drv:
        with drv.session(database=DB) as ses:
            for i, stmt in enumerate(statements, 1):
                head = stmt.splitlines()[0][:80]
                try:
                    summary = ses.run(stmt).consume()
                    c = summary.counters
                    print(f"  [{i:02d}] OK  | {head} "
                          f"| nodes+{c.nodes_created}/-{c.nodes_deleted} "
                          f"rels+{c.relationships_created}/-{c.relationships_deleted}")
                except Exception as exc:  # noqa: BLE001
                    print(f"  [{i:02d}] ERR | {head}\n        -> {exc}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: python scripts/run_cypher.py <path-to-.cypher>")
    main(sys.argv[1])
