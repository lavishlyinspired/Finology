import { useState } from 'react'
import { GraduationCap, ChevronDown, ChevronRight, BookOpen, Code, Database, Network, BarChart3, Layers } from 'lucide-react'

const LESSONS = [
  {
    id: 'what-is-kg',
    icon: Network,
    title: 'What is a Knowledge Graph?',
    sections: [
      {
        title: 'Definition',
        content: `A **Knowledge Graph** is a structured representation of real-world entities and relationships between them. Unlike relational databases (tables + rows), knowledge graphs use a **graph structure** where:

- **Nodes** = entities (things, concepts, people, companies)
- **Edges** = relationships between entities
- **Properties** = attributes on nodes and edges

Think of it like a mind-map on steroids — every fact is stored as a triple: (Subject) → [Relationship] → (Object)

For example: (Apex Holdings) → [HAS_OWNERSHIP_IN] → (Meridian Corp, 60%)`
      },
      {
        title: 'Why Knowledge Graphs?',
        content: `Traditional databases struggle with:
- **Complex relationships** — JOINs become expensive with many hops
- **Schema flexibility** — adding new entity types requires ALTER TABLE
- **Connected queries** — "find all entities within 4 hops" is natural in a graph, painful in SQL

Knowledge graphs excel at:
- **Fraud detection** — trace money flow through networks
- **Supply chain** — who supplies whom?
- **Regulatory compliance** — which entities are connected to sanctioned parties?
- **Recommendation engines** — what's similar to what?`
      },
      {
        title: 'Property Graph vs RDF',
        content: `There are two main graph models:

**Property Graph** (what Neo4j uses):
- Nodes and edges can have multiple properties (key-value pairs)
- Nodes can have multiple labels (e.g., :LegalEntity:Bank)
- More intuitive for application developers
- Query language: **Cypher**

**RDF (Resource Description Framework)**:
- Everything is a triple: subject → predicate → object
- Uses URIs for global identification
- Standard: W3C (the web standards body)
- Query language: **SPARQL**
- Better for data integration across organizations

**In our project**: FIBO is defined in RDF/OWL. We use **n10s (neosemantics)** to import RDF into Neo4j's property graph model — best of both worlds!`
      }
    ]
  },
  {
    id: 'what-is-fibo',
    icon: Layers,
    title: 'What is FIBO?',
    sections: [
      {
        title: 'FIBO Overview',
        content: `**FIBO** = Financial Industry Business Ontology

Published by the **EDM Council** (Enterprise Data Management Council), FIBO is the gold standard for financial data semantics. It defines:

- What a "legal entity" IS
- What "ownership" MEANS
- How "securities", "loans", "derivatives" relate to each other
- Jurisdictional concepts (incorporation, regulation)

FIBO is organized into **domains** (modules):
- **FND** — Foundations (dates, parties, agreements)
- **BE** — Business Entities (legal persons, corporations, ownership)
- **FBC** — Financial Business & Commerce (registrations, markets)
- **SEC** — Securities (equities, debt instruments)
- **LOAN** — Loans & Mortgages
- **DER** — Derivatives
- **CAE** — Corporate Actions & Events
- **IND** — Indices & Indicators`
      },
      {
        title: 'T-Box vs A-Box',
        content: `Ontologies have two layers:

**T-Box (Terminological Box)** — The SCHEMA:
- Defines classes: LegalEntity, Corporation, Bank, Jurisdiction
- Defines relationships: hasOwnership, isIncorporatedIn
- Defines constraints: "A Corporation MUST have a Jurisdiction"
- Think of it as the "blueprint"

**A-Box (Assertion Box)** — The DATA:
- Actual instances: "Apex Holdings" is a Holding company
- Actual relationships: "Apex Holdings" owns 60% of "Meridian Corp"
- Think of it as "filling in the blueprint"

**In our Neo4j database**:
- T-Box = :Class nodes connected by :SCO (subClassOf) → visible in Ontology Explorer
- A-Box = :LegalEntity nodes connected by :HAS_OWNERSHIP_IN etc. → visible in Entity Network`
      },
      {
        title: 'Why FIBO Matters',
        content: `Banks and regulators need a **common language**:

- **Regulatory reporting**: When the Fed asks "show all your counterparty exposures" — FIBO defines exactly what "counterparty" and "exposure" mean
- **Data integration**: When Bank A acquires Bank B, they need to merge data — FIBO provides the mapping
- **Risk management**: "Legal Entity Identifier" (LEI) system is directly modeled in FIBO
- **AI/ML**: Machine learning models need consistent features — FIBO ensures "revenue" means the same thing across datasets

Real-world users: JPMorgan, Goldman Sachs, Deutsche Bank, Federal Reserve, ECB`
      }
    ]
  },
  {
    id: 'neo4j-basics',
    icon: Database,
    title: 'Neo4j & Cypher Basics',
    sections: [
      {
        title: 'What is Neo4j?',
        content: `**Neo4j** is the world's leading graph database. Key concepts:

- **Nodes**: Stored as records with labels and properties
  \`(:LegalEntity {name: "Apex Holdings", jurisdictionCode: "US"})\`
  
- **Relationships**: Always directed, always have a type
  \`-[:HAS_OWNERSHIP_IN {percent: 60}]->\`
  
- **Labels**: Category tags on nodes (one node can have multiple)
  \`:LegalEntity:Holding:Corporation\`
  
- **Properties**: Key-value attributes on nodes or relationships`
      },
      {
        title: 'Cypher Query Language',
        content: `Cypher uses ASCII-art patterns to match graph structures:

**Find all entities:**
\`\`\`
MATCH (e:LegalEntity) RETURN e.name
\`\`\`

**Find ownership relationships:**
\`\`\`
MATCH (a:LegalEntity)-[r:HAS_OWNERSHIP_IN]->(b:LegalEntity)
RETURN a.name, r.percent, b.name
\`\`\`

**Find 2-hop paths:**
\`\`\`
MATCH path = (a)-[:HAS_OWNERSHIP_IN*2]->(c)
RETURN a.name, c.name, length(path)
\`\`\`

**Pattern: (node)-[relationship]->(node)**
- Parentheses () = nodes
- Square brackets [] = relationships  
- Arrow -> = direction`
      },
      {
        title: 'n10s (Neosemantics)',
        content: `**n10s** is a Neo4j plugin that bridges RDF/OWL and property graphs:

**What it does:**
1. Reads RDF/OWL ontology files (XML, Turtle, JSON-LD)
2. Maps OWL classes → Neo4j :Class nodes
3. Maps rdfs:subClassOf → :SCO relationships
4. Maps OWL individuals → Neo4j nodes with appropriate labels
5. Applies naming conventions (camelCase → PascalCase)

**Configuration we used:**
\`\`\`
CALL n10s.graphconfig.init({
  handleVocabUris: 'IGNORE',
  applyNeo4jNaming: true,
  handleRDFTypes: 'LABELS'
})
\`\`\`

This means:
- URIs are simplified (no full http://... stored)
- Names follow Neo4j conventions (PascalCase labels)
- RDF types become Neo4j labels (rdf:type → :LegalEntity label)`
      }
    ]
  },
  {
    id: 'gds-algorithms',
    icon: BarChart3,
    title: 'Graph Algorithms (GDS)',
    sections: [
      {
        title: 'What is GDS?',
        content: `**Neo4j GDS** (Graph Data Science) is a library of 60+ graph algorithms:

**Workflow:**
1. **Project** — Copy nodes + relationships into an in-memory graph (fast!)
2. **Run** — Execute algorithms on the projected graph
3. **Stream/Write** — Get results as stream or write back to database

**Why in-memory?** Graph algorithms often need to traverse the ENTIRE graph multiple times. Reading from disk each time would be too slow. GDS keeps everything in RAM.

**Our projection:**
\`\`\`
CALL gds.graph.project('counterparty_ml',
  ['LegalEntity','Bank','Holding','Corporation'],
  { HAS_OWNERSHIP_IN: {properties: ['weight']},
    HAS_CONTROLLING_PARTY: {},
    LENDS_TO: {properties: ['exposure_musd']},
    SUPPLIES_TO: {},
    JOINT_VENTURE: {} }
)
\`\`\`
→ 21 nodes, 44 relationships in memory`
      },
      {
        title: 'PageRank',
        content: `**What**: Measures "importance" — which entities have the most influence?

**How it works**: Originally invented by Google for ranking web pages. An entity is important if:
1. Many other entities point to it (via ownership/control)
2. Those pointing entities are themselves important

**Intuition**: If a major bank (high PageRank) owns a subsidiary, that subsidiary inherits some importance.

**Parameters:**
- damping factor (0.85) = probability of following a link vs. "teleporting" randomly
- maxIterations (30) = convergence cycles

**In our graph**: Entities with high PageRank are "systemically important" — their failure would cascade widely.`
      },
      {
        title: 'Louvain Community Detection',
        content: `**What**: Groups entities that are more connected to each other than to outsiders.

**How it works**: 
1. Start: each node is its own community
2. Move each node to the community that maximizes "modularity" (internal connections vs external)
3. Collapse communities into super-nodes
4. Repeat until no improvement

**Intuition**: In our entity network, entities owned by the same holding company naturally form a community.

**Result**: 7 communities detected — roughly corresponding to corporate groups (Apex Group, NW Securities Group, etc.)

**Use case**: Identifying conglomerate boundaries, detecting hidden ownership clusters.`
      },
      {
        title: 'Betweenness Centrality',
        content: `**What**: Identifies "bridge" entities that connect different parts of the network.

**How it works**: Count how many shortest paths between ALL pairs of nodes pass through each node.

**Intuition**: If you remove a high-betweenness entity, the network might split into disconnected parts.

**Use case**: 
- Which entity is the "single point of failure"?
- Who is the critical intermediary in a supply chain?
- Which bank connects otherwise-separate corporate groups?

**In our graph**: Banks tend to have high betweenness because they lend to entities in different corporate groups.`
      },
      {
        title: 'Node Similarity (Jaccard)',
        content: `**What**: Finds entities with similar connection patterns.

**How it works**: Jaccard similarity = |shared neighbors| / |all neighbors|

**Intuition**: If Company A and Company B are both owned by the same parent, lend to the same banks, and operate in the same jurisdictions — they're structurally similar.

**Use case**:
- Find potential M&A targets (similar profile)
- Regulatory: "are these entities related?" (shared ownership structure)
- Risk: if similar entities defaulted before, this one might too`
      },
      {
        title: 'Node2Vec & ML',
        content: `**What**: Converts graph structure into numerical vectors (embeddings) for ML.

**How it works**: 
1. Perform random walks from each node (like a drunk person wandering the graph)
2. Use Word2Vec-style training to learn a 16-dimensional vector for each node
3. Nodes with similar neighborhoods get similar vectors

**Then we apply ML:**
- **t-SNE/PCA**: Reduce 16D → 2D for visualization
- **KMeans**: Cluster entities by structural similarity
- **DBSCAN**: Find density-based clusters (+ noise/outliers)
- **Random Forest**: Classify entities as high/low risk based on graph features

**Features used**: ownership_out, lending_out, lending_in, PageRank, betweenness → predict risk category`
      }
    ]
  },
  {
    id: 'our-data-model',
    icon: Code,
    title: 'Our Data Model & What We Built',
    sections: [
      {
        title: 'The Entity Network',
        content: `We built a realistic counterparty network with **21 legal entities**:

**Entity Types** (FIBO-aligned):
- 🏦 **Banks**: Capital One National, Northwest Securities (lenders)
- 🏢 **Holdings**: Apex Holdings, NW Securities Holdings (parent companies)
- 🏭 **Corporations**: Meridian Corp, Cobalt Industries, etc. (subsidiaries)

**Relationships**:
- **HAS_OWNERSHIP_IN** — "A owns X% of B" (with percent property)
- **HAS_CONTROLLING_PARTY** — "A controls B" (51%+ stake)
- **LENDS_TO** — "Bank lends $XM to Entity" (with exposure property)
- **SUPPLIES_TO** — "A supplies goods/services to B" (supply chain)
- **JOINT_VENTURE** — "A and B have a joint venture"
- **INCORPORATED_IN** — "Entity is registered in Jurisdiction"

**Jurisdictions**: US, UK, DE (Germany), SG (Singapore), KY (Cayman Islands)`
      },
      {
        title: 'What the Notebook Does',
        content: `The Jupyter notebook (fibo_advanced_analytics.ipynb) performs:

1. **RDFLib Parsing** — Fetch FIBO ontology directly, extract OWL classes via SPARQL
2. **n10s Verification** — Check how n10s mapped RDF → Neo4j
3. **APOC Path Expansion** — Trace control chains from holding companies
4. **Ownership Visualization** — NetworkX graph colored by jurisdiction
5. **GDS PageRank** — Identify systemically important entities
6. **GDS Louvain** — Detect corporate communities
7. **GDS WCC** — Find connected components
8. **GDS Betweenness** — Find bridge entities
9. **Node Similarity** — Find structurally similar entities
10. **Node2Vec** — Generate graph embeddings
11. **t-SNE & PCA** — Dimensionality reduction + visualization
12. **KMeans & DBSCAN** — Unsupervised clustering
13. **Random Forest** — Risk classification
14. **Contagion Simulation** — Default cascade modeling
15. **Cross-border Aggregation** — Jurisdiction-level lending flows
16. **Write-back** — Store analytics results in Neo4j`
      },
      {
        title: 'Technology Stack',
        content: `**Database Layer:**
- Neo4j 5.x — Graph database
- n10s (neosemantics) — RDF/OWL importer
- APOC — Utility procedures (path expansion, meta-graph)
- GDS — Graph Data Science algorithms

**Python Layer:**
- neo4j driver — Database connectivity
- graphdatascience — GDS Python client
- rdflib — RDF parsing & SPARQL
- pandas/numpy — Data manipulation
- matplotlib/seaborn — Visualization
- networkx — Graph analysis
- scikit-learn — Machine learning

**Frontend Layer:**
- React 18 + Vite — UI framework
- react-force-graph-2d — Interactive graph visualization
- recharts — Charts and analytics displays
- Tailwind CSS — Styling
- neo4j-driver (JS) — Browser-side Neo4j connection

**Data Source:**
- FIBO ontology from EDM Council CDN (RDF/XML)
- 16 FIBO modules loaded (3,675 triples, 237 classes)
- 21 manually-seeded legal entity instances`
      }
    ]
  },
  {
    id: 'hands-on',
    icon: BookOpen,
    title: 'Try It Yourself — Cypher Queries',
    sections: [
      {
        title: 'Basic Exploration',
        content: `Open Neo4j Browser (http://localhost:7474) and try these:

**See all entity types:**
\`\`\`cypher
CALL db.labels() YIELD label RETURN label
\`\`\`

**Count nodes by label:**
\`\`\`cypher
MATCH (n) RETURN labels(n) AS type, count(*) AS count ORDER BY count DESC
\`\`\`

**See all relationship types:**
\`\`\`cypher
CALL db.relationshipTypes() YIELD relationshipType RETURN relationshipType
\`\`\`

**Find all legal entities:**
\`\`\`cypher
MATCH (e:LegalEntity) RETURN e.name, labels(e), e.jurisdictionCode
\`\`\`
`
      },
      {
        title: 'Ownership & Control Queries',
        content: `**Who owns what?**
\`\`\`cypher
MATCH (owner:LegalEntity)-[r:HAS_OWNERSHIP_IN]->(target:LegalEntity)
RETURN owner.name, r.percent, target.name
ORDER BY r.percent DESC
\`\`\`

**Complete ownership chain (multi-hop):**
\`\`\`cypher
MATCH path = (h:Holding)-[:HAS_OWNERSHIP_IN*1..4]->(e:LegalEntity)
RETURN [n IN nodes(path) | n.name] AS chain, length(path) AS depth
ORDER BY depth DESC
\`\`\`

**Find entities with no parent owner:**
\`\`\`cypher
MATCH (e:LegalEntity)
WHERE NOT ()-[:HAS_OWNERSHIP_IN]->(e)
RETURN e.name AS top_level_entity
\`\`\`

**Cross-border ownership:**
\`\`\`cypher
MATCH (a:LegalEntity)-[:INCORPORATED_IN]->(j1:Jurisdiction),
      (a)-[:HAS_OWNERSHIP_IN]->(b:LegalEntity)-[:INCORPORATED_IN]->(j2:Jurisdiction)
WHERE j1 <> j2
RETURN a.name, j1.name AS from_jur, b.name, j2.name AS to_jur
\`\`\`
`
      },
      {
        title: 'Ontology Queries',
        content: `**See the class hierarchy (FIBO T-Box):**
\`\`\`cypher
MATCH (child:Class)-[:SCO]->(parent:Class)
RETURN child.name AS subclass, parent.name AS superclass
ORDER BY superclass, subclass
LIMIT 50
\`\`\`

**Find root classes (no parent):**
\`\`\`cypher
MATCH (c:Class) WHERE NOT (c)-[:SCO]->()
RETURN c.name AS root_class
\`\`\`

**Count subclasses per class:**
\`\`\`cypher
MATCH (parent:Class)<-[:SCO]-(child:Class)
RETURN parent.name, count(child) AS subclass_count
ORDER BY subclass_count DESC LIMIT 20
\`\`\`

**Full path from a class to its root:**
\`\`\`cypher
MATCH path = (c:Class {name: 'Corporation'})-[:SCO*]->(root:Class)
WHERE NOT (root)-[:SCO]->()
RETURN [n IN nodes(path) | n.name] AS hierarchy
\`\`\`
`
      },
      {
        title: 'GDS Algorithm Queries',
        content: `**Project the graph (do this first):**
\`\`\`cypher
CALL gds.graph.project('my_graph',
  ['LegalEntity'],
  { HAS_OWNERSHIP_IN: { orientation: 'NATURAL', properties: ['weight'] } }
)
\`\`\`

**Run PageRank:**
\`\`\`cypher
CALL gds.pageRank.stream('my_graph')
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).name AS entity, score
ORDER BY score DESC
\`\`\`

**Run Louvain:**
\`\`\`cypher
CALL gds.louvain.stream('my_graph')
YIELD nodeId, communityId
RETURN gds.util.asNode(nodeId).name AS entity, communityId
\`\`\`

**Clean up:**
\`\`\`cypher
CALL gds.graph.drop('my_graph')
\`\`\`
`
      }
    ]
  }
]

