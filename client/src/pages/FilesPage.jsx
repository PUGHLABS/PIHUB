import NeuCard from '../components/ui/NeuCard'

export default function FilesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-[var(--neu-text)] lg:hidden">Files</h1>
      <NeuCard>
        <h2 className="font-semibold mb-2 text-[var(--neu-accent)]">File Browser</h2>
        <p className="text-[var(--neu-text-muted)]">
          Upload, download, rename, and organize files on your encrypted NAS storage.
          Supports drag-and-drop upload with chunked transfers up to 4GB.
        </p>
      </NeuCard>
    </div>
  )
}
