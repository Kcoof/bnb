// Route-level skeleton (design plan §3.16/§4.11) — shimmer, no spinners.
export default function DashLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading">
      <div className="space-y-2 animate-fade-up">
        <div className="skeleton h-7 w-44" />
        <div className="skeleton h-4 w-28" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="skeleton h-8 w-10" />
            <div className="skeleton h-5 w-24" />
          </div>
        ))}
      </div>
      <div className="card p-5 space-y-3">
        <div className="skeleton h-5 w-40" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-2/3" />
        <div className="skeleton h-4 w-3/4" />
      </div>
      <div className="card p-5 space-y-3">
        <div className="skeleton h-5 w-32" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-1/2" />
      </div>
    </div>
  );
}
