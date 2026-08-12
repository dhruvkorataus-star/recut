import { Check, Loader2 } from 'lucide-react'
import styles from './Progress.module.css'

interface Props {
  status: string
  title: string | null
}

const ORDER = ['QUEUED', 'FETCHING', 'TRANSCRIBING', 'GENERATING', 'DONE']

const STAGES = [
  { key: 'FETCHING', label: 'Fetching audio' },
  { key: 'TRANSCRIBING', label: 'Transcribing' },
  { key: 'GENERATING', label: 'Writing your outputs' },
]

function Progress({ status, title }: Props) {
  const current = ORDER.indexOf(status)

  return (
    <div className={styles.card}>
      <p className={styles.heading}>{title ?? 'Working on it'}</p>
      <ul className={styles.steps}>
        {STAGES.map((stage) => {
          const index = ORDER.indexOf(stage.key)
          const done = current > index
          const active = current === index
          return (
            <li key={stage.key} className={styles.step} data-state={done ? 'done' : active ? 'active' : 'pending'}>
              <span className={styles.icon}>
                {done ? <Check size={16} /> : active ? <Loader2 size={16} className={styles.spin} /> : null}
              </span>
              <span className={styles.label}>{stage.label}</span>
            </li>
          )
        })}
      </ul>
      <p className={styles.note}>This runs locally, so transcription can take a moment on longer recordings.</p>
    </div>
  )
}

export default Progress
