import { useCallback, useEffect, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import JobInput from './components/JobInput'
import Progress from './components/Progress'
import Results from './components/Results'
import { createJob, getJob, type Job } from './lib/api'
import { getSocket, type JobUpdate } from './lib/socket'
import styles from './App.module.css'

type Phase = 'idle' | 'running' | 'done' | 'error'

function App() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [status, setStatus] = useState('QUEUED')
  const [title, setTitle] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [job, setJob] = useState<Job | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const jobId = useRef<string | null>(null)

  const apply = useCallback((id: string, nextStatus: string, nextTitle: string | null, nextError: string | null) => {
    if (jobId.current !== id) return
    setStatus(nextStatus)
    if (nextTitle) setTitle(nextTitle)
    if (nextStatus === 'FAILED') {
      setError(nextError ?? 'Something went wrong while processing this.')
      setPhase('error')
    } else if (nextStatus === 'DONE') {
      getJob(id).then((full) => {
        if (jobId.current !== id) return
        setJob(full)
        setPhase('done')
      })
    }
  }, [])

  useEffect(() => {
    const socket = getSocket()
    const handler = (update: JobUpdate) => apply(update.id, update.status, update.title, update.error)
    socket.on('job:update', handler)
    return () => {
      socket.off('job:update', handler)
    }
  }, [apply])

  async function handleSubmit(input: { url?: string; file?: File }) {
    setSubmitting(true)
    setError(null)
    try {
      const created = await createJob(input)
      jobId.current = created.id
      setJob(null)
      setTitle(null)
      setStatus(created.status)
      setPhase('running')
      const socket = getSocket()
      socket.emit('job:subscribe', created.id)
      const current = await getJob(created.id)
      apply(created.id, current.status, current.title, current.error)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the job.')
      setPhase('error')
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    if (jobId.current) getSocket().emit('job:unsubscribe', jobId.current)
    jobId.current = null
    setPhase('idle')
    setJob(null)
    setError(null)
    setTitle(null)
    setStatus('QUEUED')
  }

  const compact = phase !== 'idle'

  return (
    <main className={styles.shell}>
      <header className={compact ? styles.headerCompact : styles.header}>
        <span className={styles.badge}>Recut</span>
        {!compact && (
          <>
            <h1 className={styles.title}>One recording, every format.</h1>
            <p className={styles.sub}>
              Paste a YouTube link or drop a file. Get a thread, a LinkedIn post, a blog draft, and
              clip-ready timestamps — from a single upload.
            </p>
          </>
        )}
      </header>

      {phase === 'idle' && <JobInput onSubmit={handleSubmit} submitting={submitting} />}
      {phase === 'running' && <Progress status={status} title={title} />}
      {phase === 'done' && job && <Results job={job} />}
      {phase === 'error' && (
        <div className={styles.error}>
          <p>{error}</p>
        </div>
      )}

      {compact && (
        <button type="button" className={styles.reset} onClick={reset}>
          <RotateCcw size={15} />
          Start over
        </button>
      )}
    </main>
  )
}

export default App
