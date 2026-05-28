export function StatCard({ num, label }: { num: number; label: string }) {
  return (
    <div className="stat-chip">
      <div className="num">{num}</div>
      <div className="lbl">{label}</div>
    </div>
  )
}
