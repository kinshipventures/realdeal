import { Routes, Route } from 'react-router'
import { OrbMap } from './components/map/OrbMap'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<OrbMap />} />
    </Routes>
  )
}
