import { Link } from 'react-router-dom'

function Home() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-panel relative overflow-hidden rounded-[34px] p-6 sm:p-8 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.14),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.16),_transparent_28%)]" />
          <div className="relative">
            <p className="data-label text-xs uppercase text-emerald-400/80">Landing page</p>
            <h2 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Prediction intelligence, separated cleanly into signal and scorecard.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Use Prediction for live and upcoming match calls, then switch to Results to grade every finished fixture against the model. The home page now acts as a true front door instead of a dashboard dump.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/prediction"
                className="rounded-full border border-emerald-400/30 bg-emerald-500/12 px-6 py-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/18"
              >
                Open Prediction
              </Link>
              <Link
                to="/results"
                className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/10"
              >
                Open Results
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="data-label text-[11px] uppercase text-slate-500">Prediction flow</p>
                <p className="mt-3 text-lg font-semibold text-white">Live and upcoming only</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">Keep the feed focused on matches you can still act on, with tabs and date filters.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="data-label text-[11px] uppercase text-slate-500">Results flow</p>
                <p className="mt-3 text-lg font-semibold text-white">Hit or miss grading</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">Compare predicted outcome vs the real scoreline and review accuracy without feed noise.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="data-label text-[11px] uppercase text-slate-500">Community flow</p>
                <p className="mt-3 text-lg font-semibold text-white">Persisted discussion</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">Likes, comments, and replies stay attached to each fixture through Supabase auth.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-[34px] p-6 sm:p-8">
            <p className="data-label text-xs uppercase text-slate-400">Page map</p>
            <h3 className="mt-4 text-2xl font-semibold text-white">Three-page structure</h3>
            <div className="mt-5 grid gap-4">
              <Link to="/prediction" className="rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10">
                <p className="text-lg font-semibold text-white">Prediction</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">Instagram-style match cards, live and upcoming tabs, filters, and model context.</p>
              </Link>
              <Link to="/results" className="rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10">
                <p className="text-lg font-semibold text-white">Results</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">Finished matches, hit-rate scorecards, prediction grading, and side panels.</p>
              </Link>
            </div>
          </div>

          <div className="glass-panel rounded-[34px] p-6 sm:p-8">
            <p className="data-label text-xs uppercase text-slate-400">Why this split</p>
            <div className="mt-5 space-y-4 text-sm leading-6 text-slate-300">
              <p className="rounded-2xl border border-white/10 bg-white/5 p-4">
                Home is now fast and lightweight. It no longer pulls the entire dashboard payload just to act as navigation.
              </p>
              <p className="rounded-2xl border border-white/10 bg-white/5 p-4">
                Results and Prediction are lazy-loaded, so the heavier dashboard code only downloads when those routes are visited.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="glass-panel rounded-[34px] p-6 sm:p-8">
          <p className="data-label text-xs uppercase text-slate-400">Prediction workflow</p>
          <div className="mt-5 space-y-4">
            {[
              'Open Prediction to see only live and upcoming fixtures.',
              'Filter by live status, today, tomorrow, or a custom date.',
              'Use the social interaction layer to like or discuss each fixture.',
            ].map((step, index) => (
              <div key={step} className="flex gap-4 rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-500/10 text-sm font-semibold text-emerald-200">
                  0{index + 1}
                </div>
                <p className="text-sm leading-6 text-slate-300">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-[34px] p-6 sm:p-8">
          <p className="data-label text-xs uppercase text-slate-400">Results workflow</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5">
              <p className="text-sm font-medium text-emerald-100">Green tick</p>
              <p className="mt-3 text-2xl font-bold text-white">Prediction hit</p>
              <p className="mt-2 text-sm leading-6 text-emerald-50/85">If the predicted outcome matches the actual result, the scorecard marks it as a correct call.</p>
            </div>
            <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-5">
              <p className="text-sm font-medium text-rose-100">Red miss</p>
              <p className="mt-3 text-2xl font-bold text-white">Prediction missed</p>
              <p className="mt-2 text-sm leading-6 text-rose-50/85">Wrong calls stay visible in the results route so model accuracy is transparent instead of hidden.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default Home