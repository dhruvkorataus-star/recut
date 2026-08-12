import { useRef, useState, type FormEvent } from 'react'
import { Link2, UploadCloud } from 'lucide-react'
import styles from './JobInput.module.css'

interface Props {
  onSubmit: (input: { url?: string; file?: File }) => void
  submitting: boolean
}

function JobInput({ onSubmit, submitting }: Props) {
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function pickFile(next: File | null) {
    setFile(next)
    if (next) setUrl('')
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return
    if (file) onSubmit({ file })
    else if (url.trim()) onSubmit({ url: url.trim() })
  }

  const ready = Boolean(file || url.trim())

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      <label className={styles.field}>
        <Link2 size={18} className={styles.fieldIcon} />
        <input
          type="url"
          className={styles.input}
          placeholder="Paste a YouTube link…"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            if (e.target.value) setFile(null)
          }}
        />
      </label>

      <div className={styles.divider}>
        <span>or</span>
      </div>

      <button
        type="button"
        className={`${styles.drop} ${dragging ? styles.dropActive : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          pickFile(e.dataTransfer.files[0] ?? null)
        }}
      >
        <UploadCloud size={20} />
        <span className={styles.dropText}>
          {file ? file.name : 'Drop an audio or video file, or click to browse'}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/*"
        hidden
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />

      <button type="submit" className={styles.submit} disabled={!ready || submitting}>
        {submitting ? 'Starting…' : 'Repurpose it'}
      </button>
    </form>
  )
}

export default JobInput
