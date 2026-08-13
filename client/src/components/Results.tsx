import { useState } from 'react'
import { Briefcase, Check, Copy, FileText, Film, MessageSquare } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { Job } from '../lib/api'
import styles from './Results.module.css'

interface Props {
  job: Job
}

type TabKey = 'thread' | 'linkedin' | 'blog' | 'clips'

const TABS: Array<{ key: TabKey; label: string; icon: typeof Copy }> = [
  { key: 'thread', label: 'Thread', icon: MessageSquare },
  { key: 'linkedin', label: 'LinkedIn', icon: Briefcase },
  { key: 'blog', label: 'Blog', icon: FileText },
  { key: 'clips', label: 'Clips', icon: Film },
]

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function splitThread(content: string): string[] {
  const parts = content
    .split(/\n(?=\s*\d+\s*\/)/)
    .map((part) => part.trim())
    .filter(Boolean)
  return parts.length > 1 ? parts : [content.trim()]
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className={styles.copy}
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        })
      }}
    >
      {copied ? <Check size={15} /> : <Copy size={15} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function Results({ job }: Props) {
  const [tab, setTab] = useState<TabKey>('thread')
  const results = job.results

  const copyValue =
    tab === 'clips'
      ? (results?.clips ?? [])
          .map((c) => `${formatTime(c.start)}–${formatTime(c.end)}  ${c.title}`)
          .join('\n')
      : (results?.[tab] ?? '')

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <p className={styles.title}>{job.title ?? 'Your outputs'}</p>
        <CopyButton value={copyValue} />
      </div>

      <nav className={styles.tabs}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`}
            onClick={() => setTab(key)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      <div className={styles.panel}>
        {tab === 'thread' && (
          <div className={styles.thread}>
            {splitThread(results?.thread ?? '').map((tweet, i) => (
              <div key={i} className={styles.tweet}>
                {tweet}
              </div>
            ))}
          </div>
        )}

        {tab === 'linkedin' && <div className={styles.post}>{results?.linkedin}</div>}

        {tab === 'blog' && (
          <div className={styles.blog}>
            <ReactMarkdown>{results?.blog ?? ''}</ReactMarkdown>
          </div>
        )}

        {tab === 'clips' && (
          <div className={styles.clips}>
            {(results?.clips ?? []).map((clip, i) => (
              <div key={i} className={styles.clip}>
                <span className={styles.stamp}>
                  {formatTime(clip.start)} – {formatTime(clip.end)}
                </span>
                <div className={styles.clipBody}>
                  <p className={styles.clipTitle}>{clip.title}</p>
                  <p className={styles.clipReason}>{clip.reason}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Results
