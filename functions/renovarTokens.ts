/**
 * renovarTokens — Los Hombres
 * Chamada pelo agente via automação diária para renovar tokens Google nos secrets.
 * GET /renovarTokens → renova e salva GOOGLE_SHEETS_TOKEN, GOOGLE_CALENDAR_TOKEN, GMAIL_TOKEN
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APP_ID = '6a04cc22bf7a0dcea87e3c43';

Deno.serve(async (req: Request) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  };
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const b = createClientFromRequest(req);
    // Verificar autenticação
    const user = await b.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: cors });
    }

    // Buscar tokens frescos via asServiceRole
    const [sheetsConn, calConn, gmailConn] = await Promise.all([
      b.asServiceRole.connectors.getConnection('googlesheets'),
      b.asServiceRole.connectors.getConnection('googlecalendar'),
      b.asServiceRole.connectors.getConnection('gmail'),
    ]);

    const sheetsToken = sheetsConn.accessToken || '';
    const calToken    = calConn.accessToken    || '';
    const gmailToken  = gmailConn.accessToken  || '';

    // Salvar como secrets via API Base44
    const secretsPayload = [
      { name: 'GOOGLE_SHEETS_TOKEN',   value: sheetsToken },
      { name: 'GOOGLE_CALENDAR_TOKEN', value: calToken    },
      { name: 'GMAIL_TOKEN',           value: gmailToken  },
    ];

    const saveRes = await fetch(`https://base44.app/api/apps/${APP_ID}/secrets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': req.headers.get('Authorization') || '' },
      body: JSON.stringify({ secrets: secretsPayload }),
    });

    const resultado = {
      ok: saveRes.ok,
      status: saveRes.status,
      sheets_ok: sheetsToken.length > 10,
      cal_ok:    calToken.length > 10,
      gmail_ok:  gmailToken.length > 10,
      timestamp: new Date().toISOString(),
    };

    console.log('Tokens renovados:', resultado);
    return Response.json(resultado, { headers: cors });
  } catch (e: any) {
    console.error('renovarTokens ERRO:', e.message);
    return Response.json({ error: e.message }, { status: 500, headers: cors });
  }
});
