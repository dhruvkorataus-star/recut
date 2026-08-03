import { useEffect, useState } from 'react'
import styles from './App.module.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

function App() {
  const [api, setApi] = useState<'checking' | 'ok' | 'down'>('checking')

  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then((res) => (res.ok ? setApi('ok') : setApi('down')))
      .catch(() => setApi('down'))
  }, [])

  return (
    <main className={styles.shell}>
      <div className={styles.badge}>Recut</div>
      <h1 className={styles.title}>One recording, every format.</h1>
      <p className={styles.sub}>
        Paste a YouTube link or drop a file. Get a thread, a LinkedIn post, a blog
        draft, and clip-ready timestamps — from a single upload.
      </p>

      <div className={styles.status} data-state={api}>
        <span className={styles.dot} />
        {api === 'checking' && 'Checking the API…'}
        {api === 'ok' && 'API connected'}
        {api === 'down' && 'API not reachable — is the server running on :4000?'}
      </div>
    </main>
  )
}

export default App
