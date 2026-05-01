# skills.md — FIBO + Neo4j Knowledge-Graph Tutor

> Your guided, hands-on path to master the **Financial Industry Business Ontology (FIBO)** as a property graph in Neo4j, with EDA, GDS analytics, and a neovis.js front-end.
>
> Read this file top-to-bottom. Each section ends with a **DO** block — actions to run in `cypher/`, the notebook, or the front-end.

---

## 0. Mental model (read first)

| Concept | Plain English | FIBO term |
|---|---|---|
| Ontology | A formal vocabulary + rules describing a domain | OWL ontology |
| Class | A *kind of thing* (e.g., LegalEntity) | `owl:Class` |
| Individual | A specific instance (e.g., "Apple Inc.") | `owl:NamedIndividual` |
| Object property | A typed relationship between two things | `owl:ObjectProperty` |
| Data property | A literal attribute (string/number/date) | `owl:DatatypeProperty` |
| Subclass | "Is-a" hierarchy | `rdfs:subClassOf` |

**FIBO** is a *suite* of OWL ontologies maintained by the EDM Council, providing a **standard vocabulary for finance**: legal entities, contracts, securities, derivatives, indices, loans, etc. It is used by regulators (e.g., for **LEI** — Legal Entity Identifier), banks, and rating agencies for data harmonization, KYC/AML, counterparty risk, and regulatory reporting.

### FIBO module map

```
FIBO
├── FND  Foundations          (currencies, dates, agreements, relations)
├── BE   Business Entities    (corporations, partnerships, ownership, control)  ← our focus
├── FBC  Financial Business   (banks, financial services, products, markets)
├── SEC  Securities           (stocks, bonds, issuance)
├── DER  Derivatives          (swaps, options, futures)
├── LOAN Loans                (mortgages, consumer loans)
├── IND  Indicators / Indices (rates, benchmarks)
└── CAE / MD / others
```

We load **FND + BE + FBC** — enough for a counterparty / LEI risk story without drowning in triples.

---

## 1. Why a graph for FIBO?

FIBO is *natively* a graph: classes link to classes via `subClassOf`; properties have `domain` and `range`; instances connect through ownership, control, and contract relations. Loading FIBO into Neo4j gives you:

1. **Schema graph** — the ontology itself (T-Box): browse `Class -[:SCO]-> Class`.
2. **Instance graph** — your data (A-Box): `LegalEntity -[:HAS_CONTROLLING_PARTY]-> LegalEntity`.
3. **Reasoning lite** — traverse `subClassOf*` to answer "is X a kind of FinancialInstitution?".
4. **Analytics** — GDS centrality, communities, similarity over real ownership networks.

### The two key Neo4j tools

- **neosemantics (n10s)** — imports RDF/OWL into Neo4j as a property graph. Maps IRIs to nodes, OWL classes to `:Class` nodes, properties to relationships.
- **APOC** — utility procedures (loading, schema, refactoring).
- **GDS (Graph Data Science)** — algorithms (PageRank, Louvain, weakly-connected components, node similarity).

---

## 2. The plan (what we will do, in order)

1. **Install plugins** (APOC, GDS, n10s) — you said all three are installed. We verify.
2. **Initialize n10s** — uniqueness constraint + graph config.
3. **Load FIBO** modules from EDM Council CDN (the public "FIBO production" RDF/XML).
4. **Explore the T-Box** — what classes & properties exist? Where are LegalEntity, Corporation, etc.?
5. **Seed an A-Box** — ~25 realistic legal entities with LEIs, ownership, control, jurisdictions.
6. **EDA in Cypher + the notebook** — degree distributions, hierarchy depth, label inventory.
7. **GDS analytics** — PageRank (systemic importance), Louvain (clusters), WCC (control groups), Node Similarity.
8. **Front-end** — neovis.js page with use-case queries.

---

## 3. FIBO concepts you must know for the use case

### Legal Entity (the heart of BE)

> A **Legal Entity** is anything that the law treats as a person capable of having rights and duties. In FIBO: `fibo-be-le-lei:LegalEntity`.

Subclasses we'll touch:

- `Corporation` — formal incorporated entity (e.g., "Apple Inc.").
- `Partnership` — partners share liability.
- `GovernmentEntity` — sovereign / sub-sovereign.
- `FinancialInstitution` (in FBC) — banks, broker-dealers, etc.

### Ownership vs Control (subtle, important)

- **Ownership** — economic stake (`isOwnedBy`, `hasOwnership`).
- **Control** — ability to direct decisions (`hasControllingParty`, `controls`).

