import { useState, useEffect } from 'react'
import { BarChart3, Info, Play } from 'lucide-react'
import { runQuery } from '../neo4j'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, Cell
} from 'recharts'

const ALGO_TABS = [
  { id: 'pagerank', label: 'PageRank', desc: 'Measures systemic importance — entities that many others depend on get high scores.' },
  { id: 'louvain', label: 'Louvain', desc: 'Community detection — groups entities that are more densely connected to each other.' },
  { id: 'betweenness', label: 'Betweenness', desc: 'Identifies bridge entities — those that sit on many shortest paths between other entities.' },
  { id: 'similarity', label: 'Node Similarity', desc: 'Finds structurally similar entities — those connected to the same neighbors (Jaccard).' },
  { id: 'wcc', label: 'WCC', desc: 'Weakly Connected Components — identifies isolated groups in the network.' },
  { id: 'degree', label: 'Degree', desc: 'Simple connection count — how many relationships each entity has.' },
]

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('pagerank')
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(false)
  const [projected, setProjected] = useState(false)

  async function projectGraph() {
    setLoading(true)
    try {
      try { await runQuery("CALL gds.graph.drop('counterparty_ml') YIELD graphName RETURN graphName") } catch {}
      await runQuery(`
        CALL gds.graph.project(
          'counterparty_ml',
          ['LegalEntity','Bank','Holding','Corporation'],
          {
            HAS_OWNERSHIP_IN:      { orientation: 'NATURAL', properties: ['weight'] },
            HAS_CONTROLLING_PARTY: { orientation: 'NATURAL' },
            LENDS_TO:              { orientation: 'NATURAL', properties: ['exposure_musd'] },
            SUPPLIES_TO:           { orientation: 'NATURAL' },
            JOINT_VENTURE:         { orientation: 'NATURAL' }
          }
        ) YIELD graphName, nodeCount, relationshipCount
        RETURN graphName, nodeCount, relationshipCount
      `)
      setProjected(true)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function runAlgorithm(algo) {
    if (data[algo]) { setActiveTab(algo); return }
    setLoading(true)
    try {
      let result
      switch (algo) {
        case 'pagerank':
          result = await runQuery(`
            CALL gds.pageRank.stream('counterparty_ml', {
              relationshipTypes: ['HAS_CONTROLLING_PARTY'],
              maxIterations: 30, dampingFactor: 0.85
            }) YIELD nodeId, score
            WITH gds.util.asNode(nodeId) AS n, score
            RETURN n.name AS name, round(score * 10000) / 10000 AS score
            ORDER BY score DESC
          `)
          break
        case 'louvain':
          result = await runQuery(`
            CALL gds.louvain.stream('counterparty_ml', {
              relationshipTypes: ['HAS_OWNERSHIP_IN'],
              relationshipWeightProperty: 'weight'
            }) YIELD nodeId, communityId
            WITH gds.util.asNode(nodeId) AS n, communityId
            RETURN n.name AS name, communityId
            ORDER BY communityId, name
          `)
          break
        case 'betweenness':
          result = await runQuery(`
            CALL gds.betweenness.stream('counterparty_ml') YIELD nodeId, score
            WITH gds.util.asNode(nodeId) AS n, score
            RETURN n.name AS name, round(score * 1000) / 1000 AS score
            ORDER BY score DESC
          `)
          break
        case 'similarity':
          result = await runQuery(`
            CALL gds.nodeSimilarity.stream('counterparty_ml', {
              similarityCutoff: 0.1, topK: 5
            }) YIELD node1, node2, similarity
            WITH gds.util.asNode(node1) AS a, gds.util.asNode(node2) AS b, similarity
            RETURN a.name AS entity1, b.name AS entity2, round(similarity * 1000) / 1000 AS similarity
            ORDER BY similarity DESC LIMIT 20
          `)
          break
        case 'wcc':
          result = await runQuery(`
            CALL gds.wcc.stream('counterparty_ml') YIELD nodeId, componentId
            WITH gds.util.asNode(nodeId) AS n, componentId
            RETURN n.name AS name, componentId
            ORDER BY componentId, name
          `)
          break
        case 'degree':
          result = await runQuery(`
            CALL gds.degree.stream('counterparty_ml') YIELD nodeId, score
            WITH gds.util.asNode(nodeId) AS n, score
            RETURN n.name AS name, score AS degree
            ORDER BY degree DESC
          `)
          break
      }
      setData(prev => ({ ...prev, [algo]: result }))
      setActiveTab(algo)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function renderChart() {
    const current = data[activeTab]
    if (!current) return <p className="text-gray-500 text-center py-12">Click "Run" to execute this algorithm.</p>

    switch (activeTab) {
      case 'pagerank':
      case 'betweenness':
      case 'degree':
        const scoreKey = activeTab === 'degree' ? 'degree' : 'score'
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={current} layout="vertical" margin={{ left: 100, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} />
              <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={90} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
              <Bar dataKey={scoreKey} fill={activeTab === 'pagerank' ? '#ef4444' : activeTab === 'betweenness' ? '#3b82f6' : '#22c55e'} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )
      case 'louvain':
        const communities = {}
        current.forEach(r => {
          if (!communities[r.communityId]) communities[r.communityId] = []
          communities[r.communityId].push(r.name)
        })
        const commColors = ['#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#f97316', '#06b6d4', '#ec4899', '#84cc16']
        return (
          <div className="space-y-3">
            {Object.entries(communities).map(([cid, members], idx) => (
              <div key={cid} className="bg-gray-800/50 rounded-lg p-3 border-l-4" style={{ borderColor: commColors[idx % commColors.length] }}>
                <p className="text-sm font-medium text-white mb-1">Community {cid} ({members.length} members)</p>
                <div className="flex flex-wrap gap-1">
                  {members.map(m => (
                    <span key={m} className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">{m}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      case 'similarity':
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 text-gray-400">Entity 1</th>
                  <th className="text-left py-2 text-gray-400">Entity 2</th>
                  <th className="text-right py-2 text-gray-400">Similarity</th>
                </tr>
              </thead>
              <tbody>
                {current.map((row, i) => (
                  <tr key={i} className="border-b border-gray-800">
                    <td className="py-2 text-white">{row.entity1}</td>
                    <td className="py-2 text-white">{row.entity2}</td>
                    <td className="py-2 text-right">
                      <span className="px-2 py-0.5 bg-neo-900/40 border border-neo-700/40 rounded text-xs text-neo-300">
                        {row.similarity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      case 'wcc':
        const components = {}
        current.forEach(r => {
          if (!components[r.componentId]) components[r.componentId] = []
          components[r.componentId].push(r.name)
        })
        return (
          <div className="space-y-3">
            {Object.entries(components).map(([cid, members]) => (
              <div key={cid} className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-sm font-medium text-white mb-1">Component {cid} ({members.length} members)</p>
                <div className="flex flex-wrap gap-1">
                  {members.map(m => (
                    <span key={m} className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">{m}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-purple-400" />
          Graph Analytics (Neo4j GDS)
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Run graph algorithms on the entity network using Neo4j Graph Data Science library.
        </p>
      </div>

      {/* Explanation */}
      <div className="bg-purple-900/20 border border-purple-800/40 rounded-xl p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
          <div className="text-sm text-purple-200/80 space-y-2">
            <p><strong>How GDS Works:</strong></p>
            <p>1. <strong>Project</strong> — Copy a subgraph from Neo4j into an in-memory graph (faster computation).<br/>
            2. <strong>Run Algorithm</strong> — Execute centrality, community detection, or similarity algorithms.<br/>
            3. <strong>Stream/Write</strong> — Get results back as a stream or write them as node properties.</p>
            <p>The projected graph includes: LegalEntity nodes + HAS_OWNERSHIP_IN, HAS_CONTROLLING_PARTY, LENDS_TO, SUPPLIES_TO, JOINT_VENTURE relationships.</p>
          </div>
        </div>
      </div>

      {/* Project Button */}
      {!projected && (
        <button
          onClick={projectGraph}
          disabled={loading}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 rounded-lg text-sm font-medium transition flex items-center gap-2"
        >
          <Play className="w-4 h-4" />
          {loading ? 'Projecting...' : 'Step 1: Project Graph into GDS'}
        </button>
      )}

      {projected && (
        <>
          {/* Algorithm Tabs */}
          <div className="flex flex-wrap gap-2">
            {ALGO_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => runAlgorithm(tab.id)}
                disabled={loading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {tab.label}
                {data[tab.id] && <span className="ml-1 text-xs opacity-60">✓</span>}
              </button>
            ))}
          </div>

          {/* Description */}
          <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-3">
            <p className="text-sm text-gray-300">
              <strong className="text-white">{ALGO_TABS.find(t => t.id === activeTab)?.label}:</strong>{' '}
              {ALGO_TABS.find(t => t.id === activeTab)?.desc}
            </p>
          </div>

          {/* Results */}
          <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6">
            {loading ? (
              <p className="text-gray-500 text-center py-12">Running algorithm...</p>
            ) : (
              renderChart()
            )}
          </div>
        </>
      )}
    </div>
  )
}
