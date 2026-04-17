export interface Source {
  id: string
  url: string
  label: string
}

export interface Citation {
  index: number
  url: string
  label: string
  excerpt: string
}

export interface Briefing {
  id: string
  content: string
  citations: Citation[]
  createdAt: string
}

export interface Profile {
  id: string
  topic: string
  sources: Source[]
  briefings: Briefing[]
  createdAt: string
}
