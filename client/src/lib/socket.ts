import { io, type Socket } from 'socket.io-client'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) socket = io(API_URL)
  return socket
}

export interface JobUpdate {
  id: string
  status: string
  title: string | null
  durationSec: number | null
  error: string | null
}
