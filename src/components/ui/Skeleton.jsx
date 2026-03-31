function joinClasses(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function SkeletonBlock({ className = '' }) {
  return <div aria-hidden="true" className={joinClasses('skeleton-block', className)} />
}

export function SkeletonText({ className = '' }) {
  return <SkeletonBlock className={joinClasses('h-4 rounded-full', className)} />
}

export function SkeletonCircle({ className = '' }) {
  return <SkeletonBlock className={joinClasses('rounded-full', className)} />
}