"""Diagnostic: inspect what n10s.onto.import.fetch returns for one FIBO URL."""
from neo4j import GraphDatabase

URL = "https://spec.edmcouncil.org/fibo/ontology/master/latest/BE/LegalEntities/LegalPersons.rdf"

d = GraphDatabase.driver("neo4j://127.0.0.1:7687", auth=("neo4j", "12345678"))
with d.session(database="neo4j") as s:
    print("--- n10s.onto.import.fetch ---")
    r = s.run("CALL n10s.onto.import.fetch($u, 'RDF/XML')", u=URL)
    for row in r:
        print(dict(row))

    print("\n--- n10s.rdf.import.fetch (full RDF) ---")
    r = s.run("CALL n10s.rdf.import.fetch($u, 'RDF/XML')", u=URL)
    for row in r:
        print(dict(row))

    print("\n--- node count after ---")
    print(s.run("MATCH (n) RETURN count(n) AS n").single().data())
    print(s.run("MATCH (n:Resource) RETURN count(n) AS resources").single().data())
    print(s.run("CALL db.labels()").value())
d.close()
