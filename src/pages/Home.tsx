import { useState } from 'react'
import { internships } from '../data/internships'
import { StatCard } from '../components/StatCard'
import { FilterBar } from '../components/FilterBar'
import { InternshipCard } from '../components/InternshipCard'

export function Home() {
  const [category, setCategory] = useState('all')
  const [location, setLocation] = useState('all')

  const filtered = internships.filter(item => {
    if (category !== 'all' && item.category !== category) return false
    if (location !== 'all' && !item.location.includes(location)) return false
    return true
  })

  const stats = {
    total: internships.length,
    beijing: internships.filter(i => i.location.includes('北京')).length,
    shanghai: internships.filter(i => i.location.includes('上海')).length,
    gz: internships.filter(i => i.location.includes('深圳') || i.location.includes('广州')).length,
    hk: internships.filter(i => i.location.includes('香港')).length,
  }

  return (
    <>
      <div className="app-header">
        <h1>2026暑期实习聚合</h1>
        <p>金融 · 互联网 · 实体企业 · 管培生</p>
      </div>

      <div className="stats-row">
        <StatCard num={stats.total} label="总岗位" />
        <StatCard num={stats.beijing} label="北京" />
        <StatCard num={stats.shanghai} label="上海" />
        <StatCard num={stats.gz} label="广深" />
        <StatCard num={stats.hk} label="香港" />
      </div>

      <FilterBar
        currentCategory={category}
        currentLocation={location}
        onCategoryChange={setCategory}
        onLocationChange={setLocation}
      />

      <div className="card-list">
        {filtered.length === 0 ? (
          <div className="no-result">暂无符合条件的实习信息</div>
        ) : (
          filtered.map(item => <InternshipCard key={item.id} item={item} />)
        )}
      </div>
    </>
  )
}
