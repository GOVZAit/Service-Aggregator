export function AppBootScreen() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-6 safe-area-pt safe-area-pb">
      <div className="text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-primary text-white shadow-lg">
          <span className="display-face text-2xl font-bold">G</span>
        </div>
        <div className="mt-5 flex items-baseline justify-center gap-1.5 text-2xl">
          <span className="display-face font-bold text-foreground">GOVZA</span>
          <span className="font-extrabold tracking-[-0.04em] text-primary">мастера</span>
        </div>
        <div className="mx-auto mt-5 h-1.5 w-28 overflow-hidden rounded-full bg-muted">
          <div className="app-loading-bar h-full rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}
