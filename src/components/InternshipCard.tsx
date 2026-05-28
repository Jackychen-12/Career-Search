import type { Internship } from '../types'

function isUrgent(deadline: string): boolean {
  const today = new Date()
  const d = new Date(deadline)
  const days = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return days <= 15
}

export function InternshipCard({ item }: { item: Internship }) {
  return (
    <div className="intern-card">
      <div className="card-top">
        <div>
          <div className="card-company">{item.company}</div>
          <div className="card-position">{item.position}</div>
        </div>
        <div className="card-salary">{item.salary}</div>
      </div>

      <div className="card-desc">{item.description}</div>

      <div className="card-meta">
        <span>{item.location}</span>
        <span>{item.duration}</span>
        <span>{item.requirements}</span>
        <span className={`card-deadline ${isUrgent(item.deadline) ? 'urgent' : ''}`}>
          截止: {item.deadline}
        </span>
      </div>

      <div className="card-wechat">
        <span>公众号: {item.wechatOfficial}</span>
      </div>

      <div className="card-links">
        <a href={item.detailLink} target="_blank" rel="noreferrer" className="link-detail">
          查看详情
        </a>
        <a href={item.applicationLink} target="_blank" rel="noreferrer" className="link-apply">
          投递简历
        </a>
      </div>

      <div className="card-tags">
        <span className="tag category">{item.category}</span>
        {item.tags.map(tag => (
          <span key={tag} className={`tag ${tag === '暑期实习' || tag === '大厂' || tag === '暑期项目' ? 'highlight' : ''}`}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}
