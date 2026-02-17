import NeuCard from '../components/ui/NeuCard'

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-[var(--neu-text)] lg:hidden">Settings</h1>
      <NeuCard>
        <h2 className="font-semibold mb-2 text-[var(--neu-accent)]">System Settings</h2>
        <p className="text-[var(--neu-text-muted)]">
          Manage user accounts, configure storage quotas, set up backup schedules,
          and control system-wide preferences.
        </p>
      </NeuCard>
    </div>
  )
}
