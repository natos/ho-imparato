/** "Ho imparato." — the app's name is itself a passato prossimo sentence. */
export function Wordmark({ size = "lg" }: { size?: "lg" | "sm" }) {
  const big = size === "lg";
  // Only the welcome screen uses the wordmark as its page heading.
  const Tag = big ? "h1" : "p";
  return (
    <Tag
      className={`font-display wordmark inline-block leading-none text-[var(--brand)] ${
        big ? "wordmark-stamp text-[clamp(48px,14vw,72px)]" : "whitespace-nowrap text-[clamp(20px,6vw,28px)]"
      }`}
      style={{ textShadow: big ? "4px 4px 0 var(--edge)" : "2px 2px 0 var(--edge)" }}
    >
      Ho imparato.
    </Tag>
  );
}