function LessonSection({ section }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <h4 className="text-white font-semibold text-base mb-2">{section.title}</h4>
      <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
        {section.content.split(/```(\w*)\n([\s\S]*?)```/).map((part, i) => {
          if (i % 3 === 2) {
            // Code block content
            return (
              <pre key={i} className="bg-gray-800 rounded-lg p-3 overflow-x-auto text-xs font-mono text-green-300 my-3">
                <code>{part}</code>
              </pre>
            )
          } else if (i % 3 === 1) {
            return null // language identifier
          }
          // Convert markdown-like bold
          return (
            <span key={i} dangerouslySetInnerHTML={{
              __html: part
                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                .replace(/`([^`]+)`/g, '<code class="text-xs bg-gray-700 px-1 rounded text-neo-300">$1</code>')
                .replace(/\n/g, '<br/>')
            }} />
          )
        })}
      </div>
    </div>
  )
}

export default function Learning() {
  const [expandedLesson, setExpandedLesson] = useState('what-is-kg')
  const [expandedSection, setExpandedSection] = useState(0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-red-400" />
          Learning Center
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Step-by-step guide to understanding FIBO, Knowledge Graphs, Neo4j, and Graph Algorithms.
        </p>
      </div>

      {/* Progress hint */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
        <p className="text-sm text-gray-300">
          <strong className="text-white">Recommended order:</strong> Start with "What is a Knowledge Graph?" 
          and work your way down. Each lesson builds on the previous one. 
          Use the Ontology Explorer and Entity Network pages to see the concepts in action!
        </p>
      </div>

      {/* Lessons */}
      <div className="space-y-3">
        {LESSONS.map((lesson) => {
          const isExpanded = expandedLesson === lesson.id
          const Icon = lesson.icon
          return (
            <div key={lesson.id} className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
              <button
                onClick={() => setExpandedLesson(isExpanded ? null : lesson.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-800/30 transition"
              >
                <Icon className="w-5 h-5 text-neo-400" />
                <span className="flex-1 font-semibold text-white">{lesson.title}</span>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </button>
              {isExpanded && (
                <div className="border-t border-gray-800">
                  {/* Section tabs */}
                  <div className="flex flex-wrap gap-1 px-4 pt-3">
                    {lesson.sections.map((sec, idx) => (
                      <button
                        key={idx}
                        onClick={() => setExpandedSection(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          expandedSection === idx
                            ? 'bg-neo-700/30 text-neo-300 border border-neo-700/50'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                      >
                        {sec.title}
                      </button>
                    ))}
                  </div>
                  {/* Content */}
                  <div className="p-5">
                    <LessonSection section={lesson.sections[expandedSection] || lesson.sections[0]} />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
