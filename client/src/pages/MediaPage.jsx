import NeuCard from '../components/ui/NeuCard'

export default function MediaPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-[var(--neu-text)] lg:hidden">Media</h1>
      <NeuCard>
        <h2 className="font-semibold mb-2 text-[var(--neu-accent)]">Media Library</h2>
        <p className="text-[var(--neu-text-muted)]">
          Browse and stream your movies, music, and documents. Full-text search
          across filenames and metadata with in-browser playback.
        </p>
      </NeuCard>
    </div>
  )
}
