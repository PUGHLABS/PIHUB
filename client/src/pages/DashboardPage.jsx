import NeuCard from '../components/ui/NeuCard'
import NeuButton from '../components/ui/NeuButton'
import SystemHealthPanel from '../components/widgets/SystemHealthPanel'
import { HiOutlineUpload, HiOutlineVideoCamera, HiOutlineFilm } from 'react-icons/hi'

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-[var(--neu-text)] lg:hidden">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* System Health — LIVE */}
        <div className="md:col-span-2 xl:col-span-3">
          <SystemHealthPanel />
        </div>

        {/* Weather */}
        <NeuCard>
          <h2 className="font-semibold mb-4 text-[var(--neu-accent)]">Weather</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-[var(--neu-text-muted)]">Temperature</span>
              <span className="font-bold">22.5°C</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--neu-text-muted)]">Humidity</span>
              <span className="font-bold">65%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--neu-text-muted)]">Pressure</span>
              <span className="font-bold">1013 hPa</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--neu-text-muted)]">Wind</span>
              <span className="font-bold">12 km/h</span>
            </div>
          </div>
        </NeuCard>

        {/* Cameras */}
        <NeuCard>
          <h2 className="font-semibold mb-4 text-[var(--neu-accent)]">Cameras</h2>
          <div className="grid grid-cols-2 gap-3">
            {['Front Door', 'Backyard', 'Garage', 'Driveway'].map((cam) => (
              <div key={cam} className="neu-inset p-3 text-center">
                <div className="w-full h-16 bg-[var(--neu-shadow-dark)] rounded-lg mb-2" />
                <p className="text-xs text-[var(--neu-text-muted)]">{cam}</p>
              </div>
            ))}
          </div>
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
            <NeuButton className="w-full flex items-center justify-center gap-2">
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
