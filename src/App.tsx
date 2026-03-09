import { Routes, Route } from 'react-router'
import { ReactFlow, Background, Controls } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

// Temporary scaffold test — confirms React Flow, Tailwind, and routing work
function MapPage() {
  const nodes = [
    {
      id: '1',
      position: { x: 300, y: 300 },
      data: { label: 'MAPS' },
      style: {
        background: '#E53E3E',
        color: '#fff',
        border: 'none',
        borderRadius: '50%',
        width: 80,
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: 13,
      },
    },
  ]

  return (
    <div className="h-full w-full">
      <ReactFlow nodes={nodes} fitView>
        <Background color="#222" gap={32} />
        <Controls />
      </ReactFlow>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MapPage />} />
    </Routes>
  )
}
