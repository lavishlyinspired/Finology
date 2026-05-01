// =====================================================================
// 25_seed_abox.cypher  —  Seed instance data for the counterparty use case
// =====================================================================
// We model ~25 entities forming a realistic ownership/control network
// across US, UK, DE, SG with two banks (creditors).
//
// Labels we use (in addition to whatever FIBO classes are linked):
//   :LegalEntity, :Corporation, :Bank, :GovernmentEntity, :Holding
// Relationships:
//   HAS_CONTROLLING_PARTY  (control)
//   HAS_OWNERSHIP_IN       (ownership %, weight=pct/100)
//   HAS_LEGAL_FORM
//   INCORPORATED_IN        (jurisdiction)
//   OPERATES_IN            (sector)
//   LENDS_TO               (bank -> borrower, with exposure)
//   REGULATED_BY
// =====================================================================

// --- 25.0  Clean any prior seed (safe: only seeded labels) -----------
MATCH (n)
WHERE n.lei IS NOT NULL OR n:SeedRegulator OR n:SeedJurisdiction OR n:SeedSector
DETACH DELETE n;

// --- 25.1  Reference data: jurisdictions, sectors, regulators --------
UNWIND [
  {code:'US', name:'United States'},
  {code:'UK', name:'United Kingdom'},
  {code:'DE', name:'Germany'},
  {code:'SG', name:'Singapore'},
  {code:'KY', name:'Cayman Islands'}
] AS j
MERGE (x:Jurisdiction:SeedJurisdiction {code:j.code}) SET x.name=j.name;

UNWIND ['Banking','AssetManagement','Insurance','Energy','Technology','RealEstate','Holding'] AS s
MERGE (:Sector:SeedSector {name:s});

UNWIND [
  {name:'SEC',  jurisdiction:'US'},
  {name:'FCA',  jurisdiction:'UK'},
  {name:'BaFin',jurisdiction:'DE'},
  {name:'MAS',  jurisdiction:'SG'}
] AS r
MERGE (reg:Regulator:SeedRegulator {name:r.name})
WITH reg, r
MATCH (j:Jurisdiction {code:r.jurisdiction})
MERGE (reg)-[:OPERATES_IN_JURISDICTION]->(j);

