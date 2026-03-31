import { lazy, Suspense } from 'react'
import Header from './components/Header'
import Home from './pages/Home'
import { Route, Routes } from 'react-router-dom'

const Results = lazy(() => import('./pages/Results'))
const Prediction = lazy(() => import('./pages/Prediction'))

function RouteFallback() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="glass-panel rounded-[32px] px-6 py-12 text-center sm:px-8">
        <p className="data-label text-xs uppercase text-emerald-400/80">Loading page</p>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">Preparing the next route</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base">
          Prediction and Results are loaded on demand to keep the first screen lighter.
        </p>
      </div>
    </main>
  )
}

function App() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-slate-100">
      <Header />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/results" element={<Results />} />
          <Route path="/prediction" element={<Prediction />} />
        </Routes>
      </Suspense>
    </div>
  )
}

export default App
