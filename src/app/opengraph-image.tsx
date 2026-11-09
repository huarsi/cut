import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { dictionaries } from "@/i18n/dictionaries";
import { shortHost } from "@/lib/links";

// Imagen que aparece al compartir cut. en WhatsApp, redes o chats. Se genera una vez en el build.
// Los lectores de links no mandan cookies, así que va en el idioma por defecto.
const t = dictionaries[DEFAULT_LOCALE];

export const alt = t.meta.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ORANGE = "#ff5a1f";
const MUTED = "#737373";

export default async function OpengraphImage() {
  // Geist es la fuente de la app; el seminegrita va en assets/ (licencia OFL) y el normal viene con Next.
  const semibold = await readFile(join(process.cwd(), "assets/Geist-SemiBold.ttf"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#fafafa",
          color: "#0a0a0a",
          fontFamily: "Geist",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 56, fontWeight: 600, letterSpacing: -2 }}>
            cut<span style={{ color: ORANGE }}>.</span>
          </div>
          <div style={{ fontSize: 30, color: MUTED }}>{shortHost}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", fontSize: 112, fontWeight: 600, letterSpacing: -5, lineHeight: 1 }}>
          <span>{t.home.title1}</span>
          <span style={{ color: MUTED }}>
            {t.home.title2}
            <span style={{ color: ORANGE }}>.</span>
          </span>
        </div>

        <div style={{ fontSize: 32, color: MUTED }}>{t.meta.description}</div>
      </div>
    ),
    { ...size, fonts: [{ name: "Geist", data: semibold, weight: 600, style: "normal" }] },
  );
}
