export function SkeletonLigne({ className = "h-4 w-full" }) {
  return <div className={`skeleton ${className}`} />;
}

export function SkeletonCarte() {
  return (
    <div className="carte p-6 space-y-4">
      <SkeletonLigne className="h-6 w-2/3" />
      <SkeletonLigne className="h-24 w-full" />
      <SkeletonLigne className="h-4 w-1/2" />
      <SkeletonLigne className="h-4 w-3/4" />
    </div>
  );
}

export function SkeletonTableau({ lignes = 5 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lignes }).map((_, i) => (
        <SkeletonLigne key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}
