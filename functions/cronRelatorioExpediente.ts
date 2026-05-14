/**
 * RELATÓRIO DIÁRIO DE EXPEDIENTE — Los Hombres
 * Roda todo dia às 19h (horário de Brasília)
 * Período: 19h do dia anterior até 19h do dia atual
 * Envia via Telegram para o Jonathan (admin)
 * SEM IA — 100% backend = crédito de integração apenas
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CRON_SECRET = Deno.env.get('CRON_SECRET') || 'loshombres2026';
const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
const ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') || '';
const PAINEL_URL = 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/functions/painelMetricas';

async function sendTelegram(chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });
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
    // 19h de hoje em Brasília = 22h UTC
    const fimPeriodo = new Date(agora);
    fimPeriodo.setUTCHours(22, 0, 0, 0);
    // Se ainda não chegou às 22h UTC (19h BRT), ajustar pro dia anterior
    if (agora < fimPeriodo) fimPeriodo.setUTCDate(fimPeriodo.getUTCDate() - 1);

    const inicioPeriodo = new Date(fimPeriodo);
    inicioPeriodo.setUTCDate(inicioPeriodo.getUTCDate() - 1); // exatamente 24h atrás

    const inicioISO = inicioPeriodo.toISOString();
    const fimISO = fimPeriodo.toISOString();

    // ── LER DADOS ──────────────────────────────────────────────────────────
    const [leads, conversas] = await Promise.all([
      base44.asServiceRole.entities.LeadConversa.list(),
      base44.asServiceRole.entities.ConversaCliente.list(),
    ]);

    // Filtrar pelo período
    const leadsNoPeriodo = leads.filter((l: any) => {
      const d = l.data_ultimo_contato || l.created_date;
      return d >= inicioISO && d <= fimISO;
    });

    const conversasNoPeriodo = conversas.filter((c: any) => {
      const d = c.data_ultima_mensagem || c.created_date;
      return d >= inicioISO && d <= fimISO;
    });

    // ── MÉTRICAS LEADS (Telegram bot) ──────────────────────────────────────
    const totalLeads = leadsNoPeriodo.length;

    // Por etapa do funil
    const etapas: Record<string, number> = {};
    for (const l of leadsNoPeriodo) {
      const e = l.etapa_funil || 'entrada';
      etapas[e] = (etapas[e] || 0) + 1;
    }

    // Convertidos (fecharam agendamento)
    const convertidos = leadsNoPeriodo.filter((l: any) => l.converteu === true).length;

    // Abandonados (chegaram mas não fecharam)
    const abandonados = leadsNoPeriodo.filter((l: any) =>
      l.etapa_funil === 'abandonou' || (!l.converteu && l.etapa_funil && l.etapa_funil !== 'entrada')
    ).length;

    // Só entraram (sem interação)
    const somenteEntrada = leadsNoPeriodo.filter((l: any) =>
      !l.etapa_funil || l.etapa_funil === 'entrada'
    ).length;

    // Reengajados (clientes antigos que voltaram)
    const reengajados = leadsNoPeriodo.filter((l: any) => l.reengajamento_enviado === true).length;

    // Massagens mais pedidas
    const massagens: Record<string, number> = {};
    for (const l of leadsNoPeriodo) {
      if (l.massagem_interesse) {
        const m = l.massagem_interesse;
        massagens[m] = (massagens[m] || 0) + 1;
      }
    }
    const topMassagens = Object.entries(massagens)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // Canal de origem
    const canais: Record<string, number> = {};
    for (const l of leadsNoPeriodo) {
      const c = l.canal_origem || 'direto';
      canais[c] = (canais[c] || 0) + 1;
    }

    // ── MÉTRICAS CONVERSAS (chat web) ──────────────────────────────────────
    const totalConversas = conversasNoPeriodo.length;
    const conversasFechadas = conversasNoPeriodo.filter((c: any) => c.status === 'agendou').length;
    const conversasNaoFechadas = conversasNoPeriodo.filter((c: any) => c.status === 'nao_fechou').length;
    const resgatesEnviados = conversasNoPeriodo.filter((c: any) => c.resgate_enviado === true).length;

    // Total mensagens enviadas (contar array mensagens)
    let totalMensagens = 0;
    for (const c of conversasNoPeriodo) {
      if (Array.isArray(c.mensagens)) totalMensagens += c.mensagens.length;
    }

    // ── TAXA DE CONVERSÃO ──────────────────────────────────────────────────
    const taxaConversao = totalLeads > 0 ? Math.round((convertidos / totalLeads) * 100) : 0;

    // ── FORMATAR DATA ──────────────────────────────────────────────────────
    const diaInicio = new Date(inicioISO).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
    const diaFim = new Date(fimISO).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });

    // ── MONTAR MENSAGEM ────────────────────────────────────────────────────
    const funil = [
      etapas['consulta_massagem'] ? `   ├ Consultaram massagem: ${etapas['consulta_massagem']}` : '',
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
👥 <b>LEADS (Telegram Bot)</b>
━━━━━━━━━━━━━━━━━━━━━
📥 Total de contatos: <b>${totalLeads}</b>
✅ Converteram (agendaram): <b>${convertidos}</b>
❌ Não fecharam: <b>${abandonados}</b>
👋 Só entraram (sem interação): <b>${somenteEntrada}</b>
♻️ Clientes antigos reengajados: <b>${reengajados}</b>
📈 Taxa de conversão: <b>${taxaConversao}%</b>

━━━━━━━━━━━━━━━━━━━━━
🔽 <b>FUNIL DE INTERAÇÃO</b>
━━━━━━━━━━━━━━━━━━━━━
${funil || '   Sem dados de funil'}

━━━━━━━━━━━━━━━━━━━━━
💆 <b>MASSAGENS MAIS PEDIDAS</b>
━━━━━━━━━━━━━━━━━━━━━
${topMassagensTexto}

━━━━━━━━━━━━━━━━━━━━━
📡 <b>CANAIS DE ORIGEM</b>
━━━━━━━━━━━━━━━━━━━━━
${canaisTexto}

━━━━━━━━━━━━━━━━━━━━━
💬 <b>CHAT WEB</b>
━━━━━━━━━━━━━━━━━━━━━
💬 Conversas iniciadas: <b>${totalConversas}</b>
✅ Agendamentos fechados: <b>${conversasFechadas}</b>
❌ Não fecharam: <b>${conversasNaoFechadas}</b>
♻️ Resgates enviados: <b>${resgatesEnviados}</b>
📨 Total de mensagens trocadas: <b>${totalMensagens}</b>

━━━━━━━━━━━━━━━━━━━━━
🔗 <b>PAINEL COMPLETO</b>
━━━━━━━━━━━━━━━━━━━━━
${PAINEL_URL}`;

    // Enviar para o admin no Telegram
    if (ADMIN_CHAT_ID) {
      await sendTelegram(ADMIN_CHAT_ID, relatorio);
    } else {
      console.log('ADMIN_CHAT_ID não configurado — relatório gerado mas não enviado');
      console.log(relatorio);
    }

    return new Response(JSON.stringify({
      ok: true,
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
