function joinClasses(...classes) {
  return classes.filter(Boolean).join(' ')
}

/**
 * SkeletonBlock - Base skeleton component with animation
 */
export function SkeletonBlock({ className = '', variant = 'default', style, ...props }) {
  const variants = {
    default: 'bg-white/10',
    dark: 'bg-white/5',
    light: 'bg-white/20',
    gradient: 'bg-gradient-to-r from-white/5 via-white/10 to-white/5',
  }

  return (
    <div 
      aria-hidden="true" 
      style={style}
      className={joinClasses(
        'relative overflow-hidden rounded-lg',
        variants[variant] || variants.default,
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  )
}

/**
 * SkeletonText - Text skeleton with configurable lines
 */
export function SkeletonText({ className = '', lines = 1, variant = 'default' }) {
  if (lines === 1) {
    return <SkeletonBlock className={joinClasses('h-4 rounded-full', className)} variant={variant} />
  }
  
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock 
          key={i} 
          className={joinClasses(
            'h-4 rounded-full',
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full',
            className
          )} 
          variant={variant}
        />
      ))}
    </div>
  )
}

/**
 * SkeletonCircle - Circle skeleton for avatars
 */
export function SkeletonCircle({ className = '', size = 'md', variant = 'default' }) {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
  }

  return (
    <SkeletonBlock 
      className={joinClasses('rounded-full', sizes[size] || sizes.md, className)} 
      variant={variant}
    />
  )
}

/**
 * SkeletonCard - Card skeleton with image and text
 */
export function SkeletonCard({ variant = 'default' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start gap-4">
        <SkeletonCircle size="md" variant={variant} />
        <div className="flex-1 space-y-3">
          <SkeletonText lines={2} variant={variant} />
        </div>
      </div>
      <div className="mt-4">
        <SkeletonBlock className="h-32 rounded-xl" variant={variant} />
      </div>
      <div className="mt-4 flex gap-2">
        <SkeletonBlock className="h-8 w-20 rounded-full" variant={variant} />
        <SkeletonBlock className="h-8 w-20 rounded-full" variant={variant} />
        <SkeletonBlock className="h-8 w-20 rounded-full" variant={variant} />
      </div>
    </div>
  )
}

/**
 * SkeletonTable - Table skeleton with rows
 */
export function SkeletonTable({ rows = 5, columns = 4, variant = 'default' }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-3">
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonBlock key={i} className="h-8 flex-1 rounded-lg" variant={variant} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-3">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <SkeletonBlock key={colIdx} className="h-12 flex-1 rounded-lg" variant={variant} />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * SkeletonFeed - Feed item skeleton for prediction cards
 */
export function SkeletonFeed({ variant = 'default' }) {
  return (
    <div className="glass-panel rounded-[30px] p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <SkeletonCircle size="md" variant={variant} />
        <div className="min-w-0 flex-1">
          <SkeletonText className="h-4 w-40" variant={variant} />
          <SkeletonText className="mt-3 h-4 w-56 max-w-full" variant={variant} />
        </div>
        <SkeletonBlock className="h-10 w-20 rounded-full" variant={variant} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SkeletonBlock className="h-24 rounded-3xl" variant={variant} />
            <SkeletonBlock className="h-24 rounded-3xl" variant={variant} />
          </div>
          <SkeletonText className="mt-4 h-4 w-5/6" variant={variant} />
          <SkeletonText className="mt-3 h-4 w-3/5" variant={variant} />
        </div>

        <div className="space-y-3 rounded-[28px] border border-white/10 bg-white/5 p-4">
          <SkeletonBlock className="h-20 rounded-3xl" variant={variant} />
          <SkeletonBlock className="h-20 rounded-3xl" variant={variant} />
        </div>
      </div>
    </div>
  )
}

/**
 * SkeletonStats - Stats card skeleton
 */
export function SkeletonStats({ count = 4, variant = 'default' }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <SkeletonText className="h-4 w-24" variant={variant} />
          <SkeletonBlock className="mt-3 h-8 w-20 rounded-lg" variant={variant} />
          <SkeletonText className="mt-3 h-4 w-11/12" variant={variant} />
        </div>
      ))}
    </div>
  )
}

/**
 * SkeletonChart - Chart skeleton with bars
 */
export function SkeletonChart({ bars = 5, variant = 'default' }) {
  return (
    <div className="space-y-3">
      <SkeletonText className="h-4 w-32" variant={variant} />
      <div className="flex items-end gap-2 h-48">
        {Array.from({ length: bars }).map((_, i) => (
          <SkeletonBlock 
            key={i} 
            className="flex-1 rounded-t-lg" 
            style={{ height: `${35 + ((i * 17) % 55)}%` }}
            variant={variant}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * SkeletonAvatarGroup - Group of avatar skeletons
 */
export function SkeletonAvatarGroup({ count = 3, size = 'md', variant = 'default' }) {
  return (
    <div className="flex -space-x-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCircle 
          key={i} 
          size={size} 
          className="ring-2 ring-slate-950" 
          variant={variant}
        />
      ))}
    </div>
  )
}

// Add shimmer animation to global CSS
export const skeletonStyles = `
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.animate-shimmer {
  animation: shimmer 1.5s infinite;
}
`

export default {
  SkeletonBlock,
  SkeletonText,
  SkeletonCircle,
  SkeletonCard,
  SkeletonTable,
  SkeletonFeed,
  SkeletonStats,
  SkeletonChart,
  SkeletonAvatarGroup,
}