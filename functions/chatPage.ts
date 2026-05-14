// chatPage v4 - Los Hombres chat page
export default async function handler(req: Request): Promise<Response> {
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Los Hombres</title></head><body><h1>OK v4</h1></body></html>`;
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
