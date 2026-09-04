export function getServerTimingStart() {
  return performance.now()
}

export async function measureServerOperation<T>(operation: PromiseLike<T>) {
  const startedAt = getServerTimingStart()
  const value = await operation
  return { value, duration: getServerTimingStart() - startedAt }
}

export function logServerTiming(scope: string, timings: Record<string, number>) {
  if (process.env.NODE_ENV !== 'development') return

  const details = Object.entries(timings)
    .map(([label, duration]) => `${label}=${duration.toFixed(0)}ms`)
    .join(' ')

  console.info(`[perf] ${scope} ${details}`)
}
