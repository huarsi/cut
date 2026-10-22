"use client";

import { useEffect, useState } from "react";
import { CutAnimation } from "./cut-animation";

const EXAMPLES = [
  ["https://www.example.com/blog/2026/10/como-escribir-urls-que-nadie-quiere-copiar", "cut.lat/k3Rp9"],
  ["https://docs.google.com/spreadsheets/d/1a2B3c4D5e6F7g8H9i0J/edit#gid=0", "cut.lat/q7Tn2"],
  ["https://shop.example.mx/productos/audifonos-inalambricos?utm_source=newsletter", "cut.lat/Xa8sM"],
] as const;

/** Bucle decorativo del landing: corta un link de ejemplo cada pocos segundos. */
export function CutDemo() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % EXAMPLES.length), 3600);
    return () => clearInterval(id);
  }, []);

  const [from, to] = EXAMPLES[index];
  return (
    <div className="rounded-2xl border border-line bg-card px-5 py-4 shadow-[0_1px_0_rgba(0,0,0,0.02),0_12px_40px_-20px_rgba(0,0,0,0.15)]">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-line" />
        <span className="size-2 rounded-full bg-line" />
        <span className="size-2 rounded-full bg-line" />
      </div>
      <CutAnimation key={index} from={from} to={`https://${to}`} />
    </div>
  );
}
