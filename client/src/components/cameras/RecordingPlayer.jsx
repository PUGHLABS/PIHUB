import NeuButton from '../ui/NeuButton'

export default function RecordingPlayer({ recording, cameraId, onClose }) {
  const src = `/api/v1/cameras/${cameraId}/recordings/${recording.id}/file`
  const filename = recording.file_path?.split('/').pop() || 'recording.mp4'
  const startedAt = new Date(recording.started_at).toLocaleString()

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="neu-flat p-4 w-full max-w-3xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3 gap-4">
          <div>
            <p className="font-medium text-[var(--neu-text)]">{startedAt}</p>
            <p className="text-xs text-[var(--neu-text-muted)] mt-0.5">{filename}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <a
              href={src}
              download={filename}
              className="neu-button px-4 py-2 text-sm font-medium text-[var(--neu-text)]"
              onClick={e => e.stopPropagation()}
            >
              Download
            </a>
            <NeuButton onClick={onClose} className="!px-4 !py-2 text-sm">
              Close
            </NeuButton>
          </div>
        </div>

        <video
          src={src}
          controls
          autoPlay
          className="w-full rounded-lg bg-black"
          style={{ maxHeight: '65vh' }}
        />
      </div>
    </div>
  )
}