// --- 25.2  Legal entities (with LEI, sector, jurisdiction) -----------
UNWIND [
  // --- Group 1: "Apex Holdings" pyramid (US-rooted, multi-jurisdiction)
  {lei:'LEI0000000000000APEX1', name:'Apex Holdings Inc.',          juris:'US', sector:'Holding',         labels:['Holding','Corporation']},
  {lei:'LEI0000000000000APEX2', name:'Apex Capital LLC',            juris:'US', sector:'AssetManagement', labels:['Corporation']},
  {lei:'LEI0000000000000APEX3', name:'Apex Energy Plc',             juris:'UK', sector:'Energy',          labels:['Corporation']},
  {lei:'LEI0000000000000APEX4', name:'Apex Tech GmbH',              juris:'DE', sector:'Technology',      labels:['Corporation']},
  {lei:'LEI0000000000000APEX5', name:'Apex Realty Pte Ltd',         juris:'SG', sector:'RealEstate',      labels:['Corporation']},
  {lei:'LEI0000000000000APEX6', name:'Apex Offshore Ltd',           juris:'KY', sector:'Holding',         labels:['Holding','Corporation']},
  {lei:'LEI0000000000000APEX7', name:'Apex Insurance Ltd',          juris:'UK', sector:'Insurance',       labels:['Corporation']},

  // --- Group 2: "Northwind Group" (UK-rooted)
  {lei:'LEI0000000000000NW0001', name:'Northwind Group Plc',        juris:'UK', sector:'Holding',         labels:['Holding','Corporation']},
  {lei:'LEI0000000000000NW0002', name:'Northwind Asset Mgmt Ltd',   juris:'UK', sector:'AssetManagement', labels:['Corporation']},
  {lei:'LEI0000000000000NW0003', name:'Northwind Securities GmbH',  juris:'DE', sector:'Banking',         labels:['Corporation']},
  {lei:'LEI0000000000000NW0004', name:'Northwind Realty Inc.',      juris:'US', sector:'RealEstate',      labels:['Corporation']},

  // --- Group 3: "Sentinel Bank" creditor + "Meridian" borrowers
  {lei:'LEI0000000000000BNK001', name:'Sentinel Bank N.A.',         juris:'US', sector:'Banking',         labels:['Bank','Corporation']},
  {lei:'LEI0000000000000BNK002', name:'Pacifica Trust Bank',        juris:'SG', sector:'Banking',         labels:['Bank','Corporation']},
  {lei:'LEI0000000000000MR0001', name:'Meridian Industries Inc.',   juris:'US', sector:'Energy',          labels:['Corporation']},
  {lei:'LEI0000000000000MR0002', name:'Meridian Real Estate LP',    juris:'US', sector:'RealEstate',      labels:['Corporation']},
  {lei:'LEI0000000000000MR0003', name:'Meridian Tech Pte Ltd',      juris:'SG', sector:'Technology',      labels:['Corporation']},

  // --- Independents (used to test similarity)
  {lei:'LEI0000000000000IND001', name:'Helios Renewables Plc',      juris:'UK', sector:'Energy',          labels:['Corporation']},
  {lei:'LEI0000000000000IND002', name:'Borealis Tech AG',           juris:'DE', sector:'Technology',      labels:['Corporation']},
  {lei:'LEI0000000000000IND003', name:'Lotus Properties Pte Ltd',   juris:'SG', sector:'RealEstate',      labels:['Corporation']},
  {lei:'LEI0000000000000IND004', name:'Cobalt Capital LLC',         juris:'US', sector:'AssetManagement', labels:['Corporation']},
  {lei:'LEI0000000000000IND005', name:'Vanta Insurance GmbH',       juris:'DE', sector:'Insurance',       labels:['Corporation']}
] AS e
CALL apoc.create.node(['LegalEntity'] + e.labels, {
  lei: e.lei, name: e.name, jurisdictionCode: e.juris, sectorName: e.sector
}) YIELD node
WITH node, e
MATCH (j:Jurisdiction {code:e.juris})
MATCH (s:Sector {name:e.sector})
MERGE (node)-[:INCORPORATED_IN]->(j)
MERGE (node)-[:OPERATES_IN]->(s);

// --- 25.3  Regulator relationships -----------------------------------
MATCH (e:LegalEntity)-[:INCORPORATED_IN]->(j:Jurisdiction)<-[:OPERATES_IN_JURISDICTION]-(reg:Regulator)
MERGE (e)-[:REGULATED_BY]->(reg);

// --- 25.4  Control & ownership edges (Apex group) --------------------
// Apex Holdings controls: Capital, Energy, Tech, Offshore
// Apex Offshore controls: Realty, Insurance
// (creates a 2-tier pyramid + a circular ownership we'll detect)
UNWIND [
  ['LEI0000000000000APEX1','LEI0000000000000APEX2', 100],
  ['LEI0000000000000APEX1','LEI0000000000000APEX3',  80],
  ['LEI0000000000000APEX1','LEI0000000000000APEX4',  75],
  ['LEI0000000000000APEX1','LEI0000000000000APEX6',  60],
  ['LEI0000000000000APEX6','LEI0000000000000APEX5',  90],
  ['LEI0000000000000APEX6','LEI0000000000000APEX7',  55],
  // Circular ownership red flag: Apex7 owns 5% of Apex1
  ['LEI0000000000000APEX7','LEI0000000000000APEX1',   5]
] AS row
MATCH (parent:LegalEntity {lei:row[0]})
MATCH (child:LegalEntity  {lei:row[1]})
MERGE (parent)-[o:HAS_OWNERSHIP_IN]->(child)
SET o.percent = row[2], o.weight = toFloat(row[2])/100.0
WITH parent, child, row WHERE row[2] >= 50
MERGE (child)-[c:HAS_CONTROLLING_PARTY]->(parent)
SET c.basis='ownership_majority';

