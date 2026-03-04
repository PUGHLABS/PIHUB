import { useState } from 'react'
import NeuCard from '../components/ui/NeuCard'
import NeuButton from '../components/ui/NeuButton'
import CameraCard from '../components/cameras/CameraCard'
import AddCameraModal from '../components/cameras/AddCameraModal'
import RecordingPlayer from '../components/cameras/RecordingPlayer'
import useCameras from '../hooks/useCameras'
import useCameraRecordings from '../hooks/useCameraRecordings'
import { apiFetch } from '../lib/api'

function getUserRole() {
  try {
    const token = localStorage.getItem('pivault-token')
    if (!token) return null
    return JSON.parse(atob(token.split('.')[1]))?.role ?? null
  } catch {
    return null
  }
}

function formatBytes(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(0)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}

function toLocalDateString(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function CamerasPage() {
  const isAdmin = getUserRole() === 'admin'
  const { cameras, loading, error, refetch } = useCameras(15000)

  const [selectedCamera, setSelectedCamera] = useState(null)
  const [recDate, setRecDate] = useState(toLocalDateString())
  const [playingRec, setPlayingRec] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [motionEvents, setMotionEvents] = useState([])
  const [motionLoaded, setMotionLoaded] = useState(false)

  const { recordings, loading: recLoading } = useCameraRecordings(
    selectedCamera?.id,
    recDate
  )

  async function handleSelectCamera(camera) {
    setSelectedCamera(camera)
    setMotionLoaded(false)
    setMotionEvents([])
    try {
      const data = await apiFetch(`/cameras/${camera.id}/motion?limit=50`)
      setMotionEvents(data.events)
    } catch {
      // ignore, show empty state
    } finally {
      setMotionLoaded(true)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--neu-text)] lg:hidden">Cameras</h1>

      {/* ── Camera Grid ─────────────────────────────────────────────────────── */}
      <NeuCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[var(--neu-accent)]">Live View</h2>
          {isAdmin && (
            <NeuButton className="!px-4 !py-2 text-sm" onClick={() => setShowAddModal(true)}>
              + Add Camera
            </NeuButton>
          )}
        </div>

        {loading && (
          <p className="text-[var(--neu-text-muted)] text-sm">Loading cameras...</p>
        )}
        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}
        {!loading && cameras.length === 0 && (
          <p className="text-[var(--neu-text-muted)] text-sm">
            No cameras configured.{isAdmin ? ' Click "+ Add Camera" to get started.' : ''}
          </p>
        )}

        {cameras.length > 0 && (
          <div className={`grid gap-4 ${
            cameras.length === 1
              ? 'grid-cols-1 max-w-xs'
              : 'grid-cols-1 sm:grid-cols-2'
          }`}>
            {cameras.map(cam => (
              <div
                key={cam.id}
                className={selectedCamera?.id === cam.id
                  ? 'ring-2 ring-[var(--neu-accent)] rounded-xl'
                  : ''}
              >
                <CameraCard camera={cam} onClick={handleSelectCamera} />
              </div>
            ))}
          </div>
        )}
      </NeuCard>

      {/* ── Recording Browser ────────────────────────────────────────────────── */}
      <NeuCard>
        <h2 className="font-semibold text-[var(--neu-accent)] mb-4">Recordings</h2>

        {!selectedCamera ? (
          <p className="text-[var(--neu-text-muted)] text-sm">Select a camera above to browse recordings.</p>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              <p className="text-sm text-[var(--neu-text)]">
                Camera: <span className="font-medium">{selectedCamera.name}</span>
              </p>
              <input
                type="date"
                value={recDate}
                onChange={e => setRecDate(e.target.value)}
                className="neu-inset px-3 py-2 text-sm bg-transparent outline-none text-[var(--neu-text)]"
              />
            </div>

            {recLoading && (
              <p className="text-[var(--neu-text-muted)] text-sm">Loading...</p>
            )}

            {!recLoading && recordings.length === 0 && (
              <p className="text-[var(--neu-text-muted)] text-sm">No recordings found for this date.</p>
            )}

            {recordings.length > 0 && (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {recordings.map(rec => (
                  <button
                    key={rec.id}
                    className="neu-subtle w-full p-3 flex items-center justify-between text-left hover:scale-[1.01] transition-transform rounded-xl"
                    onClick={() => setPlayingRec(rec)}
                  >
                    <div>
                      <p className="text-sm text-[var(--neu-text)]">
                        {new Date(rec.started_at).toLocaleTimeString()}
                        {rec.ended_at && (
                          <span className="text-[var(--neu-text-muted)]">
                            {' – '}{new Date(rec.ended_at).toLocaleTimeString()}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-[var(--neu-text-muted)] mt-0.5">
                        {rec.file_path?.split('/').pop()}
                      </p>
                    </div>
                    <span className="text-xs text-[var(--neu-text-muted)] shrink-0 ml-4">
                      {formatBytes(rec.size_bytes)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </NeuCard>

      {/* ── Motion Events ────────────────────────────────────────────────────── */}
      <NeuCard>
        <h2 className="font-semibold text-[var(--neu-accent)] mb-4">Motion Events</h2>

        {!selectedCamera ? (
          <p className="text-[var(--neu-text-muted)] text-sm">Select a camera above to see motion events.</p>
        ) : !motionLoaded ? (
          <p className="text-[var(--neu-text-muted)] text-sm">Loading...</p>
        ) : motionEvents.length === 0 ? (
          <p className="text-[var(--neu-text-muted)] text-sm">No motion events recorded yet.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-3">
            {motionEvents.map(evt => (
              <div key={evt.id} className="neu-inset p-2 text-center">
                {evt.thumbnail_path ? (
                  <img
                    src={`/api/v1/cameras/${selectedCamera.id}/snapshot`}
                    alt="motion"
                    className="w-full h-14 object-cover rounded mb-1"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-14 bg-[var(--neu-shadow-dark)] rounded mb-1" />
                )}
                <p className="text-xs text-[var(--neu-text-muted)]">
                  {new Date(evt.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </NeuCard>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      {showAddModal && (
        <AddCameraModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => refetch()}
        />
      )}

      {playingRec && selectedCamera && (
        <RecordingPlayer
          recording={playingRec}
          cameraId={selectedCamera.id}
          onClose={() => setPlayingRec(null)}
        />
      )}
    </div>
  )
}
