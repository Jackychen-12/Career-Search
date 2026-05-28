import { categories, locations } from '../data/internships'

interface FilterBarProps {
  currentCategory: string
  currentLocation: string
  onCategoryChange: (cat: string) => void
  onLocationChange: (loc: string) => void
}

export function FilterBar({ currentCategory, currentLocation, onCategoryChange, onLocationChange }: FilterBarProps) {
  return (
    <div className="filter-bar">
      <h3>筛选</h3>
      <div className="filter-section">
        <div className="filter-label">领域</div>
        <div className="filter-group">
          <button
            className={`filter-btn ${currentCategory === 'all' ? 'active' : ''}`}
            onClick={() => onCategoryChange('all')}
          >
            全部
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              className={`filter-btn ${currentCategory === cat ? 'active' : ''}`}
              onClick={() => onCategoryChange(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      <div className="filter-section">
        <div className="filter-label">地区</div>
        <div className="filter-group">
          <button
            className={`filter-btn ${currentLocation === 'all' ? 'active' : ''}`}
            onClick={() => onLocationChange('all')}
          >
            全部
          </button>
          {locations.map(loc => (
            <button
              key={loc}
              className={`filter-btn ${currentLocation === loc ? 'active' : ''}`}
              onClick={() => onLocationChange(loc)}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
