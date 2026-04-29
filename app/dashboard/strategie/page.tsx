import StrategieClient from './StrategieClient'

export default function StrategiePage() {
  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Strategie &amp; Ausrichtung
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Pinterest-Grundlagen, Strategie-Optionen und Pin-Design – die
          Wissens-Basis für deine eigene Strategie.
        </p>
      </header>

      <StrategieClient />
    </div>
  )
}
