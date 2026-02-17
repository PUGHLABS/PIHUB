import { BrowserRouter, Routes, Route } from 'react-router-dom'
import DashboardLayout from './components/layout/DashboardLayout'
import DashboardPage from './pages/DashboardPage'
import FilesPage from './pages/FilesPage'
import WeatherPage from './pages/WeatherPage'
import CamerasPage from './pages/CamerasPage'
import MediaPage from './pages/MediaPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="files" element={<FilesPage />} />
          <Route path="weather" element={<WeatherPage />} />
          <Route path="cameras" element={<CamerasPage />} />
          <Route path="media" element={<MediaPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
