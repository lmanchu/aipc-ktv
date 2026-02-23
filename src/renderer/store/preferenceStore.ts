import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface AppPreferences {
  persistQueue: boolean
}

interface PreferenceActions {
  setQueuePersistence: (enabled: boolean) => void
  getPreferences: () => AppPreferences
}

interface PreferenceStore extends AppPreferences, PreferenceActions {}

export const usePreferenceStore = create<PreferenceStore>()(
  devtools(
    (set, get) => ({
      persistQueue: false,

      setQueuePersistence: (enabled: boolean) =>
        set(
          { persistQueue: enabled },
          false,
          'setQueuePersistence'
        ),

      getPreferences: () => {
        const state = get()
        return {
          persistQueue: state.persistQueue,
        }
      },
    }),
    {
      name: 'preference-store',
    }
  )
)
