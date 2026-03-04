import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

export default function CameraCard({ camera, onClick }) {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const [streamError, setStreamError] = useState(false)

  const { id, name, location, status } = camera
  const isLive = status?.streaming
  const playlistUrl = `/api/v1/cameras/${id}/hls/live.m3u8`

  useEffect(() => {
    if (!isLive || !videoRef.current) return

    const video = videoRef.current
    const token = localStorage.getItem('pivault-token')
    setStreamError(false)

    if (Hls.isSupported()) {
      const hls = new Hls({
        xhrSetup: (xhr) => {
          if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        },
        liveSyncDurationCount: 3,
      })
      hlsRef.current = hls
      hls.loadSource(playlistUrl)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}))
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) setStreamError(true)
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = playlistUrl
      video.play().catch(() => {})
    }

    return () => {
      hlsRef.current?.destroy()
      hlsRef.current = null
    }
  }, [isLive, playlistUrl])

  return (
    <div
      className="neu-flat p-3 cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
      onClick={() => onClick?.(camera)}
    >
      <div className="relative">
        {isLive && !streamError ? (
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full h-36 object-cover rounded-lg bg-black"
          />
        ) : (
          <div className="w-full h-36 rounded-lg bg-[var(--neu-shadow-dark)] flex items-center justify-center">
            <span className="text-xs text-[var(--neu-text-muted)]">
              {streamError ? 'Stream error' : 'Offline'}
            </span>
          </div>
        )}

        <span className={`absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
          isLive
            ? 'bg-green-500/20 text-green-400'
            : 'bg-[var(--neu-shadow-dark)] text-[var(--neu-text-muted)]'
        }`}>
          {isLive ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>

      <div className="mt-2 px-1">
        <p className="text-sm font-medium text-[var(--neu-text)] truncate">{name}</p>
        {location && (
          <p className="text-xs text-[var(--neu-text-muted)] truncate">{location}</p>
        )}
      </div>
    </div>
  )
}
