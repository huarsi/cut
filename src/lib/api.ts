import { authenticateApiKey } from "@/lib/api-keys";
import { LinkError } from "@/lib/links";

export const apiError = (status: number, message: string) =>
  Response.json({ error: message }, { status });

/** Envuelve un handler de la API: valida la llave y traduce errores a JSON. */
export function withApiKey<Ctx>(
  handler: (request: Request, userId: string, ctx: Ctx) => Promise<Response>,
) {
  return async (request: Request, ctx: Ctx) => {
    const userId = await authenticateApiKey(request);
    if (!userId) {
      return apiError(401, "Falta una API key válida en el header Authorization: Bearer cut_…");
    }
    try {
      return await handler(request, userId, ctx);
    } catch (error) {
      if (error instanceof LinkError) return apiError(error.status, error.message);
      console.error(error);
      return apiError(500, "Error interno.");
    }
  };
}
