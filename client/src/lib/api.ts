const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export interface Clip {
  start: number
  end: number
  title: string
  reason: string
}

export interface JobResults {
  thread: string | null
  linkedin: string | null
  blog: string | null
  clips: Clip[] | null
}

export interface Job {
  id: string
  status: string
  source: string
  title: string | null
  durationSec: number | null
  error: string | null
  results: JobResults | null
}

export async function createJob(input: { url?: string; file?: File }): Promise<{ id: string; status: string }> {
  let res: Response
  if (input.file) {
    const form = new FormData()
    form.append('file', input.file)
    res = await fetch(`${API_URL}/api/jobs`, { method: 'POST', body: form })
  } else {
    res = await fetch(`${API_URL}/api/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: input.url }),
    })
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Could not start the job.')
  }
  return res.json()
}

export async function getJob(id: string): Promise<Job> {
  const res = await fetch(`${API_URL}/api/jobs/${id}`)
  if (!res.ok) throw new Error('Could not load the job.')
  return res.json()
}
