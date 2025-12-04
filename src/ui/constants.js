import { Image, Mic, Table } from 'lucide-react'

export const NOTE_MODES = {
  CREATE: 'create',
  EDIT: 'edit'
}

export const EDITOR_TOOLBAR_ACTIONS = [
  {
    key: 'audio',
    label: 'Record audio',
    Icon: Mic,
    message: 'Audio capture tools coming soon.'
  },
  {
    key: 'media',
    label: 'Insert media',
    Icon: Image,
    message: 'Media embedding tools coming soon.'
  },
  {
    key: 'table',
    label: 'Insert markdown table',
    Icon: Table,
    message: 'Markdown table helpers coming soon.'
  }
]

export const FONT_STYLES = ['system', 'serif', 'mono']
export const THEME_SEQUENCE = ['neon', 'minimal', 'cupertino', 'pink', 'purple']

export const AUTO_SAVE_DELAY_MS = 800
export const NOTES_AUTO_REFRESH_INTERVAL_MS = 30000
export const WIKI_MENU_MAX_RESULTS = 8

