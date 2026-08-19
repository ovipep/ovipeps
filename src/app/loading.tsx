export default function Loading() {
  return (
    <div
      className="relative flex min-h-[65vh] items-center justify-center overflow-hidden bg-gradient-to-b from-sky/5 to-background"
      role="status"
      aria-label="Loading OVIpeps"
    >
      <div className="absolute h-80 w-80 rounded-full bg-cyan/10 blur-3xl animate-pulse-glow" />
      <div className="relative flex flex-col items-center">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-sky/15" />
          <div className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-r-cyan border-t-sky" />
          <div className="absolute inset-5 animate-spin-slow rounded-full border border-dashed border-sky/40" />
          <div className="h-7 w-4 rounded-md border border-sky/30 bg-gradient-to-b from-white to-sky/10 shadow-lg shadow-sky/20">
            <div className="mx-auto -mt-1 h-1.5 w-5 -translate-x-0.5 rounded-sm bg-slate-300" />
          </div>
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.28em] text-sky">
          Preparing your experience
        </p>
        <span className="sr-only">Loading</span>
      </div>
    </div>
  );
}
