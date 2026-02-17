import NeuCard from '../components/ui/NeuCard'

export default function WeatherPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-[var(--neu-text)] lg:hidden">Weather</h1>
      <NeuCard>
        <h2 className="font-semibold mb-2 text-[var(--neu-accent)]">ESP32 Weather Station</h2>
        <p className="text-[var(--neu-text-muted)]">
          Real-time gauges and interactive trend charts for temperature, humidity,
          pressure, and wind data from your ESP32 weather station.
        </p>
      </NeuCard>
    </div>
  )
}
