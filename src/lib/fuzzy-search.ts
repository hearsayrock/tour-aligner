type RankedMatch = {
  id: string
  rank: number
}

export function sortItemsByRank<T extends { id: string }>(items: T[], rankedMatches: RankedMatch[]) {
  const rankedIndex = new Map(rankedMatches.map((match, index) => [match.id, index]))

  return [...items].sort((a, b) => {
    const aIndex = rankedIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER
    const bIndex = rankedIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER

    return aIndex - bIndex
  })
}
