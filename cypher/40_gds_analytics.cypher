// =====================================================================
// 40_gds_analytics.cypher  —  Graph Data Science on the counterparty graph
// =====================================================================
// Project a directed weighted graph using HAS_OWNERSHIP_IN as the
// "control flow" edge (parent -> child) and add LENDS_TO as another rel.
// =====================================================================

// --- 40.0  Drop any prior projection ---------------------------------
CALL gds.graph.exists('counterparty') YIELD exists
WITH exists WHERE exists
CALL gds.graph.drop('counterparty') YIELD graphName
RETURN graphName;

// --- 40.1  Project the graph -----------------------------------------
CALL gds.graph.project(
  'counterparty',
  ['LegalEntity','Bank','Holding','Corporation'],
  {
    HAS_OWNERSHIP_IN:      { orientation: 'NATURAL', properties: ['weight'] },
    HAS_CONTROLLING_PARTY: { orientation: 'NATURAL' },
    LENDS_TO:              { orientation: 'NATURAL', properties: ['exposure_musd'] }
  }
) YIELD graphName, nodeCount, relationshipCount;

// --- 40.2  PageRank — "systemic importance" by control inflow --------
CALL gds.pageRank.stream('counterparty',
  { relationshipTypes:['HAS_CONTROLLING_PARTY'], maxIterations:30, dampingFactor:0.85 })
YIELD nodeId, score
WITH gds.util.asNode(nodeId) AS n, score
WHERE n:LegalEntity
RETURN n.name AS entity, n.jurisdictionCode AS country, round(score*1000)/1000 AS pagerank
ORDER BY pagerank DESC LIMIT 15;

// --- 40.3  Weakly Connected Components — "control families" ----------
CALL gds.wcc.stream('counterparty',
  { relationshipTypes:['HAS_OWNERSHIP_IN','HAS_CONTROLLING_PARTY'] })
YIELD nodeId, componentId
WITH gds.util.asNode(nodeId) AS n, componentId
WHERE n:LegalEntity
RETURN componentId, count(*) AS size, collect(n.name)[0..6] AS sample
ORDER BY size DESC;

// --- 40.4  Louvain communities (weighted by ownership %) -------------
CALL gds.louvain.stream('counterparty',
  { relationshipTypes:['HAS_OWNERSHIP_IN'], relationshipWeightProperty:'weight' })
YIELD nodeId, communityId
WITH gds.util.asNode(nodeId) AS n, communityId
WHERE n:LegalEntity
RETURN communityId, count(*) AS members, collect(n.name)[0..8] AS sample
ORDER BY members DESC;

// --- 40.5  Node Similarity — find peers (Jaccard over neighborhoods) -
CALL gds.nodeSimilarity.stream('counterparty',
  { relationshipTypes:['HAS_OWNERSHIP_IN','LENDS_TO'], topK:3 })
YIELD node1, node2, similarity
WITH gds.util.asNode(node1) AS a, gds.util.asNode(node2) AS b, similarity
WHERE a:LegalEntity AND b:LegalEntity
RETURN a.name AS entity_a, b.name AS entity_b, round(similarity*1000)/1000 AS jaccard
ORDER BY jaccard DESC LIMIT 20;

// --- 40.6  Betweenness on the control graph (bottleneck entities) ----
CALL gds.betweenness.stream('counterparty',
  { relationshipTypes:['HAS_CONTROLLING_PARTY'] })
YIELD nodeId, score
WITH gds.util.asNode(nodeId) AS n, score
WHERE n:LegalEntity AND score > 0
RETURN n.name AS entity, round(score*1000)/1000 AS betweenness
ORDER BY betweenness DESC LIMIT 10;

// --- 40.7  Write PageRank back as a property for the front-end -------
CALL gds.pageRank.write('counterparty',
  { writeProperty:'systemicScore',
    relationshipTypes:['HAS_CONTROLLING_PARTY'],
    maxIterations:30, dampingFactor:0.85 })
YIELD nodePropertiesWritten, ranIterations
RETURN nodePropertiesWritten, ranIterations;

// --- 40.8  Write Louvain community as property -----------------------
CALL gds.louvain.write('counterparty',
  { writeProperty:'communityId',
    relationshipTypes:['HAS_OWNERSHIP_IN'],
    relationshipWeightProperty:'weight' })
YIELD communityCount, modularity
RETURN communityCount, modularity;

// --- 40.9  Cleanup projection (optional) -----------------------------
// CALL gds.graph.drop('counterparty');
