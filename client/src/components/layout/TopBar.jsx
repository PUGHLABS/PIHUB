import { useLocation } from 'react-router-dom'
import { HiOutlineMenu, HiOutlineBell, HiOutlineSun, HiOutlineMoon } from 'react-icons/hi'
import { useTheme } from '../../context/ThemeContext'

const pageTitles = {
  '/': 'Dashboard',
  '/files': 'Files',
  '/weather': 'Weather',
  '/cameras': 'Cameras',
  '/media': 'Media',
  '/settings': 'Settings',
}

export default function TopBar({ onMenuClick }) {
  const { dark, toggle } = useTheme()
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'PiVault'

  return (
    <header className="flex items-center justify-between p-4 md:p-6">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="neu-button p-3 lg:hidden"
        aria-label="Open menu"
      >
        <HiOutlineMenu className="w-5 h-5" />
      </button>

      {/* Page title */}
      <h2 className="text-xl font-bold text-[var(--neu-text)] hidden lg:block">
        {title}
      </h2>

      {/* Right actions */}
      <div className="flex items-center gap-4">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="neu-button p-3"
          aria-label="Toggle theme"
        >
          {dark ? <HiOutlineSun className="w-5 h-5" /> : <HiOutlineMoon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <button className="neu-button p-3 relative" aria-label="Notifications">
          <HiOutlineBell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--neu-accent)] rounded-full" />
        </button>
      </div>
    </header>
  )
}
