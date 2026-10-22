import { getT } from "@/i18n/server";
import { authenticateApiKey } from "@/lib/api-keys";
import { LinkError, type LinkErrorCode } from "@/lib/links";

/** Error JSON con código estable y mensaje en el idioma del header Accept-Language. */
export const apiError = async (status: number, code: LinkErrorCode) =>
  Response.json({ error: (await getT()).errors[code], code }, { status });

/** Envuelve un handler de la API: valida la llave y traduce errores a JSON. */
export function withApiKey<Ctx>(
  handler: (request: Request, userId: string, ctx: Ctx) => Promise<Response>,
) {
  return async (request: Request, ctx: Ctx) => {
    const userId = await authenticateApiKey(request);
    if (!userId) return apiError(401, "unauthorized");
    try {
      return await handler(request, userId, ctx);
    } catch (error) {
      if (error instanceof LinkError) return apiError(error.status, error.code);
      console.error(error);
      return apiError(500, "internal");
    }
  };
}
