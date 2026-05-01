// =====================================================================
// 20_explore_tbox.cypher  —  Explore the FIBO schema (T-Box)
// =====================================================================

// --- 20.1  Top-level FIBO classes (no parents) ------------------------
MATCH (c:Class)
WHERE NOT (c)-[:SCO]->(:Class)
RETURN c.uri AS uri, c.label AS label
ORDER BY uri LIMIT 50;

// --- 20.2  Find the LegalEntity class & its full subclass tree --------
MATCH (le:Class)
WHERE le.uri ENDS WITH 'LegalEntity'
RETURN le;

// All descendants of LegalEntity (the "is-a" closure)
MATCH path = (sub:Class)-[:SCO*1..6]->(le:Class)
WHERE le.uri ENDS WITH 'LegalEntity'
RETURN sub.label AS subclass, length(path) AS depth
ORDER BY depth, subclass LIMIT 50;

// --- 20.3  Object properties whose domain involves LegalEntity --------
MATCH (rel:Relationship)-[:DOMAIN]->(le:Class)
WHERE le.uri ENDS WITH 'LegalEntity'
RETURN rel.label AS property, rel.uri AS uri LIMIT 50;

// --- 20.4  Ownership / Control properties -----------------------------
MATCH (rel:Relationship)
WHERE toLower(coalesce(rel.label,'')) CONTAINS 'control'
   OR toLower(coalesce(rel.label,'')) CONTAINS 'owner'
   OR toLower(coalesce(rel.label,'')) CONTAINS 'subsidiar'
RETURN rel.label AS property, rel.uri AS uri ORDER BY property;

// --- 20.5  How deep is the FIBO class hierarchy? ----------------------
MATCH path = (leaf:Class)-[:SCO*]->(root:Class)
WHERE NOT (leaf)<-[:SCO]-(:Class) AND NOT (root)-[:SCO]->(:Class)
RETURN max(length(path)) AS max_depth, avg(length(path)) AS avg_depth;

// --- 20.6  Most-referenced classes (by inbound SCO + DOMAIN + RANGE) --
MATCH (c:Class)
OPTIONAL MATCH (c)<-[:SCO]-(sub)
OPTIONAL MATCH (c)<-[:DOMAIN]-(d)
OPTIONAL MATCH (c)<-[:RANGE]-(r)
WITH c, count(DISTINCT sub) AS subs, count(DISTINCT d) AS doms, count(DISTINCT r) AS rngs
RETURN c.label AS class_label, subs, doms, rngs, (subs+doms+rngs) AS score
ORDER BY score DESC LIMIT 20;
