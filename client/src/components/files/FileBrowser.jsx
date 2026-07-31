import { useRef, useState } from 'react'
import NeuButton from '../ui/NeuButton'
import useFileBrowser from '../../hooks/useFileBrowser'
import { authedUrl } from '../../lib/api'
import { formatBytes, getFileKind } from '../../lib/fileTypes'
import {
  HiOutlineFolder,
  HiOutlineDocument,
  HiOutlinePhotograph,
  HiOutlineFilm,
  HiOutlineMusicNote,
  HiOutlineTrash,
  HiOutlineDownload,
  HiOutlineUpload,
  HiOutlineFolderAdd,
} from 'react-icons/hi'

const ICONS = {
  directory: HiOutlineFolder,
  image: HiOutlinePhotograph,
  video: HiOutlineFilm,
  audio: HiOutlineMusicNote,
  file: HiOutlineDocument,
}

// Shared browser for both /files (general NAS storage) and /media (movies/music/photos).
// mediaMode swaps the file action from "download" to "stream" and enables inline preview
// for playable types, since the media API only exposes a /stream route (no /download).
export default function FileBrowser({ apiBase, mediaMode = false }) {
  const { path, items, loading, error, open, goTo, upload, remove, mkdir } = useFileBrowser(apiBase)
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [preview, setPreview] = useState(null)
  const inputRef = useRef(null)

  const crumbs = path ? path.split('/').filter(Boolean) : []

  async function handleFiles(fileList) {
    const files = Array.from(fileList)
    if (files.length === 0) return
    setUploading(true)
    setActionError(null)
    try {
      await upload(files)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragActive(false)
    handleFiles(e.dataTransfer.files)
  }

  function itemUrl(item) {
    const itemPath = path ? `${path}/${item.name}` : item.name
    return authedUrl(`${apiBase}${mediaMode ? '/stream' : '/download'}`, { path: itemPath })
  }

  function handleItemClick(item) {
    if (item.type === 'directory') return open(item.name)
    const kind = getFileKind(item.name)
    if (mediaMode && (kind === 'video' || kind === 'audio' || kind === 'image')) {
      setPreview({ ...item, kind, url: itemUrl(item) })
    }
  }

  async function handleDelete(item, e) {
    e.stopPropagation()
    if (!confirm(`Delete "${item.name}"?`)) return
    setActionError(null)
    try {
      await remove(item.name)
    } catch (err) {
      setActionError(err.message)
    }
  }

  async function handleNewFolder() {
    const name = prompt('Folder name:')
    if (!name) return
    setActionError(null)
    try {
      await mkdir(name)
    } catch (err) {
      setActionError(err.message)
    }
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 flex-wrap text-sm">
        <button className="text-[var(--neu-accent)] hover:underline" onClick={() => goTo(-1)}>
          Home
        </button>
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="text-[var(--neu-text-muted)]">/</span>
            <button className="text-[var(--neu-accent)] hover:underline" onClick={() => goTo(i)}>
              {crumb}
            </button>
          </span>
        ))}
      </div>

      {/* Drop zone */}
      <div
        className={`neu-inset p-6 text-center border-2 border-dashed rounded-2xl transition-colors ${
          dragActive ? 'border-[var(--neu-accent)]' : 'border-transparent'
        }`}
        onDragOver={e => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <p className="text-sm text-[var(--neu-text-muted)] mb-3">Drag and drop files here, or</p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <NeuButton
            className="!px-4 !py-2 text-sm inline-flex items-center gap-2"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <HiOutlineUpload className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Choose Files'}
          </NeuButton>
          <NeuButton
            className="!px-4 !py-2 text-sm inline-flex items-center gap-2"
            onClick={handleNewFolder}
          >
            <HiOutlineFolderAdd className="w-4 h-4" />
            New Folder
          </NeuButton>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
        />
        {actionError && <p className="text-red-400 text-xs mt-2">{actionError}</p>}
      </div>

      {/* Listing */}
      {loading && <p className="text-[var(--neu-text-muted)] text-sm">Loading...</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="text-[var(--neu-text-muted)] text-sm">This folder is empty.</p>
      )}

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map(item => {
            const Icon = ICONS[item.type === 'directory' ? 'directory' : getFileKind(item.name)]
            return (
              <div
                key={item.name}
                className="neu-subtle p-3 flex items-center gap-3 cursor-pointer hover:scale-[1.005] transition-transform rounded-xl"
                onClick={() => handleItemClick(item)}
              >
                <Icon className="w-5 h-5 text-[var(--neu-accent)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--neu-text)] truncate">{item.name}</p>
                  <p className="text-xs text-[var(--neu-text-muted)]">
                    {item.type === 'directory' ? 'Folder' : formatBytes(item.size)}
                    {' · '}{new Date(item.modified).toLocaleDateString()}
                  </p>
                </div>
                {item.type === 'file' && (
                  <a
                    href={itemUrl(item)}
                    download={item.name}
                    onClick={e => e.stopPropagation()}
                    className="neu-button !px-3 !py-2 text-[var(--neu-text)]"
                    title="Download"
                  >
                    <HiOutlineDownload className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={e => handleDelete(item, e)}
                  className="neu-button !px-3 !py-2 text-red-400"
                  title="Delete"
                >
                  <HiOutlineTrash className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Preview modal (media mode only) */}
      {preview && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setPreview(null)}
        >
          <div className="neu-flat p-4 w-full max-w-3xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3 gap-4">
              <p className="font-medium text-[var(--neu-text)] truncate">{preview.name}</p>
              <NeuButton onClick={() => setPreview(null)} className="!px-4 !py-2 text-sm shrink-0">
                Close
              </NeuButton>
            </div>
            {preview.kind === 'video' && (
              <video src={preview.url} controls autoPlay className="w-full rounded-lg bg-black" style={{ maxHeight: '65vh' }} />
            )}
            {preview.kind === 'audio' && (
              <audio src={preview.url} controls autoPlay className="w-full" />
            )}
            {preview.kind === 'image' && (
              <img src={preview.url} alt={preview.name} className="w-full rounded-lg" style={{ maxHeight: '65vh', objectFit: 'contain' }} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
