// Fallback colours stay on-palette: blue, basil, ink.
const COLORS = ["#1e4fd8", "#1f8a4c", "#1b2140"];

function colorFor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function Avatar({ name, url, size = 48 }: { name: string; url?: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: size * 0.4 };
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" style={style} className="shrink-0 rounded-full border-[3px] border-[var(--edge)] object-cover" />;
  }
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      aria-hidden
      style={{ ...style, background: colorFor(name) }}
      className="inline-flex shrink-0 items-center justify-center rounded-full border-[3px] border-[var(--edge)] font-extrabold tracking-tight text-white"
    >
      {initials}
    </span>
  );
}
