import { useState } from 'react'
import NeuInput from '../ui/NeuInput'
import NeuButton from '../ui/NeuButton'
import { apiFetch } from '../../lib/api.js'

const DEFAULT_FORM = {
  id: '',
  name: '',
  location: '',
  rtsp_main: '',
  rtsp_sub: '',
  retention_days: 14,
}

export default function AddCameraModal({ onClose, onAdded }) {
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const camera = await apiFetch('/cameras', {
        method: 'POST',
        body: JSON.stringify({ ...form, retention_days: Number(form.retention_days) }),
      })
      onAdded?.(camera)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="neu-flat p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-5 text-[var(--neu-text)]">Add Camera</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[var(--neu-text-muted)] block mb-1">Camera ID *</label>
              <NeuInput
                placeholder="cam-01"
                value={form.id}
                onChange={e => set('id', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs text-[var(--neu-text-muted)] block mb-1">Display Name *</label>
              <NeuInput
                placeholder="Front Door"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[var(--neu-text-muted)] block mb-1">Location</label>
              <NeuInput
                placeholder="Entrance"
                value={form.location}
                onChange={e => set('location', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--neu-text-muted)] block mb-1">Retention (days)</label>
              <NeuInput
                type="number"
                min="1"
                max="365"
                value={form.retention_days}
                onChange={e => set('retention_days', e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--neu-text-muted)] block mb-1">
              RTSP Main Stream * <span className="opacity-60">(4K — recording)</span>
            </label>
            <NeuInput
              placeholder="rtsp://admin:pass@192.168.0.x/stream0"
              value={form.rtsp_main}
              onChange={e => set('rtsp_main', e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs text-[var(--neu-text-muted)] block mb-1">
              RTSP Sub Stream * <span className="opacity-60">(low-res — live view + motion)</span>
            </label>
            <NeuInput
              placeholder="rtsp://admin:pass@192.168.0.x/stream1"
              value={form.rtsp_sub}
              onChange={e => set('rtsp_sub', e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm neu-inset p-2 rounded">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <NeuButton type="submit" disabled={saving} className="flex-1">
              {saving ? 'Adding...' : 'Add Camera'}
            </NeuButton>
            <NeuButton type="button" onClick={onClose} className="flex-1">
              Cancel
            </NeuButton>
          </div>
        </form>
      </div>
    </div>
  )
}
