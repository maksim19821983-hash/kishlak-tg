import { create } from 'zustand'

export type Polarity = 'paper' | 'dark'

type PolarityState = {
  mode: Polarity
  setMode: (mode: Polarity) => void
}

function apply(mode: Polarity): void {
  document.documentElement.dataset.polarity = mode
}

export const usePolarity = create<PolarityState>((set) => ({
  mode: 'paper',
  setMode: (mode) => {
    apply(mode)
    set({ mode })
  },
}))

apply(usePolarity.getState().mode)
