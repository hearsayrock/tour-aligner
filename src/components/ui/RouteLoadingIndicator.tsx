export function RouteLoadingIndicator() {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[110] h-1 overflow-hidden bg-[#FAD8C9]/70"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <span className="block h-full w-1/3 animate-route-progress rounded-full bg-[#FD6A2F] shadow-[0_0_10px_rgba(253,106,47,0.5)]" />
    </div>
  )
}
