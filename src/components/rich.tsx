/** Muestra como código lo que va entre `backticks` en un texto traducido. */
export function Rich({ text }: { text: string }) {
  return text.split("`").map((part, i) =>
    i % 2 ? (
      <code key={i} className="rounded-md bg-fg/5 px-1.5 py-0.5 font-mono text-[0.85em] text-fg">
        {part}
      </code>
    ) : (
      part
    ),
  );
}
