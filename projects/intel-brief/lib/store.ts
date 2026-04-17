import fs from 'fs'
import path from 'path'
import { Profile } from './types'

const DATA_DIR = path.join(process.cwd(), 'data')
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json')

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

export function readProfiles(): Profile[] {
  ensureDataDir()
  if (!fs.existsSync(PROFILES_FILE)) return []
  return JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf-8'))
}

export function writeProfiles(profiles: Profile[]) {
  ensureDataDir()
  fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2))
}

export function getProfile(id: string): Profile | null {
  return readProfiles().find(p => p.id === id) ?? null
}

export function saveProfile(profile: Profile) {
  const profiles = readProfiles()
  const idx = profiles.findIndex(p => p.id === profile.id)
  if (idx === -1) profiles.push(profile)
  else profiles[idx] = profile
  writeProfiles(profiles)
}
