import { useState, useEffect, useMemo } from 'react'
import { Zap, Info, Play, AlertTriangle } from 'lucide-react'
import { runQuery } from '../neo4j'
import GraphViewer from '../components/GraphViewer'

export default function Contagion() {
  const [entities, setEntities] = useState([])
  const [selectedSeed, setSelectedSeed] = useState('')
  const [cascadeResults, setCascadeResults] = useState(null)
  const [cascadeEdges, setCascadeEdges] = useState([])
  const [loading, setLoading] = useState(false)
  const [maxHops, setMaxHops] = useState(3)

  useEffect(() => {
    async function load() {
      const ents = await runQuery(`
        MATCH (e:LegalEntity) RETURN e.name AS name ORDER BY name
      `)
      setEntities(ents)
      if (ents.length > 0) setSelectedSeed(ents[0].name)
    }
    load()
  }, [])

  async function simulate() {
    if (!selectedSeed) return
    setLoading(true)
    try {
      const cascade = await runQuery(`
        MATCH path = (start:LegalEntity {name: $seed})-[:HAS_CONTROLLING_PARTY|HAS_OWNERSHIP_IN|LENDS_TO*1..${maxHops}]->(affected:LegalEntity)
        WHERE affected <> start
        RETURN DISTINCT affected.name AS affected_entity, min(length(path)) AS hops
        ORDER BY hops
      `, { seed: selectedSeed })
      setCascadeResults(cascade)

      const edges = await runQuery(`
        MATCH (start:LegalEntity {name: $seed})-[r:HAS_CONTROLLING_PARTY|HAS_OWNERSHIP_IN|LENDS_TO]->(next:LegalEntity)
        RETURN start.name AS src, next.name AS tgt, type(r) AS rel
        UNION
        MATCH (start:LegalEntity {name: $seed})-[:HAS_CONTROLLING_PARTY|HAS_OWNERSHIP_IN|LENDS_TO]->(mid:LegalEntity)
              -[r2:HAS_CONTROLLING_PARTY|HAS_OWNERSHIP_IN|LENDS_TO]->(next2:LegalEntity)
        WHERE next2 <> start
        RETURN mid.name AS src, next2.name AS tgt, type(r2) AS rel
        UNION
        MATCH (start:LegalEntity {name: $seed})-[:HAS_CONTROLLING_PARTY|HAS_OWNERSHIP_IN|LENDS_TO*2]->(mid2:LegalEntity)
              -[r3:HAS_CONTROLLING_PARTY|HAS_OWNERSHIP_IN|LENDS_TO]->(next3:LegalEntity)
        WHERE next3 <> start AND next3 <> mid2
        RETURN mid2.name AS src, next3.name AS tgt, type(r3) AS rel
      `, { seed: selectedSeed })
      setCascadeEdges(edges)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const graphData = useMemo(() => {
    if (!cascadeResults || cascadeEdges.length === 0) return { nodes: [], links: [] }

    const nodeSet = new Set([selectedSeed])
    cascadeEdges.forEach(e => { nodeSet.add(e.src); nodeSet.add(e.tgt) })

    const hopMap = { [selectedSeed]: 0 }
    cascadeResults.forEach(r => { hopMap[r.affected_entity] = r.hops })

    const hopColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4']

    const nodes = [...nodeSet].map(name => ({
      id: name,
      name,
      color: name === selectedSeed ? '#ef4444' : hopColors[Math.min(hopMap[name] || 1, hopColors.length - 1)],
      size: name === selectedSeed ? 10 : 6,
    }))

    const relColors = {
      HAS_OWNERSHIP_IN: '#38bdf8',
      HAS_CONTROLLING_PARTY: '#f87171',
      LENDS_TO: '#fbbf24',
    }

    const links = cascadeEdges.map(e => ({
      source: e.src,
      target: e.tgt,
      color: relColors[e.rel] || '#4b5563',
    }))

    return { nodes, links }
  }, [cascadeResults, cascadeEdges, selectedSeed])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Zap className="w-6 h-6 text-amber-400" />
          Contagion Simulator
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Simulate systemic risk cascades — what happens when an entity defaults?
        </p>
      </div>

      {/* Explanation */}
      <div className="bg-amber-900/20 border border-amber-800/40 rounded-xl p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200/80 space-y-2">
            <p><strong>How Contagion Simulation Works:</strong></p>
            <p>Starting from a selected entity, we trace all paths through ownership, control, and lending 
            relationships up to N hops. Each entity reachable along these paths could be "affected" by a 
            default cascade — if Entity A owns 60% of Entity B, and A defaults, B is likely impacted.</p>
            <p>This is a simplified model of <strong>systemic risk propagation</strong> used in financial regulation 
            (e.g., Basel III stress testing).</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4 bg-gray-900/50 rounded-xl border border-gray-800 p-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Seed Entity (defaults first)</label>
          <select
            value={selectedSeed}
            onChange={e => setSelectedSeed(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neo-600"
          >
            {entities.map(e => <option key={e.name} value={e.name}>{e.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Max Hops</label>
          <select
            value={maxHops}
            onChange={e => setMaxHops(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neo-600"
          >
            {[1, 2, 3, 4, 5].map(h => <option key={h} value={h}>{h} hops</option>)}
          </select>
        </div>
        <button
          onClick={simulate}
          disabled={loading}
          className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-700 rounded-lg text-sm font-medium transition flex items-center gap-2"
        >
          <Play className="w-4 h-4" />
          {loading ? 'Simulating...' : 'Simulate Cascade'}
        </button>
      </div>

      {/* Results */}
      {cascadeResults && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <GraphViewer
              graphData={graphData}
              width={650}
              height={450}
            />
          </div>
          <div className="space-y-4">
            <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h3 className="font-semibold text-white">Cascade Impact</h3>
              </div>
              <p className="text-3xl font-bold text-red-400">{cascadeResults.length}</p>
              <p className="text-xs text-gray-400">entities affected within {maxHops} hops</p>
            </div>

            <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
              <h3 className="font-semibold text-white mb-3">Affected Entities</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {cascadeResults.map(r => (
                  <div key={r.affected_entity} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{r.affected_entity}</span>
                    <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-400">
                      hop {r.hops}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
              <h3 className="font-semibold text-white mb-2">Color Legend</h3>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500" /> Seed (default origin)</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-500" /> Hop 1 (direct exposure)</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-500" /> Hop 2</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500" /> Hop 3</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-cyan-500" /> Hop 4+</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
