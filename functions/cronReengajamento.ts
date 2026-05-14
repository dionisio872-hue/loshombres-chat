/**
 * CRON REENGAJAMENTO DE LEADS — Los Hombres
 * Roda diariamente via cron-job.org
 * Verifica LeadConversa sem conversão, monta email com sugestões de reengajamento
 * SEM IA — 100% backend function = crédito de integração apenas
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CRON_SECRET = Deno.env.get('CRON_SECRET') || 'loshombres2026';
const EMAIL_DESTINO = 'dionisio872@gmail.com';

const MENSAGENS_REENG: Record<string, string> = {
  'relaxante': 'Olá! Queria saber se você ainda tem interesse na Massagem Relaxante Sensual. Temos horários disponíveis essa semana na Savassi e Betim. O sinal é só R$ 30 para garantir. Posso te ajudar?',
  'tantrica': 'Olá! Você chegou a ver os detalhes da Tântrica Experience? É uma das mais procuradas aqui. Se quiser, posso te passar mais informações ou já verificar horários disponíveis.',
  'nuru': 'Olá! Vi que você perguntou sobre a Nuru Summa. É uma experiência incrível e temos vagas disponíveis. Quer reservar com o sinal de R$ 30?',
  'summa': 'Olá! A Summa Experientia é a nossa sessão mais completa. Temos protocolo rigoroso de segurança. Posso te confirmar disponibilidade de horário?',
  'default': 'Olá! Vi que você entrou em contato conosco pelo Telegram. Ainda posso te ajudar a escolher a massagem ideal ou verificar horários disponíveis. O que acha?',
};

function getMensagem(massagem: string | null): string {
  if (!massagem) return MENSAGENS_REENG.default;
  const m = massagem.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if (m.includes('relaxante')) return MENSAGENS_REENG.relaxante;
  if (m.includes('tantra') || m.includes('tantrica')) return MENSAGENS_REENG.tantrica;
  if (m.includes('nuru')) return MENSAGENS_REENG.nuru;
  if (m.includes('summa')) return MENSAGENS_REENG.summa;
  return MENSAGENS_REENG.default;
}

async function sendEmail(accessToken: string, to: string, subject: string, body: string) {
  const msg = [`To: ${to}`, `Subject: ${subject}`, `Content-Type: text/html; charset=utf-8`, ``, body].join('\n');
  const encoded = btoa(unescape(encodeURIComponent(msg))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: encoded }),
  });
  if (!res.ok) throw new Error(`Gmail: ${res.status} ${await res.text()}`);
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret') || req.headers.get('x-cron-secret');
  if (secret !== CRON_SECRET) return new Response('Unauthorized', { status: 401 });

  try {
    const base44 = createClientFromRequest(req);
    const agora = new Date();
    const limite24h = new Date(agora.getTime() - 24 * 3600 * 1000).toISOString();

    // Buscar leads não convertidos, com WhatsApp, sem reengajamento, com mais de 24h de silêncio
    const leads = await base44.asServiceRole.entities.LeadConversa.list();
    const candidatos = leads.filter((l: any) =>
      !l.converteu &&
      !l.reengajamento_enviado &&
      l.whatsapp &&
      l.data_ultimo_contato &&
      l.data_ultimo_contato < limite24h
    );

    if (candidatos.length === 0) {
      return new Response(JSON.stringify({ ok: true, msg: 'Nenhum lead para reengajar', total: 0 }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Montar email
    const dataHoje = agora.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day:'2-digit', month:'2-digit', year:'numeric' });

    const linhas = candidatos.map((l: any) => {
      const ultimoContato = new Date(l.data_ultimo_contato).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
      const horasAtras = Math.round((agora.getTime() - new Date(l.data_ultimo_contato).getTime()) / 3600000);
      const msg = getMensagem(l.massagem_interesse);
      const waLink = `https://wa.me/55${l.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`;
      return `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #eee;vertical-align:top">
          <b>${l.nome || 'Anônimo'}</b><br>
          <span style="color:#666;font-size:12px">📱 ${l.whatsapp}</span><br>
          <span style="color:#c9a84c;font-size:12px">💆 ${l.massagem_interesse || 'não especificada'}</span><br>
          <span style="color:#999;font-size:11px">⏱️ ${horasAtras}h atrás (${ultimoContato})</span>
        </td>
        <td style="padding:12px;border-bottom:1px solid #eee;vertical-align:top">
          <p style="background:#f0f8ff;padding:10px;border-radius:6px;font-size:13px;color:#333;margin:0 0 8px">${msg}</p>
          <a href="${waLink}" style="background:#25d366;color:#fff;padding:6px 14px;border-radius:20px;text-decoration:none;font-size:12px;font-weight:bold">📲 Enviar no WhatsApp</a>
        </td>
      </tr>`;
    }).join('');

    const htmlBody = `
<div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto">
  <div style="background:#1a1a2e;padding:20px;text-align:center">
    <h1 style="color:#c9a84c;margin:0;font-size:22px">LOS HOMBRES</h1>
    <p style="color:#8b949e;margin:4px 0 0;font-size:13px">Reengajamento de Leads — ${dataHoje}</p>
  </div>
  <div style="padding:24px;background:#f9f9f9">
    <p style="background:#fff3cd;padding:12px 16px;border-radius:8px;color:#856404;font-weight:bold">
      🔔 ${candidatos.length} lead(s) aguardando reengajamento
    </p>
    <p style="color:#666;font-size:13px;margin-bottom:16px">Clique em "Enviar no WhatsApp" para abrir a conversa com a mensagem já preenchida.</p>
    <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden">
      <thead>
        <tr style="background:#f0f0f0">
          <th style="padding:10px 12px;text-align:left;font-size:13px">Cliente</th>
          <th style="padding:10px 12px;text-align:left;font-size:13px">Mensagem sugerida</th>
        </tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>
    <p style="color:#999;font-size:11px;margin-top:20px;text-align:center">Gerado às ${agora.toLocaleTimeString('pt-BR', { timeZone:'America/Sao_Paulo' })} — Los Hombres Sistema</p>
  </div>
</div>`;

    // Pegar token Gmail
    const gmailRes = await base44.asServiceRole.connectors.getToken('gmail');
    const gmailToken = gmailRes?.access_token;
    if (!gmailToken) throw new Error('Token Gmail não disponível');

    await sendEmail(gmailToken, EMAIL_DESTINO, `🔔 ${candidatos.length} lead(s) para reengajar — Los Hombres`, htmlBody);

    // Marcar como reengajamento_enviado
    for (const l of candidatos) {
      await base44.asServiceRole.entities.LeadConversa.update(l.id, { reengajamento_enviado: true });
    }

    return new Response(JSON.stringify({ ok: true, total: candidatos.length }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    console.error('cronReengajamento error:', e.message);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
});
