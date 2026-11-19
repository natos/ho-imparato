/** Shown while a page loads, so you never stare at an empty lemon screen. */
export function Splash() {
  return (
    <main className="flex flex-1 items-center justify-center" aria-busy="true">
      <p className="font-display wordmark text-5xl text-[var(--brand)]">
        Ho imparato.<span className="sr-only"> Caricamento… (loading)</span>
      </p>
    </main>
  );
}
