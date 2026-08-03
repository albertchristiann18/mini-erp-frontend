import { useState } from 'react'

interface UsePdfDownloadOptions {
  filename: string
  onDownload?: () => void
}

interface UsePdfDownloadResult {
  isDownloading: boolean
  handleDownload: (blobFactory: () => Promise<Blob>) => Promise<void>
}

export function usePdfDownload({ filename, onDownload }: UsePdfDownloadOptions): UsePdfDownloadResult {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async (blobFactory: () => Promise<Blob>) => {
    setIsDownloading(true)
    try {
      const blob = await blobFactory()
      const url = URL.createObjectURL(blob)
      const a = window.document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      onDownload?.()
    } finally {
      setIsDownloading(false)
    }
  }

  return { isDownloading, handleDownload }
}
