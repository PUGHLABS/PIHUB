import { NavLink } from 'react-router-dom'
import {
  HiOutlineViewGrid,
  HiOutlineFolder,
  HiOutlineCloud,
  HiOutlineVideoCamera,
  HiOutlineFilm,
  HiOutlineCog,
} from 'react-icons/hi'

const navItems = [
  { to: '/', icon: HiOutlineViewGrid, label: 'Dashboard' },
  { to: '/files', icon: HiOutlineFolder, label: 'Files' },
  { to: '/weather', icon: HiOutlineCloud, label: 'Weather' },
  { to: '/cameras', icon: HiOutlineVideoCamera, label: 'Cameras' },
  { to: '/media', icon: HiOutlineFilm, label: 'Media' },
  { to: '/settings', icon: HiOutlineCog, label: 'Settings' },
]

export default function Sidebar({ open, onClose }) {
  return (
    <aside
      className={`fixed top-0 left-0 z-30 h-full w-64 bg-[var(--neu-bg)] p-6 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Logo */}
      <div className="neu-flat p-4 mb-8 text-center">
        <h1 className="text-xl font-bold text-[var(--neu-accent)]">PiVault</h1>
        <p className="text-xs text-[var(--neu-text-muted)]">Home Server</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-3">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 text-[var(--neu-text)] no-underline ${
                isActive
                  ? 'neu-inset text-[var(--neu-accent)]'
                  : 'neu-subtle hover:text-[var(--neu-accent)]'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
