export type ScreenKey = 'home' | 'list'

export interface PageProps {
  go: (screen: ScreenKey) => void
}

export type Category = '互联网' | '金融' | '实体企业' | '管培生'

export interface Internship {
  id: number
  company: string
  position: string
  salary: string
  location: string
  duration: string
  requirements: string
  category: Category
  tags: string[]
  description: string
  deadline: string
  wechatOfficial: string
  detailLink: string
  applicationLink: string
}
