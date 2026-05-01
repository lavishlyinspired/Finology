import { useRef, useEffect, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'

export default function GraphViewer({ graphData, width, height, onNodeClick, nodeLabel, nodeColor, linkColor, linkWidth }) {
  const fgRef = useRef()

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('charge').strength(-200)
      fgRef.current.d3Force('link').distance(80)
    }
  }, [])

  const handleNodeClick = useCallback((node) => {
    if (onNodeClick) onNodeClick(node)
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 500)
      fgRef.current.zoom(2, 500)
    }
  }, [onNodeClick])

  return (
    <div className="rounded-xl overflow-hidden border border-gray-800 bg-gray-900/50">
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        width={width || 800}
        height={height || 500}
        backgroundColor="#0f172a"
        nodeLabel={nodeLabel || 'name'}
        nodeColor={nodeColor || (() => '#338dff')}
        nodeRelSize={6}
        linkColor={linkColor || (() => '#334155')}
        linkWidth={linkWidth || 1}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        onNodeClick={handleNodeClick}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.name || node.id
          const fontSize = 11 / globalScale
          ctx.font = `${fontSize}px Inter, sans-serif`

          // Node circle
          const size = node.size || 5
          ctx.beginPath()
          ctx.arc(node.x, node.y, size, 0, 2 * Math.PI)
          ctx.fillStyle = node.color || '#338dff'
          ctx.fill()
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 0.5
          ctx.stroke()

          // Label
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          ctx.fillStyle = '#e2e8f0'
          ctx.fillText(label, node.x, node.y + size + 2)
        }}
      />
    </div>
  )
}