// --- 25.5  Northwind group -------------------------------------------
UNWIND [
  ['LEI0000000000000NW0001','LEI0000000000000NW0002', 100],
  ['LEI0000000000000NW0001','LEI0000000000000NW0003',  70],
  ['LEI0000000000000NW0001','LEI0000000000000NW0004',  85]
] AS row
MATCH (parent:LegalEntity {lei:row[0]})
MATCH (child:LegalEntity  {lei:row[1]})
MERGE (parent)-[o:HAS_OWNERSHIP_IN]->(child) SET o.percent=row[2], o.weight=toFloat(row[2])/100.0
MERGE (child)-[c:HAS_CONTROLLING_PARTY]->(parent) SET c.basis='ownership_majority';

// --- 25.6  Meridian group --------------------------------------------
UNWIND [
  ['LEI0000000000000MR0001','LEI0000000000000MR0002', 100],
  ['LEI0000000000000MR0001','LEI0000000000000MR0003',  65]
] AS row
MATCH (parent:LegalEntity {lei:row[0]})
MATCH (child:LegalEntity  {lei:row[1]})
MERGE (parent)-[o:HAS_OWNERSHIP_IN]->(child) SET o.percent=row[2], o.weight=toFloat(row[2])/100.0
MERGE (child)-[c:HAS_CONTROLLING_PARTY]->(parent) SET c.basis='ownership_majority';

// --- 25.7  Bank lending edges (the risk overlay) ---------------------
UNWIND [
  ['LEI0000000000000BNK001','LEI0000000000000APEX2', 250.0],
  ['LEI0000000000000BNK001','LEI0000000000000APEX3', 180.0],
  ['LEI0000000000000BNK001','LEI0000000000000MR0001', 400.0],
  ['LEI0000000000000BNK001','LEI0000000000000NW0004',  90.0],
  ['LEI0000000000000BNK002','LEI0000000000000APEX5', 120.0],
  ['LEI0000000000000BNK002','LEI0000000000000MR0003', 200.0],
  ['LEI0000000000000BNK002','LEI0000000000000IND003',  60.0],
  ['LEI0000000000000BNK002','LEI0000000000000NW0003', 150.0]
] AS row
MATCH (b:Bank      {lei:row[0]})
MATCH (e:LegalEntity {lei:row[1]})
MERGE (b)-[l:LENDS_TO]->(e) SET l.exposure_musd = row[2];

// --- 25.8  Link our seeded entities to the FIBO class (if loaded) ----
// (no-op if BE not yet loaded)
OPTIONAL MATCH (corpClass:Class) WHERE corpClass.uri ENDS WITH 'Corporation'
WITH corpClass WHERE corpClass IS NOT NULL
MATCH (e:Corporation)
MERGE (e)-[:RDF_TYPE]->(corpClass);

OPTIONAL MATCH (leClass:Class) WHERE leClass.uri ENDS WITH 'LegalEntity'
WITH leClass WHERE leClass IS NOT NULL
MATCH (e:LegalEntity)
MERGE (e)-[:RDF_TYPE]->(leClass);

// --- 25.9  Quick sanity check ----------------------------------------
MATCH (e:LegalEntity) RETURN count(e) AS entities;
MATCH ()-[r:HAS_CONTROLLING_PARTY]->() RETURN count(r) AS control_edges;
MATCH ()-[r:HAS_OWNERSHIP_IN]->() RETURN count(r) AS ownership_edges;
MATCH ()-[r:LENDS_TO]->() RETURN count(r) AS loans, sum(r.exposure_musd) AS total_exposure_musd;
