/**
 * CRON VISTORIA DIÁRIA DA AGENDA — Los Hombres
 * Roda diariamente (chamado via cron-job.org ou similar)
 * Lê Google Calendar, monta resumo do dia e envia email para dionisio872@gmail.com
 * SEM IA — 100% backend function = crédito de integração apenas
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CRON_SECRET = Deno.env.get('CRON_SECRET') || 'loshombres2026';
const EMAIL_DESTINO = 'dionisio872@gmail.com';
const CAL_SAVASSI = 'dionisio872@gmail.com'; // calendar principal
const CAL_BETIM = 'dionisio872@gmail.com';   // mesmo calendário, filtrar por texto "Betim"

async function getCalendarEvents(accessToken: string, date: string) {
  // date = YYYY-MM-DD
  const timeMin = `${date}T00:00:00-03:00`;
  const timeMax = `${date}T23:59:59-03:00`;
  const url = `https://www.googleapis.com/calendar/v3/calendars/dionisio872%40gmail.com/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=50`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Calendar API: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.items || [];
}

async function sendEmail(accessToken: string, to: string, subject: string, body: string) {
  const msg = [`To: ${to}`, `Subject: ${subject}`, `Content-Type: text/html; charset=utf-8`, ``, body].join('\n');
  const encoded = btoa(unescape(encodeURIComponent(msg))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: encoded }),
  });
  if (!res.ok) throw new Error(`Gmail API: ${res.status} ${await res.text()}`);
}

function formatarEvento(ev: any): string {
  const inicio = ev.start?.dateTime ? new Date(ev.start.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : 'dia todo';
  const fim = ev.end?.dateTime ? new Date(ev.end.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '';
  const titulo = ev.summary || '(sem título)';
  const desc = ev.description ? `<br><small style="color:#666">${ev.description.slice(0, 120)}</small>` : '';
  return `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee"><b>${inicio}${fim ? ' – ' + fim : ''}</b></td><td style="padding:8px 12px;border-bottom:1px solid #eee">${titulo}${desc}</td></tr>`;
}

Deno.serve(async (req) => {
  // Verificar secret para segurança
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret') || req.headers.get('x-cron-secret');
  if (secret !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const base44 = createClientFromRequest(req);
    
    // Pegar access token do Google Calendar via connector
    const connRes = await base44.asServiceRole.connectors.getToken('googlecalendar');
    const gcalToken = connRes?.access_token;
    const gmailRes = await base44.asServiceRole.connectors.getToken('gmail');
    const gmailToken = gmailRes?.access_token;

    if (!gcalToken || !gmailToken) {
      throw new Error('Tokens do Google não disponíveis. Reconecte os conectores.');
    }

    const hoje = new Date();
    const dataHoje = hoje.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' });
    const dataISO = hoje.toISOString().slice(0, 10);

    const eventos = await getCalendarEvents(gcalToken, dataISO);

    // Separar Savassi e Betim pelo título/descrição
    const savassi = eventos.filter((e: any) => !/(betim)/i.test(e.summary || '') && !/(betim)/i.test(e.description || ''));
    const betim = eventos.filter((e: any) => /(betim)/i.test(e.summary || '') || /(betim)/i.test(e.description || ''));
    const total = eventos.length;

    let htmlBody = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#1a1a2e;padding:20px;text-align:center">
    <h1 style="color:#c9a84c;margin:0;font-size:22px">LOS HOMBRES</h1>
    <p style="color:#8b949e;margin:4px 0 0;font-size:13px">Vistoria Diária da Agenda</p>
  </div>
  <div style="padding:24px;background:#f9f9f9">
    <h2 style="color:#333;font-size:16px;margin:0 0 16px">📅 Agenda de ${dataHoje}</h2>`;

    if (total === 0) {
      htmlBody += `<p style="background:#fff;padding:16px;border-radius:8px;color:#666;text-align:center">Nenhuma sessão agendada para hoje. Dia livre! 🌿</p>`;
    } else {
      htmlBody += `<p style="background:#e8f5e9;padding:12px 16px;border-radius:8px;color:#2e7d32;font-weight:bold">Total: ${total} sessão(ões) hoje</p>`;

      if (savassi.length > 0) {
        htmlBody += `<h3 style="color:#c9a84c;font-size:14px;margin:20px 0 8px">📍 Savassi (${savassi.length} sessão/ões)</h3>
        <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden">
          ${savassi.map(formatarEvento).join('')}
        </table>`;
      }

      if (betim.length > 0) {
        htmlBody += `<h3 style="color:#c9a84c;font-size:14px;margin:20px 0 8px">📍 Betim (${betim.length} sessão/ões)</h3>
        <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden">
          ${betim.map(formatarEvento).join('')}
        </table>`;
      }

      if (savassi.length === 0 && betim.length === 0 && total > 0) {
        htmlBody += `<h3 style="color:#c9a84c;font-size:14px;margin:20px 0 8px">📍 Todos os eventos (${total})</h3>
        <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden">
          ${eventos.map(formatarEvento).join('')}
        </table>`;
      }
    }

    htmlBody += `
    <p style="color:#999;font-size:11px;margin-top:20px;text-align:center">Gerado automaticamente às ${new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })} — Los Hombres Sistema</p>
  </div>
</div>`;

    await sendEmail(gmailToken, EMAIL_DESTINO, `📅 Agenda Los Hombres — ${dataHoje} (${total} sessão/ões)`, htmlBody);

    return new Response(JSON.stringify({ ok: true, total_eventos: total, data: dataISO }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    console.error('cronVistoriaAgenda error:', e.message);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
});
