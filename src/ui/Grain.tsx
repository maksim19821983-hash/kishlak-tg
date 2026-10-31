import { usePolarity } from '@/app/polarity'

export function Grain() {
  const mode = usePolarity((s) => s.mode)
  return <div aria-hidden="true" className={`grain grain--${mode}`} />
}
