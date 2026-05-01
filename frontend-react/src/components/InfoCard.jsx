export default function InfoCard({ icon: Icon, title, value, subtitle, color = 'neo' }) {
  const colorMap = {
    neo: 'bg-neo-700/20 border-neo-700/40 text-neo-300',
    green: 'bg-green-700/20 border-green-700/40 text-green-300',
    purple: 'bg-purple-700/20 border-purple-700/40 text-purple-300',
    amber: 'bg-amber-700/20 border-amber-700/40 text-amber-300',
    red: 'bg-red-700/20 border-red-700/40 text-red-300',
  }

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className="w-4 h-4" />}
        <span className="text-xs font-medium uppercase tracking-wide opacity-80">{title}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-xs mt-1 opacity-60">{subtitle}</p>}
    </div>
  )
}
