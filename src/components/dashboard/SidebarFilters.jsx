import { filterOptions, sortOptions } from '../../features/dashboard/helpers'

export default function SidebarFilters({ activeFilter, handleFilterChange, selectedDate, handleDateChange, sortMode, setSortMode }) {
  return (
    <div className="glass-panel rounded-[28px] p-5">
      <p className="data-label text-xs uppercase text-slate-400">Feed controls</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {filterOptions.map((option) => {
          const isActive = activeFilter === option.id

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleFilterChange(option.id)}
              className={[
                'rounded-full border px-3 py-2 text-xs transition',
                isActive
                  ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
              ].join(' ')}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <label className="mt-4 block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
        <span className="data-label text-[11px] uppercase text-slate-400">Date</span>
        <input
          type="date"
          value={selectedDate}
          onChange={handleDateChange}
          className="mt-2 block w-full bg-transparent text-slate-100 outline-none [color-scheme:dark]"
        />
      </label>

      <label className="mt-4 block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
        <span className="data-label text-[11px] uppercase text-slate-400">Sort</span>
        <select
          value={sortMode}
          onChange={(event) => setSortMode(event.target.value)}
          className="mt-2 block w-full bg-transparent text-slate-100 outline-none"
        >
          {sortOptions.map((option) => (
            <option key={option.id} value={option.id} className="bg-slate-950 text-slate-100">
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
