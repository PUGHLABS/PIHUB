import { useNavigate } from 'react-router-dom'
import NeuCard from '../components/ui/NeuCard'
import NeuButton from '../components/ui/NeuButton'
import SystemHealthPanel from '../components/widgets/SystemHealthPanel'
import WeatherWidget from '../components/widgets/WeatherWidget'
import useCameras from '../hooks/useCameras'
import { HiOutlineUpload, HiOutlineVideoCamera, HiOutlineFilm } from 'react-icons/hi'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { cameras } = useCameras(30000)

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
          <div className="space-y-2">
            {['report.pdf', 'photo_001.jpg', 'backup.tar.gz', 'notes.md'].map((file) => (
              <div key={file} className="neu-subtle p-3 flex items-center gap-3">
                <span className="text-sm">{file}</span>
              </div>
            ))}
          </div>
        </NeuCard>

        {/* Quick Actions */}
        <NeuCard>
          <h2 className="font-semibold mb-4 text-[var(--neu-accent)]">Quick Actions</h2>
          <div className="space-y-3">
            <NeuButton className="w-full flex items-center justify-center gap-2">
              <HiOutlineUpload className="w-4 h-4" />
              Upload File
            </NeuButton>
            <NeuButton className="w-full flex items-center justify-center gap-2" onClick={() => navigate('/cameras')}>
              <HiOutlineVideoCamera className="w-4 h-4" />
              View Cameras
            </NeuButton>
            <NeuButton className="w-full flex items-center justify-center gap-2">
              <HiOutlineFilm className="w-4 h-4" />
              Browse Media
            </NeuButton>
          </div>
        </NeuCard>
      </div>
    </div>
  )
}
