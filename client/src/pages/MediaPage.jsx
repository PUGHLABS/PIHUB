import NeuCard from '../components/ui/NeuCard'
import FileBrowser from '../components/files/FileBrowser'

export default function MediaPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-[var(--neu-text)] lg:hidden">Media</h1>
      <NeuCard>
        <h2 className="font-semibold mb-4 text-[var(--neu-accent)]">Media Library</h2>
        <FileBrowser apiBase="/media" mediaMode />
      </NeuCard>
    </div>
  )
}
