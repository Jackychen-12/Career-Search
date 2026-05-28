import { PhoneFrame } from './components/PhoneFrame'
import { Home } from './pages/Home'

const features = [
  {
    icon: '🔍',
    bg: 'rgba(79,195,247,0.15)',
    title: '多维度筛选',
    desc: '按行业、城市快速定位目标岗位',
  },
  {
    icon: '📊',
    bg: 'rgba(102,126,234,0.15)',
    title: '实时信息聚合',
    desc: '覆盖互联网、金融、实体企业、快消管培生',
  },
  {
    icon: '⏰',
    bg: 'rgba(229,57,53,0.15)',
    title: '截止日期提醒',
    desc: '紧急标记临近截止的岗位，不错过任何机会',
  },
  {
    icon: '🚀',
    bg: 'rgba(16,185,129,0.15)',
    title: '一键投递',
    desc: '直达官方申请页面，快速投递简历',
  },
]

const badges = ['React 18', 'TypeScript', 'Vite', '实习聚合', '多维筛选', 'GitHub Pages']

export function App() {
  return (
    <div className="landing-layout">
      <div className="landing-info">
        <div className="landing-logo">
          <div className="landing-logo-icon">🔍</div>
          <div className="landing-logo-text">Career-Search</div>
        </div>

        <h1 className="landing-tagline">
          <span>2026暑期实习</span>
          <br />
          一站式信息聚合
        </h1>

        <p className="landing-desc">
          汇集互联网大厂、顶级投行券商、实体科技企业、快消管培生等 20+ 优质暑期实习岗位，
          支持按行业与城市多维筛选，紧急截止提醒，一键直达官方申请通道。
        </p>

        <div className="landing-features">
          {features.map(f => (
            <div className="landing-feature" key={f.title}>
              <div className="landing-feature-icon" style={{ background: f.bg }}>{f.icon}</div>
              <div>
                <div className="landing-feature-title">{f.title}</div>
                <div className="landing-feature-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="landing-badges">
          {badges.map(b => (
            <span className="landing-badge" key={b}>{b}</span>
          ))}
        </div>
      </div>

      <PhoneFrame>
        <Home />
      </PhoneFrame>
    </div>
  )
}
