export type AppEnvironment = 'local' | 'staging' | 'production'

function normalizeEnvironment(value: string | undefined): AppEnvironment {
  const normalized = value?.trim().toLowerCase()

  if (normalized === 'staging' || normalized === 'stage') return 'staging'
  if (normalized === 'production' || normalized === 'prod') return 'production'

  return 'local'
}

export function getAppEnvironment(): AppEnvironment {
  return normalizeEnvironment(
    process.env.APP_ENV ?? process.env.NEXT_PUBLIC_APP_ENV,
  )
}

export function isStagingEnvironment() {
  return getAppEnvironment() === 'staging'
}