You can own without controlling (passive shareholder) and control without owning (golden share, voting trust). FIBO models both — counterparty risk uses **control**.

### LEI (Legal Entity Identifier)

A **20-character** ISO 17442 code that uniquely identifies a legal entity worldwide. GLEIF publishes the registry. In FIBO: `fibo-be-le-lei:hasLegalEntityIdentifier`.

### Why these matter for risk

If Bank A lends to Subsidiary X, and X is controlled by Holding Y which also controls Subsidiary Z which is in default — Bank A's exposure is to the **control group**, not just X. Graph traversal makes this trivial; SQL makes it nightmarish.

**DO**: Open `cypher/00_setup.cypher`, run section by section in Neo4j Browser.

---

## 4. How n10s maps RDF → property graph

| RDF | Neo4j |
|---|---|
| IRI of a resource | node with `uri` property |
| `rdf:type` | label on the node (e.g., `:Resource:Class`) |
| `owl:Class` | `:Class` label |
| `owl:ObjectProperty` | `:Relationship` label (metadata) AND used to type relationships |
| `rdfs:subClassOf` | `(:Class)-[:SCO]->(:Class)` |
| `rdfs:subPropertyOf` | `(:Relationship)-[:SPO]->(:Relationship)` |
| `rdfs:domain` / `rdfs:range` | `(:Relationship)-[:DOMAIN|RANGE]->(:Class)` |
| `rdfs:label` | property `rdfs__label` (or shortened — see config) |

We use `handleVocabUris: 'IGNORE'` so labels are short and readable. URIs are kept on each node so we can join back to standards.

---

## 5. The use case — Counterparty / LEI risk graph

We will populate ~25 entities forming a realistic ownership/control network across 3–4 jurisdictions (US, UK, DE, SG), with two banks, two regulators, and a chain of subsidiaries. Then we ask:

1. **Which entities are "systemically important"** in this network? → PageRank weighted by control.
2. **What are the natural control groups (clusters)?** → Louvain community detection.
3. **If Holding-X defaults, who is exposed?** → Reverse traversal of `HAS_CONTROLLING_PARTY` (variable-length) + bank lending edges.
4. **Find similar entities** (same jurisdiction + same sector + similar control pattern) → GDS Node Similarity.
5. **Cross-jurisdiction control loops** — circular ownership detection (a known KYC red flag).

Each of these is a Cypher query in `cypher/30_use_case.cypher` and a notebook cell.

---

## 6. EDA checklist (we'll execute together)

- [ ] Node count by label
- [ ] Relationship count by type
- [ ] Top-N degree nodes (in / out / total)
- [ ] Subclass-tree depth and width
- [ ] Property coverage (% of nodes with each property)
- [ ] Connected components
- [ ] Triangles & local clustering
- [ ] Centrality (degree, PageRank, betweenness)
- [ ] Communities (Louvain, modularity)
- [ ] Similarity (Jaccard / cosine via GDS Node Similarity)

All in `notebooks/fibo_eda.ipynb`.

---

## 7. Glossary (keep open while exploring)

| Term | Meaning |
|---|---|
| T-Box | "Terminological" — the schema (classes, properties) |
| A-Box | "Assertional" — the instances |
| Triple | (subject, predicate, object) — the atom of RDF |
| IRI | Internationalized Resource Identifier — global ID for a thing |
| OWL | Web Ontology Language — adds expressivity over RDFS |
| SHACL | Shapes Constraint Language — validation rules |
| SCO | Subclass-of (n10s shortened) |
| SPO | Subproperty-of |
| LEI | Legal Entity Identifier (20-char ISO 17442) |
| GLEIF | Global LEI Foundation — issues LEIs |
| KYC | Know Your Customer |
| Counterparty | The other side of a financial contract |

---

## 8. Run order (cheat-sheet)

```
1. cypher/00_setup.cypher          ← constraints + n10s init
2. cypher/10_load_fibo.cypher      ← import FND+BE+FBC ontologies
3. cypher/20_explore_tbox.cypher   ← inspect schema
4. cypher/25_seed_abox.cypher      ← seed counterparty data
5. cypher/30_use_case.cypher       ← business questions
6. cypher/40_gds_analytics.cypher  ← graph algorithms
7. notebooks/fibo_eda.ipynb        ← Python EDA + plots
8. frontend/index.html             ← neovis.js demo (open in browser)
```

Open the README for the literal commands.
