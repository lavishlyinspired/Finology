import { useState, useEffect, useMemo } from 'react'
import { Network, Filter, Info } from 'lucide-react'
import { runQuery } from '../neo4j'
import GraphViewer from '../components/GraphViewer'

const REL_COLORS = {
  HAS_OWNERSHIP_IN: '#38bdf8',
  HAS_CONTROLLING_PARTY: '#f87171',
  LENDS_TO: '#fbbf24',
  SUPPLIES_TO: '#fb923c',
  JOINT_VENTURE: '#a3e635',
  INCORPORATED_IN: '#a78bfa',
  OPERATES_IN: '#67e8f9',
  REGULATED_BY: '#f472b6',
}

const JURIS_COLORS = {
  US: '#3b82f6',
  UK: '#f97316',
  DE: '#22c55e',
  SG: '#ef4444',
  KY: '#a855f7',
}

export default function EntityNetwork() {
  const [entities, setEntities] = useState([])
  const [relationships, setRelationships] = useState([])
  const [selectedEntity, setSelectedEntity] = useState(null)
  const [entityDetail, setEntityDetail] = useState(null)
  const [activeRels, setActiveRels] = useState(new Set(Object.keys(REL_COLORS)))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const ents = await runQuery(`
          MATCH (e:LegalEntity)
          OPTIONAL MATCH (e)-[:INCORPORATED_IN]->(j:Jurisdiction)
          RETURN e.name AS name, labels(e) AS labels, 
                 j.name AS jurisdiction, e.jurisdictionCode AS jurCode,
                 e.systemicScore AS pagerank, e.communityId AS community
        `)
        setEntities(ents)

        const rels = await runQuery(`
          MATCH (a:LegalEntity)-[r]->(b:LegalEntity)
          RETURN a.name AS source, b.name AS target, type(r) AS type,
                 r.percent AS percent, r.exposure_musd AS exposure
        `)
        setRelationships(rels)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const graphData = useMemo(() => {
    const filteredRels = relationships.filter(r => activeRels.has(r.type))
    const connectedNodes = new Set()
    filteredRels.forEach(r => { connectedNodes.add(r.source); connectedNodes.add(r.target) })

    const nodes = entities
      .filter(e => connectedNodes.has(e.name) || activeRels.size === Object.keys(REL_COLORS).length)
      .map(e => ({
        id: e.name,
        name: e.name,
        color: JURIS_COLORS[e.jurCode] || '#6b7280',
        size: 4 + (e.pagerank || 0) * 30,
        community: e.community,
        jurisdiction: e.jurisdiction,
      }))

    const links = filteredRels.map(r => ({
      source: r.source,
      target: r.target,
      color: REL_COLORS[r.type] || '#4b5563',
      label: r.type,
      percent: r.percent,
      exposure: r.exposure,
    }))

    return { nodes, links }
  }, [entities, relationships, activeRels])

  function toggleRel(rel) {
    setActiveRels(prev => {
      const next = new Set(prev)
      if (next.has(rel)) next.delete(rel)
      else next.add(rel)
      return next
    })
  }

  async function handleNodeClick(node) {
    setSelectedEntity(node.id)
    const detail = await runQuery(`
      MATCH (e:LegalEntity {name: $name})
      OPTIONAL MATCH (e)-[:INCORPORATED_IN]->(j:Jurisdiction)
      OPTIONAL MATCH (e)-[o:HAS_OWNERSHIP_IN]->(target:LegalEntity)
      OPTIONAL MATCH (owner:LegalEntity)-[oi:HAS_OWNERSHIP_IN]->(e)
      OPTIONAL MATCH (e)-[l:LENDS_TO]->(borrower:LegalEntity)
      RETURN e.name AS name, labels(e) AS labels, j.name AS jurisdiction,
             e.systemicScore AS pagerank, e.communityId AS community,
             e.betweennessCentrality AS betweenness,
             collect(DISTINCT {entity: target.name, pct: o.percent}) AS ownsIn,
             collect(DISTINCT {entity: owner.name, pct: oi.percent}) AS ownedBy,
             collect(DISTINCT {entity: borrower.name, exposure: l.exposure_musd}) AS lendsTo
    `, { name: node.id })
    setEntityDetail(detail[0] || null)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading entities...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Network className="w-6 h-6 text-green-400" />
          Entity Network
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Interactive visualization of {entities.length} legal entities and their relationships.
          Nodes are colored by jurisdiction, sized by systemic importance (PageRank).
        </p>
      </div>

      {/* Explanation */}
      <div className="bg-green-900/20 border border-green-800/40 rounded-xl p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
          <div className="text-sm text-green-200/80 space-y-2">
            <p><strong>What am I looking at?</strong></p>
            <p>This is the <strong>A-Box</strong> (Assertion Box) — actual business entity instances.
            These are the "real" entities modeled according to FIBO ontology classes. 
            Each entity has a type (Bank, Holding, Corporation) and relationships like ownership stakes, 
            control chains, lending exposure, supply relationships, and joint ventures.</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Filters */}
        <div className="space-y-4">
          <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Filter className="w-4 h-4" /> Relationship Filters
            </h3>
            <div className="space-y-2">
              {Object.entries(REL_COLORS).map(([rel, color]) => (
                <label key={rel} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeRels.has(rel)}
                    onChange={() => toggleRel(rel)}
                    className="rounded border-gray-600"
                  />
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs text-gray-300">{rel.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
            <h3 className="font-semibold text-white mb-3">Jurisdiction Legend</h3>
            <div className="space-y-2">
              {Object.entries(JURIS_COLORS).map(([code, color]) => (
                <div key={code} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs text-gray-300">{code}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Graph */}
        <div className="lg:col-span-2">
          <GraphViewer
            graphData={graphData}
            width={600}
            height={500}
            onNodeClick={handleNodeClick}
          />
        </div>

        {/* Entity Detail */}
        <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
          <h3 className="font-semibold text-white mb-3">Entity Detail</h3>
          {entityDetail ? (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">Name</p>
                <p className="text-white font-medium">{entityDetail.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Type</p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {entityDetail.labels?.filter(l => l !== 'LegalEntity').map(l => (
                    <span key={l} className="px-2 py-0.5 bg-neo-900/40 border border-neo-700/40 rounded text-xs text-neo-300">{l}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Jurisdiction</p>
                <p className="text-gray-300">{entityDetail.jurisdiction || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">PageRank (Systemic Score)</p>
                <p className="text-amber-300 font-mono">{entityDetail.pagerank?.toFixed(4) || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Community ID</p>
                <p className="text-purple-300">{entityDetail.community ?? 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Betweenness</p>
                <p className="text-cyan-300 font-mono">{entityDetail.betweenness?.toFixed(3) || 'N/A'}</p>
              </div>

              {entityDetail.ownsIn?.filter(o => o.entity).length > 0 && (
                <div>
                  <p className="text-xs text-gray-500">Owns stake in →</p>
                  <ul className="mt-1 space-y-0.5">
                    {entityDetail.ownsIn.filter(o => o.entity).map(o => (
                      <li key={o.entity} className="text-xs text-blue-300">
                        {o.entity} ({o.pct}%)
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {entityDetail.ownedBy?.filter(o => o.entity).length > 0 && (
                <div>
                  <p className="text-xs text-gray-500">Owned by ←</p>
                  <ul className="mt-1 space-y-0.5">
                    {entityDetail.ownedBy.filter(o => o.entity).map(o => (
                      <li key={o.entity} className="text-xs text-green-300">
                        {o.entity} ({o.pct}%)
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {entityDetail.lendsTo?.filter(l => l.entity).length > 0 && (
                <div>
                  <p className="text-xs text-gray-500">Lends to →</p>
                  <ul className="mt-1 space-y-0.5">
                    {entityDetail.lendsTo.filter(l => l.entity).map(l => (
                      <li key={l.entity} className="text-xs text-yellow-300">
                        {l.entity} (${l.exposure}M)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Click an entity node to see details.</p>
          )}
        </div>
      </div>
    </div>
  )
}
