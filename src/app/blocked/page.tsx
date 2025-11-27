export default function BlockedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
      <div className="max-w-md text-center border border-border rounded-2xl px-6 py-8 bg-card shadow-soft">
        <h1 className="text-2xl font-bold mb-3">Access restricted</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Our service is not available in your region.
        </p>
        <p className="text-xs text-muted-foreground">
          If you believe this is an error, please contact support from a different network.
        </p>
      </div>
    </div>
  );
}
