import { filterOptions, sortOptions } from '../../features/dashboard/helpers'
import { useState } from 'react'

export default function SidebarFilters({ 
  activeFilter, 
  handleFilterChange, 
  selectedDate, 
  handleDateChange, 
  sortMode, 
  setSortMode 
}) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)

  const handleClearDate = () => {
    handleDateChange({ target: { value: '' } })
  }

  const getFilterLabel = (filterId) => {
    const option = filterOptions.find(opt => opt.id === filterId)
    return option?.label || filterId
  }

  return (
    <div className="glass-panel rounded-[28px] p-5">
      <p className="data-label text-xs uppercase text-slate-400">Feed controls</p>
      
      {/* Filter options */}
      <div className="mt-4 space-y-3">
        <p className="text-xs text-slate-500 uppercase tracking-wider">Filter by</p>
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => {
            const isActive = activeFilter === option.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleFilterChange(option.id)}
                className={[
                  'rounded-full border px-3 py-2 text-xs transition-all duration-200',
                  isActive
                    ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200 shadow-lg shadow-emerald-500/10'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
                ].join(' ')}
                aria-label={`Filter by ${option.label}`}
              >
                {option.label}
                {isActive && (
                  <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Date filter */}
      <div className="mt-4">
        <label className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 transition-all focus-within:border-emerald-400/30">
          <div className="flex items-center justify-between">
            <span className="data-label text-[11px] uppercase text-slate-400">Date</span>
            {selectedDate && (
              <button
                onClick={handleClearDate}
                className="text-xs text-slate-500 hover:text-slate-300 transition"
                aria-label="Clear date filter"
              >
                ✕
              </button>
            )}
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            onFocus={() => setIsDatePickerOpen(true)}
            onBlur={() => setIsDatePickerOpen(false)}
            className="mt-2 block w-full bg-transparent text-slate-100 outline-none [color-scheme:dark]"
            aria-label="Select date"
          />
        </label>
        {isDatePickerOpen && (
          <p className="mt-1 text-xs text-slate-500">Select a date to filter predictions</p>
        )}
      </div>

      {/* Sort options */}
      <div className="mt-4">
        <label className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 transition-all focus-within:border-emerald-400/30">
          <span className="data-label text-[11px] uppercase text-slate-400">Sort by</span>
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value)}
            className="mt-2 block w-full bg-transparent text-slate-100 outline-none cursor-pointer"
            aria-label="Sort predictions"
          >
            {sortOptions.map((option) => (
              <option key={option.id} value={option.id} className="bg-slate-950 text-slate-100">
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Active filters summary */}
      {(activeFilter !== 'all' || selectedDate) && (
        <div className="mt-4 pt-3 border-t border-white/10">
          <p className="text-xs text-slate-500 mb-2">Active filters:</p>
          <div className="flex flex-wrap gap-2">
            {activeFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
                {getFilterLabel(activeFilter)}
                <button
                  onClick={() => handleFilterChange('all')}
                  className="ml-1 hover:text-emerald-100"
                  aria-label="Remove filter"
                >
                  ✕
                </button>
              </span>
            )}
            {selectedDate && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-1 text-xs text-sky-300">
                {new Date(selectedDate).toLocaleDateString()}
                <button
                  onClick={handleClearDate}
                  className="ml-1 hover:text-sky-100"
                  aria-label="Clear date"
                >
                  ✕
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}