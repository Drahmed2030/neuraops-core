export type Lang = 'ar' | 'en'
export type ThemeMode = 'dark' | 'light'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface HealthState {
  status: 'idle' | 'checking' | 'ok' | 'error'
  text: string
}
