import { NavLink } from 'react-router-dom'
import {
  Home, Network, Database, BarChart3, Zap, GraduationCap, Circle
} from 'lucide-react'

const navItems = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/ontology', icon: Database, label: 'Ontology Explorer' },
  { path: '/entities', icon: Network, label: 'Entity Network' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/contagion', icon: Zap, label: 'Contagion Sim' },
  { path: '/learning', icon: GraduationCap, label: 'Learning Center' },
]

export default function Sidebar() {
  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-neo-600 flex items-center justify-center">
            <Network className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">FIBO Explorer</h1>
            <p className="text-[10px] text-gray-400">Knowledge Graph Studio</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-neo-700/30 text-neo-300 border border-neo-700/50'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Connection Status */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Circle className="w-2 h-2 fill-green-500 text-green-500" />
          <span>Neo4j Connected</span>
        </div>
        <p className="text-[10px] text-gray-600 mt-1">neo4j://127.0.0.1:7687</p>
      </div>
    </aside>
  )
}
