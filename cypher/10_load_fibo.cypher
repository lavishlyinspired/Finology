// =====================================================================
// 10_load_fibo.cypher  —  Import FIBO Production ontologies via n10s
// =====================================================================
// Strategy:
//   We fetch RDF/XML files from the EDM Council's public FIBO CDN.
//   We start with FND (Foundations), BE (Business Entities) and FBC.
//   Each call returns counts; expect tens of thousands of triples.
//
// If your Neo4j cannot reach the internet, you have two options:
//   (a) Set dbms.security.allowlist for fibo.edmcouncil.org, OR
//   (b) Download the .rdf files locally and use file:/// URIs after
//       enabling apoc.import.file.enabled=true and copying into the
//       Neo4j import directory.
// =====================================================================

// --- 10.1  FND — Foundations (currencies, dates, relations, agreements)
CALL n10s.onto.import.fetch(
  'https://spec.edmcouncil.org/fibo/ontology/master/latest/FND/MetadataFND.rdf',
  'RDF/XML'
);

// --- 10.2  BE — Business Entities (LegalEntity, Corporation, ownership)
CALL n10s.onto.import.fetch(
  'https://spec.edmcouncil.org/fibo/ontology/master/latest/BE/MetadataBE.rdf',
  'RDF/XML'
);

// --- 10.3  FBC — Financial Business & Commerce (banks, products, markets)
CALL n10s.onto.import.fetch(
  'https://spec.edmcouncil.org/fibo/ontology/master/latest/FBC/MetadataFBC.rdf',
  'RDF/XML'
);

// --- 10.4  ALTERNATIVE: load core BE ontologies directly --------------
// (Use these if the Metadata files don't transitively pull enough.
//  Run any subset you need.)
CALL n10s.onto.import.fetch(
  'https://spec.edmcouncil.org/fibo/ontology/master/latest/BE/LegalEntities/LegalPersons.rdf',
  'RDF/XML'
);
CALL n10s.onto.import.fetch(
  'https://spec.edmcouncil.org/fibo/ontology/master/latest/BE/LegalEntities/LEIEntities.rdf',
  'RDF/XML'
);
CALL n10s.onto.import.fetch(
  'https://spec.edmcouncil.org/fibo/ontology/master/latest/BE/Corporations/Corporations.rdf',
  'RDF/XML'
);
CALL n10s.onto.import.fetch(
  'https://spec.edmcouncil.org/fibo/ontology/master/latest/BE/OwnershipAndControl/Ownership.rdf',
  'RDF/XML'
);
CALL n10s.onto.import.fetch(
  'https://spec.edmcouncil.org/fibo/ontology/master/latest/BE/OwnershipAndControl/Control.rdf',
  'RDF/XML'
);
CALL n10s.onto.import.fetch(
  'https://spec.edmcouncil.org/fibo/ontology/master/latest/FND/AgreementsAndContracts/Agreements.rdf',
  'RDF/XML'
);
CALL n10s.onto.import.fetch(
  'https://spec.edmcouncil.org/fibo/ontology/master/latest/FND/Parties/Parties.rdf',
  'RDF/XML'
);
CALL n10s.onto.import.fetch(
  'https://spec.edmcouncil.org/fibo/ontology/master/latest/FBC/FunctionalEntities/FinancialServicesEntities.rdf',
  'RDF/XML'
);

// --- 10.5  Quick sanity check -----------------------------------------
MATCH (n) RETURN count(n) AS total_nodes;
MATCH (c:Class) RETURN count(c) AS classes;
MATCH ()-[r]->() RETURN type(r) AS rel, count(*) AS n ORDER BY n DESC LIMIT 15;
