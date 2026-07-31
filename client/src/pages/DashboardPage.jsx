import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NeuCard from '../components/ui/NeuCard'
import NeuButton from '../components/ui/NeuButton'
import SystemHealthPanel from '../components/widgets/SystemHealthPanel'
import WeatherWidget from '../components/widgets/WeatherWidget'
import useCameras from '../hooks/useCameras'
import { apiFetch, uploadFiles } from '../lib/api'
import { formatBytes, getFileKind } from '../lib/fileTypes'
import {
  HiOutlineUpload,
  HiOutlineVideoCamera,
  HiOutlineFilm,
  HiOutlinePhotograph,
  HiOutlineMusicNote,
  HiOutlineDocument,
} from 'react-icons/hi'

const FILE_ICONS = {
  image: HiOutlinePhotograph,
  video: HiOutlineFilm,
  audio: HiOutlineMusicNote,
  file: HiOutlineDocument,
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { cameras } = useCameras(30000)
  const [recentFiles, setRecentFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const uploadInputRef = useRef(null)

  const loadRecentFiles = async () => {
    try {
      const data = await apiFetch('/files')
      const files = data.items
        .filter(item => item.type === 'file')
        .sort((a, b) => new Date(b.modified) - new Date(a.modified))
        .slice(0, 4)
      setRecentFiles(files)
    } catch {
      setRecentFiles([])
    }
  }

  useEffect(() => { loadRecentFiles() }, [])

  async function handleUpload(e) {
    const files = Array.from(e.target.files)
    e.target.value = ''
    if (files.length === 0) return
    setUploading(true)
    try {
      await uploadFiles('/files/upload', files)
      await loadRecentFiles()
    } catch (err) {
      alert(`Upload failed: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-[var(--neu-text)] lg:hidden">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* System Health — LIVE */}
        <div className="md:col-span-2 xl:col-span-3">
          <SystemHealthPanel />
        </div>

        {/* Weather — LIVE from ESP32 */}
        <WeatherWidget />

        {/* Cameras — real snapshots */}
        <NeuCard>
          <h2 className="font-semibold mb-4 text-[var(--neu-accent)]">Cameras</h2>
          {cameras.length === 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {['—', '—', '—', '—'].map((_, i) => (
                <div key={i} className="neu-inset p-3 text-center">
                  <div className="w-full h-16 bg-[var(--neu-shadow-dark)] rounded-lg mb-2" />
                  <p className="text-xs text-[var(--neu-text-muted)]">No camera</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {cameras.slice(0, 4).map(cam => (
                <div
                  key={cam.id}
                  className="neu-inset p-2 text-center cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={() => navigate('/cameras')}
                >
                  <div className="relative">
                    <img
                      src={`/api/v1/cameras/${cam.id}/snapshot?token=${localStorage.getItem('pivault-token')}`}
                      alt={cam.name}
                      className="w-full h-16 object-cover rounded-lg mb-1"
                      onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                    />
                    <div className="w-full h-16 bg-[var(--neu-shadow-dark)] rounded-lg mb-1 items-center justify-center hidden">
                      <span className="text-xs text-[var(--neu-text-muted)]">No snapshot</span>
                    </div>
                    <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${cam.status?.streaming ? 'bg-green-400' : 'bg-red-400/50'}`} />
                  </div>
                  <p className="text-xs text-[var(--neu-text-muted)] truncate">{cam.name}</p>
                </div>
              ))}
            </div>
          )}
        </NeuCard>

        {/* Recent Files */}
        <NeuCard>
          <h2 className="font-semibold mb-4 text-[var(--neu-accent)]">Recent Files</h2>
          {recentFiles.length === 0 ? (
            <p className="text-sm text-[var(--neu-text-muted)]">No files yet.</p>
          ) : (
            <div className="space-y-2">
              {recentFiles.map(file => {
                const Icon = FILE_ICONS[getFileKind(file.name)]
                return (
                  <div
                    key={file.name}
                    className="neu-subtle p-3 flex items-center gap-3 cursor-pointer hover:scale-[1.01] transition-transform rounded-xl"
                    onClick={() => navigate('/files')}
                  >
                    <Icon className="w-4 h-4 text-[var(--neu-accent)] shrink-0" />
                    <span className="text-sm truncate flex-1">{file.name}</span>
                    <span className="text-xs text-[var(--neu-text-muted)] shrink-0">{formatBytes(file.size)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </NeuCard>

        {/* Quick Actions */}
        <NeuCard>
          <h2 className="font-semibold mb-4 text-[var(--neu-accent)]">Quick Actions</h2>
          <div className="space-y-3">
            <NeuButton
              className="w-full flex items-center justify-center gap-2"
              onClick={() => uploadInputRef.current?.click()}
              disabled={uploading}
            >
              <HiOutlineUpload className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Upload File'}
            </NeuButton>
            <input ref={uploadInputRef} type="file" multiple className="hidden" onChange={handleUpload} />
            <NeuButton className="w-full flex items-center justify-center gap-2" onClick={() => navigate('/cameras')}>
              <HiOutlineVideoCamera className="w-4 h-4" />
              View Cameras
            </NeuButton>
            <NeuButton className="w-full flex items-center justify-center gap-2" onClick={() => navigate('/media')}>
              <HiOutlineFilm className="w-4 h-4" />
              Browse Media
            </NeuButton>
          </div>
        </NeuCard>
      </div>
    </div>
  )
}
