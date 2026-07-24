import axios from 'axios'
import { normalizeError } from '../lib/errors'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach Bearer token from localStorage on every request
client.interceptors.request.use((config) => {
  const raw = localStorage.getItem('tokens')
  if (raw) {
    try {
      const tokens = JSON.parse(raw)
      config.headers.Authorization = `Bearer ${tokens.access}`
    } catch {
      // ignore malformed tokens
    }
  }
  return config
})

// Auto-refresh on 401
let isRefreshing = false
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = []

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)))
  failedQueue = []
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return client(originalRequest)
        })
      }
      originalRequest._retry = true
      isRefreshing = true
      const raw = localStorage.getItem('tokens')
      if (!raw) {
        isRefreshing = false
        return Promise.reject(error)
      }
      try {
        const { refresh } = JSON.parse(raw)
        const { data } = await axios.post(`${BASE_URL}/api/token/refresh/`, { refresh })
        localStorage.setItem('tokens', JSON.stringify(data))
        processQueue(null, data.access)
        originalRequest.headers.Authorization = `Bearer ${data.access}`
        return client(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.removeItem('tokens')
        window.location.href = '/login'
        return Promise.reject(normalizeError(refreshError))
      } finally {
        isRefreshing = false
      }
    }
    // Normalize all API errors to ApiError shape
    return Promise.reject(normalizeError(error))
  }
)

export default client
