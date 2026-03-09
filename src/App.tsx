import { Routes, Route } from 'react-router'
import { OrbMap } from './components/map/OrbMap'
import { Dashboard } from './components/dashboard/Dashboard'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/map" element={<OrbMap />} />
    </Routes>
  )
}
