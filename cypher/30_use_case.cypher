// =====================================================================
// 30_use_case.cypher  —  Counterparty / LEI risk business questions
// =====================================================================

// --- 30.1  Q1: Show the full ownership tree of Apex Holdings ----------
MATCH path = (root:LegalEntity {name:'Apex Holdings Inc.'})-[:HAS_OWNERSHIP_IN*1..5]->(child)
RETURN path;

// --- 30.2  Q2: Ultimate parent(s) for each entity ---------------------
// "Walk up control until you cannot anymore"
MATCH (e:LegalEntity)
OPTIONAL MATCH path = (e)-[:HAS_CONTROLLING_PARTY*]->(top)
WHERE NOT (top)-[:HAS_CONTROLLING_PARTY]->()
WITH e, top, length(path) AS hops
RETURN e.name AS entity, top.name AS ultimate_parent, hops
ORDER BY entity;

// --- 30.3  Q3: Bank exposure by ULTIMATE control group ---------------
MATCH (b:Bank)-[l:LENDS_TO]->(borrower:LegalEntity)
OPTIONAL MATCH path=(borrower)-[:HAS_CONTROLLING_PARTY*0..5]->(top)
WHERE NOT (top)-[:HAS_CONTROLLING_PARTY]->()
WITH b, top, sum(l.exposure_musd) AS exposure
RETURN b.name AS bank,
       coalesce(top.name, 'INDEPENDENT') AS control_group,
       exposure
ORDER BY bank, exposure DESC;

// --- 30.4  Q4: If "Apex Holdings Inc." defaults, who is at risk? -----
MATCH (root:LegalEntity {name:'Apex Holdings Inc.'})
MATCH (root)-[:HAS_OWNERSHIP_IN*1..5]->(downstream)
OPTIONAL MATCH (b:Bank)-[l:LENDS_TO]->(downstream)
RETURN downstream.name AS at_risk_entity,
       collect(DISTINCT b.name) AS exposed_banks,
       sum(l.exposure_musd)     AS total_exposure_musd
ORDER BY total_exposure_musd DESC;

// --- 30.5  Q5: Detect circular ownership (KYC red flag) --------------
MATCH path = (e:LegalEntity)-[:HAS_OWNERSHIP_IN*2..6]->(e)
RETURN [n IN nodes(path) | n.name] AS cycle, length(path) AS cycle_length
LIMIT 10;

// --- 30.6  Q6: Cross-jurisdictional control pairs --------------------
MATCH (sub:LegalEntity)-[:HAS_CONTROLLING_PARTY]->(parent:LegalEntity)
MATCH (sub)-[:INCORPORATED_IN]->(jSub:Jurisdiction)
MATCH (parent)-[:INCORPORATED_IN]->(jPar:Jurisdiction)
WHERE jSub <> jPar
RETURN sub.name AS subsidiary, jSub.code AS sub_country,
       parent.name AS parent,    jPar.code AS parent_country
ORDER BY parent_country, sub_country;

// --- 30.7  Q7: Concentration — top exposures per regulator ----------
MATCH (b:Bank)-[l:LENDS_TO]->(borrower:LegalEntity)-[:REGULATED_BY]->(r:Regulator)
RETURN r.name AS regulator,
       sum(l.exposure_musd) AS exposure_in_regulatory_perimeter,
       count(DISTINCT borrower) AS borrowers
ORDER BY exposure_in_regulatory_perimeter DESC;
