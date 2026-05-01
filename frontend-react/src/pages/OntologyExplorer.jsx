import { useState, useEffect, useMemo } from 'react'
import { Database, Search, ChevronRight, Info, Layers } from 'lucide-react'
import { runQuery } from '../neo4j'
import GraphViewer from '../components/GraphViewer'

export default function OntologyExplorer() {
  const [classes, setClasses] = useState([])
  const [hierarchy, setHierarchy] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [classDetail, setClassDetail] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('graph') // 'graph' | 'tree'

  useEffect(() => {
    async function load() {
      try {
        // Get all classes
        const cls = await runQuery(`
          MATCH (c:Class)
          OPTIONAL MATCH (c)<-[:SCO]-(sub)
          RETURN c.name AS name, c.uri AS uri,
                 count(sub) AS subclassCount
          ORDER BY subclassCount DESC
        `)
        setClasses(cls)

        // Get hierarchy (SCO = subClassOf)
        const hier = await runQuery(`
          MATCH (child:Class)-[:SCO]->(parent:Class)
          RETURN child.name AS child, parent.name AS parent
        `)
        setHierarchy(hier)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Build graph data for visualization
  const graphData = useMemo(() => {
    if (hierarchy.length === 0) return { nodes: [], links: [] }

    const nodeSet = new Set()
    hierarchy.forEach(h => {
      nodeSet.add(h.child)
      nodeSet.add(h.parent)
    })

    // Color by depth in hierarchy
    const parentMap = {}
    hierarchy.forEach(h => {
      if (!parentMap[h.child]) parentMap[h.child] = []
      parentMap[h.child].push(h.parent)
    })

    // Find root classes (those that are parents but not children)
    const childSet = new Set(hierarchy.map(h => h.child))
    const parentSet = new Set(hierarchy.map(h => h.parent))
    const roots = [...parentSet].filter(p => !childSet.has(p))

    // Compute depth for coloring
    const depthMap = {}
    const queue = roots.map(r => [r, 0])
    while (queue.length > 0) {
      const [node, depth] = queue.shift()
      if (depthMap[node] !== undefined) continue
      depthMap[node] = depth
      hierarchy.filter(h => h.parent === node).forEach(h => queue.push([h.child, depth + 1]))
    }

    const maxDepth = Math.max(...Object.values(depthMap), 1)
    const depthColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899']

    const nodes = [...nodeSet].map(name => ({
      id: name,
      name: name || 'unnamed',
      size: roots.includes(name) ? 8 : (parentSet.has(name) ? 6 : 4),
      color: depthColors[Math.min((depthMap[name] || 0), depthColors.length - 1)],
    }))

    const links = hierarchy.map(h => ({
      source: h.child,
      target: h.parent,
    }))

    return { nodes, links }
  }, [hierarchy])

  const filteredClasses = useMemo(() => {
    if (!searchTerm) return classes.slice(0, 50)
    return classes.filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [classes, searchTerm])

  async function selectClass(name) {
    setSelectedClass(name)
    const detail = await runQuery(`
      MATCH (c:Class {name: $name})
      OPTIONAL MATCH (c)-[:SCO]->(parent:Class)
      OPTIONAL MATCH (c)<-[:SCO]-(child:Class)
      OPTIONAL MATCH (c)-[:DOMAIN]-(prop)
      RETURN c.name AS name, c.uri AS uri, c.comment AS comment,
             collect(DISTINCT parent.name) AS parents,
             collect(DISTINCT child.name) AS children,
             collect(DISTINCT prop.name) AS properties
    `, { name })
    setClassDetail(detail[0] || null)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading ontology...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Database className="w-6 h-6 text-neo-400" />
          Ontology Explorer
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Browse the FIBO class hierarchy loaded into Neo4j via n10s (neosemantics).
          Classes are connected by <code className="text-xs bg-gray-800 px-1 rounded">:SCO</code> (subClassOf) relationships.
        </p>
      </div>

      {/* Explanation Panel */}
      <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-200/80 space-y-2">
            <p><strong>What am I looking at?</strong></p>
            <p>This is the <strong>T-Box</strong> (Terminological Box) — the schema/vocabulary layer of the knowledge graph. 
            Each node is an OWL Class from FIBO. The <code className="bg-blue-900/50 px-1 rounded">:SCO</code> edges represent 
            <code className="bg-blue-900/50 px-1 rounded">rdfs:subClassOf</code> relationships — meaning one concept 
            is a more specific version of another.</p>
            <p>For example: <code className="bg-blue-900/50 px-1 rounded">Corporation → LegalEntity → AutonomousAgent → Thing</code></p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-3 text-center">
          <p className="text-2xl font-bold text-white">{classes.length}</p>
          <p className="text-xs text-gray-400">OWL Classes</p>
        </div>
        <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-3 text-center">
          <p className="text-2xl font-bold text-white">{hierarchy.length}</p>
          <p className="text-xs text-gray-400">SubClassOf Edges</p>
        </div>
        <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-3 text-center">
          <p className="text-2xl font-bold text-white">{new Set(hierarchy.filter(h => !new Set(hierarchy.map(x => x.child)).has(h.parent)).map(h => h.parent)).size}</p>
          <p className="text-xs text-gray-400">Root Classes</p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('graph')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${viewMode === 'graph' ? 'bg-neo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
        >
          Graph View
        </button>
        <button
          onClick={() => setViewMode('tree')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${viewMode === 'tree' ? 'bg-neo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
        >
          List View
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main visualization / list */}
        <div className="lg:col-span-2">
          {viewMode === 'graph' ? (
            <GraphViewer
              graphData={graphData}
              width={700}
              height={500}
              onNodeClick={(node) => selectClass(node.id)}
            />
          ) : (
            <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4 max-h-[500px] overflow-y-auto">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search classes..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-neo-600"
                />
              </div>
              <ul className="space-y-1">
                {filteredClasses.map((c, idx) => (
                  <li key={`${c.name}-${idx}`}>
                    <button
                      onClick={() => selectClass(c.name)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition ${
                        selectedClass === c.name ? 'bg-neo-700/30 text-neo-300' : 'text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Layers className="w-3 h-3 text-gray-500" />
                        {c.name || 'unnamed'}
                      </span>
                      <span className="text-xs text-gray-500">{c.subclassCount} sub</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-neo-400" /> Class Detail
          </h3>
          {classDetail ? (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Name</p>
                <p className="text-white font-medium">{classDetail.name}</p>
              </div>
              {classDetail.uri && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">URI</p>
                  <p className="text-neo-300 text-xs break-all">{classDetail.uri}</p>
                </div>
              )}
              {classDetail.comment && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Description</p>
                  <p className="text-gray-300">{classDetail.comment}</p>
                </div>
              )}
              {classDetail.parents?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Parent Classes (superClassOf)</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {classDetail.parents.filter(Boolean).map(p => (
                      <button
                        key={p}
                        onClick={() => selectClass(p)}
                        className="px-2 py-0.5 bg-purple-900/30 border border-purple-700/40 rounded text-xs text-purple-300 hover:bg-purple-900/50"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {classDetail.children?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Child Classes (subClassOf this)</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {classDetail.children.filter(Boolean).map(c => (
                      <button
                        key={c}
                        onClick={() => selectClass(c)}
                        className="px-2 py-0.5 bg-green-900/30 border border-green-700/40 rounded text-xs text-green-300 hover:bg-green-900/50"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {classDetail.properties?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Properties</p>
                  <ul className="mt-1 space-y-0.5">
                    {classDetail.properties.filter(Boolean).map(p => (
                      <li key={p} className="text-xs text-gray-300 flex items-center gap-1">
                        <ChevronRight className="w-3 h-3 text-gray-600" /> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Click a class in the graph or list to see details.</p>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
        <h3 className="font-semibold text-white mb-3">Understanding the Graph Colors</h3>
        <div className="flex flex-wrap gap-4 text-xs">
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500" /> Root classes (depth 0)</span>
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-500" /> Depth 1</span>
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-500" /> Depth 2</span>
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500" /> Depth 3</span>
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-cyan-500" /> Depth 4</span>
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500" /> Depth 5+</span>
        </div>
        <p className="text-gray-500 text-xs mt-2">
          Larger nodes have more subclasses. Arrows point from child → parent (subClassOf direction).
        </p>
      </div>
    </div>
  )
}
