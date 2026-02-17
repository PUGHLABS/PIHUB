import NeuCard from '../components/ui/NeuCard'

export default function CamerasPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-[var(--neu-text)] lg:hidden">Cameras</h1>
      <NeuCard>
        <h2 className="font-semibold mb-2 text-[var(--neu-accent)]">Security Cameras</h2>
        <p className="text-[var(--neu-text-muted)]">
          Live view grid, continuous and motion-triggered recording, timeline-based
          playback, and searchable event logs for your IP cameras.
        </p>
      </NeuCard>
    </div>
  )
}
