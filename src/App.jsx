import { lazy, Suspense, useEffect } from 'react'
import Header from './components/Header'
import { SkeletonBlock } from './components/ui/Skeleton'
import Home from './pages/Home'
import { Route, Routes, useLocation } from 'react-router-dom'
import { loadPredictionRoute, loadResultsRoute } from './lib/routeLoader'

const Results = lazy(loadResultsRoute)
const Prediction = lazy(loadPredictionRoute)

function ScrollToTop() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname])

  return null
}

function RouteFallback() {
  return (
    <main className="route-shell-enter mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="glass-panel rounded-[32px] p-6 sm:p-8">
          <p className="data-label text-xs uppercase text-emerald-400/80">Loading page</p>
          <SkeletonBlock className="mt-4 h-12 w-full max-w-xl rounded-3xl sm:h-14" />
          <SkeletonBlock className="mt-4 h-4 w-full max-w-2xl" />
          <SkeletonBlock className="mt-3 h-4 w-4/5 max-w-xl" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <SkeletonBlock className="h-28 rounded-[28px]" />
            <SkeletonBlock className="h-28 rounded-[28px]" />
          </div>
        </div>

        <div className="space-y-6">
          <SkeletonBlock className="glass-panel h-48 rounded-[32px]" />
          <SkeletonBlock className="glass-panel h-40 rounded-[32px]" />
        </div>
      </div>
    </main>
  )
}

function App() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent pb-24 text-slate-100 sm:pb-0">
      <Header />
      <Suspense fallback={<RouteFallback />}>
        <ScrollToTop />
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
