export const MAX_JSON_BODY_BYTES = 2 * 1024 * 1024;

export type JsonBodyResult =
  | { ok: true; value: unknown }
  | { ok: false; status: 400 | 413; error: string };

/** Read a JSON request body without allowing an unbounded in-memory payload. */
export async function readJsonBodyWithLimit(
  req: Request,
  maxBytes = MAX_JSON_BODY_BYTES,
): Promise<JsonBodyResult> {
  const contentLength = req.headers.get('content-length');
  if (contentLength) {
    const parsedLength = Number(contentLength);
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      return { ok: false, status: 413, error: 'Request body is too large' };
    }
  }

  if (!req.body) {
    return { ok: false, status: 400, error: 'Invalid JSON' };
  }

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return { ok: false, status: 413, error: 'Request body is too large' };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400, error: 'Invalid JSON' };
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) as unknown };
  } catch {
    return { ok: false, status: 400, error: 'Invalid JSON' };
  }
}
