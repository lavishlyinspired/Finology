// =====================================================================
// 00_setup.cypher  —  Verify plugins, init neosemantics, set constraints
// Run sections one by one in Neo4j Browser (split by `;` already).
// =====================================================================

// --- 0.1  Verify plugins are present -----------------------------------
//        (each must return at least one row)
SHOW PROCEDURES YIELD name WHERE name STARTS WITH 'apoc.' RETURN count(*) AS apoc_procs;
SHOW PROCEDURES YIELD name WHERE name STARTS WITH 'gds.'  RETURN count(*) AS gds_procs;
SHOW PROCEDURES YIELD name WHERE name STARTS WITH 'n10s.' RETURN count(*) AS n10s_procs;

// --- 0.2  n10s requires a uniqueness constraint on Resource.uri -------
CREATE CONSTRAINT n10s_unique_uri IF NOT EXISTS
FOR (r:Resource) REQUIRE r.uri IS UNIQUE;

// --- 0.3  Initialize the n10s graph config ----------------------------
// handleVocabUris=IGNORE   -> labels are the short fragment, not full IRI
// handleMultival=ARRAY     -> multi-valued literals become arrays
// keepLangTag=false        -> drop @en tags
// applyNeo4jNaming=true    -> SHOUTY_SNAKE for relationship types
CALL n10s.graphconfig.init({
  handleVocabUris: 'IGNORE',
  handleMultival: 'ARRAY',
  keepLangTag: false,
  applyNeo4jNaming: true,
  handleRDFTypes: 'LABELS'
});

// --- 0.4  (Optional) Inspect current config ---------------------------
CALL n10s.graphconfig.show();

// --- 0.5  Constraints for our seeded instance graph -------------------
CREATE CONSTRAINT entity_lei_unique IF NOT EXISTS
FOR (e:LegalEntity) REQUIRE e.lei IS UNIQUE;

CREATE INDEX entity_name IF NOT EXISTS
FOR (e:LegalEntity) ON (e.name);
