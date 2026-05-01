import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Database, Network, BarChart3, Zap, GraduationCap, Layers, ArrowRight } from 'lucide-react'
import { runQuery } from '../neo4j'
import InfoCard from '../components/InfoCard'

export default function Home() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const meta = await runQuery(`
          CALL apoc.meta.stats() YIELD labels, relTypes, nodeCount, relCount
          RETURN labels, relTypes, nodeCount, relCount
        `)
        const classes = await runQuery(`MATCH (c:Class) RETURN count(c) AS cnt`)
        const entities = await runQuery(`MATCH (e:LegalEntity) RETURN count(e) AS cnt`)
        setStats({
          nodeCount: meta[0]?.nodeCount || 0,
          relCount: meta[0]?.relCount || 0,
          labels: meta[0]?.labels || {},
          relTypes: meta[0]?.relTypes || {},
          classCount: classes[0]?.cnt || 0,
          entityCount: entities[0]?.cnt || 0,
        })
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const sections = [
    {
      path: '/ontology',
      icon: Database,
      title: 'Ontology Explorer',
      desc: 'Browse the FIBO class hierarchy. See how financial concepts like LegalEntity, Ownership, and Control are modeled as OWL classes with subclass relationships.',
      color: 'text-neo-400',
    },
    {
      path: '/entities',
      icon: Network,
      title: 'Entity Network',
      desc: 'Visualize the counterparty network — 21 legal entities connected by ownership stakes, control relationships, lending, supply chains, and joint ventures.',
      color: 'text-green-400',
    },
    {
      path: '/analytics',
      icon: BarChart3,
      title: 'Graph Analytics',
      desc: 'Run PageRank, Louvain communities, Betweenness Centrality, and Node Similarity powered by Neo4j GDS (Graph Data Science) library.',
      color: 'text-purple-400',
    },
    {
      path: '/contagion',
      icon: Zap,
      title: 'Contagion Simulator',
      desc: 'Simulate systemic risk cascades. Pick an entity and see how default would propagate through the ownership and lending network.',
      color: 'text-amber-400',
    },
    {
      path: '/learning',
      icon: GraduationCap,
      title: 'Learning Center',
      desc: 'Step-by-step tutorials on FIBO ontology, Knowledge Graphs, Neo4j, GDS algorithms, and how everything connects together.',
      color: 'text-red-400',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="gradient-animate rounded-2xl p-8 border border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <Layers className="w-8 h-8 text-neo-400" />
          <h1 className="text-3xl font-bold">FIBO Knowledge Graph Explorer</h1>
        </div>
        <p className="text-gray-300 max-w-3xl leading-relaxed">
          Welcome! This app helps you explore the <strong className="text-neo-300">Financial Industry Business Ontology (FIBO)</strong> — 
          a comprehensive ontology standard for financial entities, published by the EDM Council. 
          You'll learn how ontologies map to knowledge graphs in Neo4j, run graph algorithms, 
          and understand systemic risk through interactive visualizations.
        </p>
        <div className="mt-4 flex gap-4">
          <Link to="/learning" className="inline-flex items-center gap-2 px-4 py-2 bg-neo-600 hover:bg-neo-700 rounded-lg text-sm font-medium transition">
            <GraduationCap className="w-4 h-4" /> Start Learning
          </Link>
          <Link to="/ontology" className="inline-flex items-center gap-2 px-4 py-2 border border-gray-700 hover:border-neo-600 rounded-lg text-sm font-medium transition text-gray-300">
            <Database className="w-4 h-4" /> Explore Ontology
          </Link>
        </div>
      </div>

      {/* Stats */}
      {!loading && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoCard icon={Database} title="Total Nodes" value={stats.nodeCount} subtitle="In Neo4j database" color="neo" />
          <InfoCard icon={Network} title="Relationships" value={stats.relCount} subtitle="Connections between nodes" color="green" />
          <InfoCard icon={Layers} title="FIBO Classes" value={stats.classCount} subtitle="Ontology concepts (T-Box)" color="purple" />
          <InfoCard icon={Zap} title="Entities" value={stats.entityCount} subtitle="Business entities (A-Box)" color="amber" />
        </div>
      )}

      {/* What is FIBO */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6">
        <h2 className="text-xl font-bold mb-3">What is FIBO?</h2>
        <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-300 leading-relaxed">
          <div>
            <p className="mb-3">
              <strong className="text-white">FIBO (Financial Industry Business Ontology)</strong> is a formal ontology standard 
              developed by the EDM Council. It defines financial concepts — from legal entities and ownership structures 
              to securities, contracts, and jurisdictions — in a machine-readable format (OWL/RDF).
            </p>
            <p>
              Think of it as a <em>universal vocabulary</em> for finance. When a bank says "corporate entity" and a regulator 
              says "legal person," FIBO ensures they mean the same thing by providing precise formal definitions.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-2">Key FIBO Modules Loaded:</h3>
            <ul className="space-y-1">
              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-neo-400" /> FND — Foundations (Agreements, Parties)</li>
              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-400" /> BE — Business Entities (Legal Persons, Ownership)</li>
              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-400" /> FBC — Financial Business & Commerce</li>
              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-400" /> SEC — Securities</li>
              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-400" /> LOAN — Loans & Mortgages</li>
              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-400" /> CAE — Corporate Actions & Events</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Architecture Diagram */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6">
        <h2 className="text-xl font-bold mb-4">How This Works — Architecture</h2>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h3 className="font-bold text-neo-300 mb-2">1. Ontology Layer (T-Box)</h3>
            <p className="text-gray-400">FIBO OWL/RDF ontologies loaded via <code className="text-xs bg-gray-700 px-1 rounded">n10s</code> (neosemantics) into Neo4j as <code className="text-xs bg-gray-700 px-1 rounded">:Class</code> nodes with <code className="text-xs bg-gray-700 px-1 rounded">:SCO</code> (subClassOf) relationships.</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h3 className="font-bold text-green-300 mb-2">2. Instance Layer (A-Box)</h3>
            <p className="text-gray-400">21 <code className="text-xs bg-gray-700 px-1 rounded">:LegalEntity</code> instances (banks, holdings, corporations) connected by ownership, control, and lending relationships.</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h3 className="font-bold text-purple-300 mb-2">3. Analytics Layer</h3>
            <p className="text-gray-400">Neo4j GDS runs graph algorithms (PageRank, Louvain, Node2Vec) on the entity network. Results are written back as node properties.</p>
          </div>
        </div>
        <div className="mt-4 text-center text-gray-500 text-xs">
          RDF/OWL → n10s → Neo4j Property Graph → GDS Algorithms → React Visualization
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold">Explore</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map(({ path, icon: Icon, title, desc, color }) => (
            <Link
              key={path}
              to={path}
              className="group bg-gray-900/50 rounded-xl border border-gray-800 p-5 hover:border-gray-600 transition-all duration-200"
            >
              <Icon className={`w-6 h-6 ${color} mb-3`} />
              <h3 className="font-semibold text-white mb-2 group-hover:text-neo-300 transition-colors">
                {title}
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
              <div className="mt-3 flex items-center gap-1 text-xs text-neo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                Open <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
