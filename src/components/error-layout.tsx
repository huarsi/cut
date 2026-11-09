/** Diseño compartido por la 404 y la página de error. */
export function ErrorLayout({
  code,
  title,
  text,
  children,
}: {
  code: string;
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 pt-8 pb-24 text-center">
      <p className="font-mono text-sm text-muted">{code}</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        {title}
        <span className="text-accent">.</span>
      </h1>
      <p className="mt-4 max-w-md text-muted text-balance">{text}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">{children}</div>
    </main>
  );
}
