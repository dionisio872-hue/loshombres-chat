/**
 * RELATÓRIO DIÁRIO DE EXPEDIENTE — Los Hombres
 * Roda todo dia às 19h (horário de Brasília)
 * Período: 19h do dia anterior até 19h do dia atual
 * Envia via Telegram + WhatsApp (CallMeBot) para o Jonathan (admin)
 * SEM IA — 100% backend = crédito de integração apenas
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CRON_SECRET = Deno.env.get('CRON_SECRET') || 'loshombres2026';
const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
const ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') || '7200577395';
const CALLMEBOT_PHONE = Deno.env.get('CALLMEBOT_PHONE') || '';
const CALLMEBOT_APIKEY = Deno.env.get('CALLMEBOT_APIKEY') || '';
const PAINEL_URL = 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/functions/painelMetricas';

async function sendTelegram(chatId: string, text: string) {
  try {
    const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    const data = await resp.json();
    if (!data.ok) console.error('Telegram error:', JSON.stringify(data));
  } catch (e: any) {
    console.error('sendTelegram error:', e.message);
  }
}

async function sendWhatsApp(phone: string, apikey: string, text: string) {
  if (!phone || !apikey) {
    console.log('CallMeBot não configurado — pulando WhatsApp');
    return;
  }
  try {
    // Remover formatação HTML para WhatsApp
    const plainText = text
      .replace(/<b>/g, '*').replace(/<\/b>/g, '*')
      .replace(/<[^>]+>/g, '');
    const encoded = encodeURIComponent(plainText);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encoded}&apikey=${apikey}`;
    const resp = await fetch(url);
    const body = await resp.text();
    console.log('CallMeBot response:', body.substring(0, 100));
  } catch (e: any) {
    console.error('sendWhatsApp error:', e.message);
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret') || req.headers.get('x-cron-secret');
  if (secret !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const base44 = createClientFromRequest(req);

    // ── PERÍODO: 19h de ontem até 19h de hoje (horário Brasília = UTC-3) ──
    const agora = new Date();
    const fimPeriodo = new Date(agora);
    fimPeriodo.setUTCHours(22, 0, 0, 0);
    if (agora < fimPeriodo) fimPeriodo.setUTCDate(fimPeriodo.getUTCDate() - 1);

    const inicioPeriodo = new Date(fimPeriodo);
    inicioPeriodo.setUTCDate(inicioPeriodo.getUTCDate() - 1);

    const inicioISO = inicioPeriodo.toISOString();
    const fimISO = fimPeriodo.toISOString();

    // ── LER DADOS ──────────────────────────────────────────────────────────
    const [leads, conversas] = await Promise.all([
      base44.asServiceRole.entities.LeadConversa.list(),
      base44.asServiceRole.entities.ConversaCliente.list(),
    ]);

    const leadsNoPeriodo = leads.filter((l: any) => {
      const d = l.data_ultimo_contato || l.created_date;
      return d >= inicioISO && d <= fimISO;
    });

    const conversasNoPeriodo = conversas.filter((c: any) => {
      const d = c.data_ultima_mensagem || c.created_date;
      return d >= inicioISO && d <= fimISO;
    });

    // ── MÉTRICAS ───────────────────────────────────────────────────────────
    const totalLeads = leadsNoPeriodo.length;
    const etapas: Record<string, number> = {};
    for (const l of leadsNoPeriodo) {
      const e = l.etapa_funil || 'entrada';
      etapas[e] = (etapas[e] || 0) + 1;
    }
    const convertidos = leadsNoPeriodo.filter((l: any) => l.converteu === true).length;
    const abandonados = leadsNoPeriodo.filter((l: any) =>
      l.etapa_funil === 'abandonou' || (!l.converteu && l.etapa_funil && l.etapa_funil !== 'entrada')
    ).length;
    const somenteEntrada = leadsNoPeriodo.filter((l: any) =>
      !l.etapa_funil || l.etapa_funil === 'entrada'
    ).length;
    const reengajados = leadsNoPeriodo.filter((l: any) => l.reengajamento_enviado === true).length;

    const massagens: Record<string, number> = {};
    for (const l of leadsNoPeriodo) {
      if (l.massagem_interesse) {
        massagens[l.massagem_interesse] = (massagens[l.massagem_interesse] || 0) + 1;
      }
    }
    const topMassagens = Object.entries(massagens).sort((a, b) => b[1] - a[1]).slice(0, 3);

    const canais: Record<string, number> = {};
    for (const l of leadsNoPeriodo) {
      const c = l.canal_origem || 'direto';
      canais[c] = (canais[c] || 0) + 1;
    }

    const totalConversas = conversasNoPeriodo.length;
    const conversasFechadas = conversasNoPeriodo.filter((c: any) => c.status === 'agendou').length;
    const conversasNaoFechadas = conversasNoPeriodo.filter((c: any) => c.status === 'nao_fechou').length;
    const resgatesEnviados = conversasNoPeriodo.filter((c: any) => c.resgate_enviado === true).length;
    let totalMensagens = 0;
    for (const c of conversasNoPeriodo) {
      if (Array.isArray(c.mensagens)) totalMensagens += c.mensagens.length;
    }

    const taxaConversao = totalLeads > 0 ? Math.round((convertidos / totalLeads) * 100) : 0;

    const diaInicio = new Date(inicioISO).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
    const diaFim = new Date(fimISO).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });

    const funil = [
      etapas['consulta_massagem'] ? `   ├ Consultaram: ${etapas['consulta_massagem']}` : '',
      etapas['pediu_preco'] ? `   ├ Pediram preço: ${etapas['pediu_preco']}` : '',
      etapas['acessou_agenda'] ? `   ├ Acessaram agenda: ${etapas['acessou_agenda']}` : '',
      etapas['pagou_sinal'] ? `   ├ Pagaram sinal: ${etapas['pagou_sinal']}` : '',
      etapas['confirmado'] ? `   └ Confirmados: ${etapas['confirmado']}` : '',
    ].filter(Boolean).join('\n');

    const topMassagensTexto = topMassagens.length > 0
      ? topMassagens.map(([m, n], i) => `   ${i + 1}. ${m}: ${n}x`).join('\n')
      : '   Nenhum dado';

    const canaisTexto = Object.entries(canais).length > 0
      ? Object.entries(canais).map(([c, n]) => `   • ${c}: ${n}`).join('\n')
      : '   Nenhum dado';

    const relatorio = `📊 <b>RELATÓRIO DO EXPEDIENTE</b>
🕕 ${diaInicio} → ${diaFim}

━━━━━━━━━━━━━━━━━━━━━
👥 <b>LEADS (Bot Telegram)</b>
━━━━━━━━━━━━━━━━━━━━━
📥 Total de contatos: <b>${totalLeads}</b>
✅ Converteram: <b>${convertidos}</b>
❌ Não fecharam: <b>${abandonados}</b>
👋 Só entraram: <b>${somenteEntrada}</b>
♻️ Reengajados: <b>${reengajados}</b>
📈 Taxa de conversão: <b>${taxaConversao}%</b>

━━━━━━━━━━━━━━━━━━━━━
🔽 <b>FUNIL</b>
━━━━━━━━━━━━━━━━━━━━━
${funil || '   Sem dados'}

━━━━━━━━━━━━━━━━━━━━━
💆 <b>TOP MASSAGENS</b>
━━━━━━━━━━━━━━━━━━━━━
${topMassagensTexto}

━━━━━━━━━━━━━━━━━━━━━
📡 <b>CANAIS</b>
━━━━━━━━━━━━━━━━━━━━━
${canaisTexto}

━━━━━━━━━━━━━━━━━━━━━
💬 <b>CHAT WEB</b>
━━━━━━━━━━━━━━━━━━━━━
💬 Conversas: <b>${totalConversas}</b>
✅ Agendamentos: <b>${conversasFechadas}</b>
❌ Não fecharam: <b>${conversasNaoFechadas}</b>
♻️ Resgates: <b>${resgatesEnviados}</b>
📨 Mensagens trocadas: <b>${totalMensagens}</b>

━━━━━━━━━━━━━━━━━━━━━
🔗 Painel completo: ${PAINEL_URL}`;

    // Enviar Telegram
    await sendTelegram(ADMIN_CHAT_ID, relatorio);

    // Enviar WhatsApp (CallMeBot) — só se configurado
    await sendWhatsApp(CALLMEBOT_PHONE, CALLMEBOT_APIKEY, relatorio);

    return new Response(JSON.stringify({
      ok: true,
      canais_enviados: {
        telegram: !!ADMIN_CHAT_ID,
        whatsapp: !!(CALLMEBOT_PHONE && CALLMEBOT_APIKEY),
      },
      periodo: { inicio: inicioISO, fim: fimISO },
      metricas: {
        total_leads: totalLeads,
        convertidos,
        abandonados,
        taxa_conversao: taxaConversao,
        total_conversas: totalConversas,
        total_mensagens: totalMensagens,
      }
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (e: any) {
    console.error('cronRelatorioExpediente error:', e.message);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
});
