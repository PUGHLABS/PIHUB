import NeuCard from '../components/ui/NeuCard'
import FileBrowser from '../components/files/FileBrowser'

export default function FilesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-[var(--neu-text)] lg:hidden">Files</h1>
      <NeuCard>
        <h2 className="font-semibold mb-4 text-[var(--neu-accent)]">File Browser</h2>
        <FileBrowser apiBase="/files" />
      </NeuCard>
    </div>
  )
}
