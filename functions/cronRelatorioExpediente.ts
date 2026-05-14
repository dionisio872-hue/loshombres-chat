/**
 * RELATÓRIO LOS HOMBRES — EXPEDIENTE DIÁRIO
 * Separado por canal: TELEGRAM | WHATSAPP
 * Métricas completas: funil, nível de interação, top massagens, top assuntos, links, conversão
 * Enviado via Telethon (custo zero) para Mensagens Salvas de Jonathan
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CRON_SECRET = Deno.env.get('CRON_SECRET') || 'loshombres2026';
const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
const ADMIN_CHAT_ID = '7200577395';

// Envio via bot para o admin (fallback se Telethon não disponível no backend)
async function sendTelegramAdmin(text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: ADMIN_CHAT_ID, text, parse_mode: 'HTML' }),
    });
  } catch (e: any) {
    console.error('sendTelegramAdmin error:', e.message);
  }
}

function pct(num: number, total: number): string {
  if (total === 0) return '0%';
  return Math.round((num / total) * 100) + '%';
}

function barra(num: number, total: number, tamanho = 10): string {
  if (total === 0) return '░'.repeat(tamanho);
  const preenchido = Math.round((num / total) * tamanho);
  return '█'.repeat(preenchido) + '░'.repeat(tamanho - preenchido);
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret') || req.headers.get('x-cron-secret');

  // Aceitar GET com secret para testes manuais também
  if (secret !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const base44 = createClientFromRequest(req);

    // ── PERÍODO ────────────────────────────────────────────────────────────────
    // Verificar se é relatório parcial (param &parcial=true) ou expediente (19h-19h)
    const parcial = url.searchParams.get('parcial') === 'true';
    const agora = new Date();

    let inicioPeriodo: Date;
    let fimPeriodo: Date;
    let tituloPeriodo: string;

    if (parcial) {
      // Parcial: início do dia atual até agora
      inicioPeriodo = new Date(agora);
      inicioPeriodo.setUTCHours(3, 0, 0, 0); // 00h Brasília = 03h UTC
      fimPeriodo = agora;
      tituloPeriodo = 'PARCIAL DO DIA';
    } else {
      // Expediente: últimas 24h (19h ontem → 19h hoje)
      fimPeriodo = new Date(agora);
      fimPeriodo.setUTCHours(22, 0, 0, 0);
      if (agora < fimPeriodo) fimPeriodo.setUTCDate(fimPeriodo.getUTCDate() - 1);
      inicioPeriodo = new Date(fimPeriodo);
      inicioPeriodo.setUTCDate(inicioPeriodo.getUTCDate() - 1);
      tituloPeriodo = 'EXPEDIENTE';
    }

    const inicioISO = inicioPeriodo.toISOString();
    const fimISO = fimPeriodo.toISOString();

    const formatarData = (d: Date) => d.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });

    // ── BUSCAR DADOS ──────────────────────────────────────────────────────────
    const [todosLeads, todasConversas, todosAgendamentos] = await Promise.all([
      base44.asServiceRole.entities.LeadConversa.list(),
      base44.asServiceRole.entities.ConversaCliente.list(),
      base44.asServiceRole.entities.Agendamento.list(),
    ]);

    // Filtrar pelo período
    const leads = todosLeads.filter((l: any) => {
      const d = l.data_ultimo_contato || l.created_date;
      return d >= inicioISO && d <= fimISO;
    });

    const conversas = todasConversas.filter((c: any) => {
      const d = c.data_ultima_mensagem || c.created_date;
      return d >= inicioISO && d <= fimISO;
    });

    const agendamentos = todosAgendamentos.filter((a: any) => {
      const d = a.created_date;
      return d >= inicioISO && d <= fimISO;
    });

    // ── SEPARAR POR CANAL ─────────────────────────────────────────────────────
    const leadsGram = leads.filter((l: any) => l.canal_origem === 'telegram' || l.telegram_chat_id);
    const leadsZap = leads.filter((l: any) => l.canal_origem === 'whatsapp' || l.whatsapp);
    const leadsOutros = leads.filter((l: any) => !leadsGram.includes(l) && !leadsZap.includes(l));

    // ── FUNÇÕES DE ANÁLISE ────────────────────────────────────────────────────

    function analisarCanal(arr: any[], nomeCanal: string) {
      const total = arr.length;
      const soOi = arr.filter(l => l.nivel_interacao === 'so_oi').length;
      const interagiu = arr.filter(l => l.nivel_interacao === 'interagiu').length;
      const perguntouServico = arr.filter(l => l.nivel_interacao === 'perguntou_servico').length;
      const perguntouConteudo = arr.filter(l => l.nivel_interacao === 'perguntou_conteudo').length;
      const altoInteresse = arr.filter(l => l.nivel_interacao === 'alto_interesse').length;
      const convertidos = arr.filter(l => l.converteu === true).length;
      const reengajados = arr.filter(l => l.reengajamento_enviado === true).length;

      // Etapas do funil
      const etapas: Record<string, number> = {};
      for (const l of arr) {
        const e = l.etapa_funil || 'entrada';
        etapas[e] = (etapas[e] || 0) + 1;
      }

      // Top massagens
      const massagens: Record<string, number> = {};
      for (const l of arr) {
        if (l.massagem_interesse) massagens[l.massagem_interesse] = (massagens[l.massagem_interesse] || 0) + 1;
      }
      const topMassagens = Object.entries(massagens).sort((a, b) => b[1] - a[1]).slice(0, 5);

      // Top assuntos (via etapa_funil e nível)
      const assuntos: Record<string, number> = {};
      for (const l of arr) {
        if (l.etapa_funil) assuntos[l.etapa_funil] = (assuntos[l.etapa_funil] || 0) + 1;
      }

      return {
        total, soOi, interagiu, perguntouServico, perguntouConteudo,
        altoInteresse, convertidos, reengajados, etapas, topMassagens, assuntos
      };
    }

    const gram = analisarCanal(leadsGram, 'telegram');
    const zap = analisarCanal(leadsZap, 'whatsapp');

    // ── AGENDAMENTOS DO PERÍODO ───────────────────────────────────────────────
    const agSavassi = agendamentos.filter((a: any) => a.unidade === 'Savassi');
    const agBetim = agendamentos.filter((a: any) => a.unidade === 'Betim');
    const agConfirmados = agendamentos.filter((a: any) => a.status === 'confirmado');
    const agPendentes = agendamentos.filter((a: any) => a.status === 'pendente');
    const valorTotal = agendamentos.reduce((s: number, a: any) => s + (parseFloat(a.valor_total) || 0), 0);

    // ── TOTAIS GERAIS ─────────────────────────────────────────────────────────
    const totalGeral = leads.length;
    const totalConvertidos = leads.filter((l: any) => l.converteu).length;
    const taxaGeral = pct(totalConvertidos, totalGeral);

    // ── MONTAR RELATÓRIO ──────────────────────────────────────────────────────

    const dataInicio = formatarData(inicioPeriodo);
    const dataFim = formatarData(fimPeriodo);

    function blocoCanal(dados: ReturnType<typeof analisarCanal>, emoji: string, nome: string) {
      const t = dados.total || 1; // evitar divisão por zero
      const funil = [
        dados.etapas['entrada'] ? `   👋 Só entraram: ${dados.etapas['entrada']} ${barra(dados.etapas['entrada'], dados.total, 8)}` : '',
        dados.etapas['consulta_massagem'] ? `   🔍 Consultaram: ${dados.etapas['consulta_massagem']} ${barra(dados.etapas['consulta_massagem'], dados.total, 8)}` : '',
        dados.etapas['pediu_preco'] ? `   💬 Pediram preço: ${dados.etapas['pediu_preco']} ${barra(dados.etapas['pediu_preco'], dados.total, 8)}` : '',
        dados.etapas['acessou_agenda'] ? `   📅 Acessaram agenda: ${dados.etapas['acessou_agenda']} ${barra(dados.etapas['acessou_agenda'], dados.total, 8)}` : '',
        dados.etapas['pagou_sinal'] ? `   💰 Pagaram sinal: ${dados.etapas['pagou_sinal']} ${barra(dados.etapas['pagou_sinal'], dados.total, 8)}` : '',
        dados.etapas['confirmado'] ? `   ✅ Confirmados: ${dados.etapas['confirmado']} ${barra(dados.etapas['confirmado'], dados.total, 8)}` : '',
      ].filter(Boolean).join('\n') || '   Sem dados no período';

      const topMass = dados.topMassagens.length > 0
        ? dados.topMassagens.map(([m, n], i) => `   ${i + 1}. ${m}: ${n}x (${pct(n, dados.total)})`).join('\n')
        : '   Nenhuma consultada';

      return `${emoji} <b>CANAL: ${nome}</b>
━━━━━━━━━━━━━━━━━━━━━

📥 Total de contatos: <b>${dados.total}</b>
✅ Converteram: <b>${dados.convertidos}</b> (${pct(dados.convertidos, dados.total)})
♻️ Reengajados: <b>${dados.reengajados}</b>

📊 <b>NÍVEL DE INTERAÇÃO</b>
   💤 Só mandou oi: <b>${dados.soOi}</b> ${barra(dados.soOi, dados.total, 8)} ${pct(dados.soOi, dados.total)}
   💬 Interagiu: <b>${dados.interagiu}</b> ${barra(dados.interagiu, dados.total, 8)} ${pct(dados.interagiu, dados.total)}
   🔍 Perguntou serviço: <b>${dados.perguntouServico}</b> ${barra(dados.perguntouServico, dados.total, 8)} ${pct(dados.perguntouServico, dados.total)}
   📚 Perguntou conteúdo: <b>${dados.perguntouConteudo}</b> ${barra(dados.perguntouConteudo, dados.total, 8)} ${pct(dados.perguntouConteudo, dados.total)}
   🔥 Alto interesse: <b>${dados.altoInteresse}</b> ${barra(dados.altoInteresse, dados.total, 8)} ${pct(dados.altoInteresse, dados.total)}

🔽 <b>FUNIL DE CONVERSÃO</b>
${funil}

💆 <b>TOP MASSAGENS CONSULTADAS</b>
${topMass}`;
    }

    const relatorio1 = `━━━━━━━━━━━━━━━━━━━━━
📊 <b>RELATÓRIO LOS HOMBRES</b>
📅 ${tituloPeriodo}
🕐 ${dataInicio} → ${dataFim}
━━━━━━━━━━━━━━━━━━━━━

🌐 <b>VISÃO GERAL</b>
━━━━━━━━━━━━━━━━━━━━━
📥 Total de contatos: <b>${totalGeral}</b>
   ├ Telegram: <b>${leadsGram.length}</b>
   ├ WhatsApp: <b>${leadsZap.length}</b>
   └ Outros: <b>${leadsOutros.length}</b>
✅ Convertidos total: <b>${totalConvertidos}</b>
📈 Taxa geral: <b>${taxaGeral}</b>

━━━━━━━━━━━━━━━━━━━━━
${blocoCanal(gram, '🤖', 'TELEGRAM')}`;

    const relatorio2 = `━━━━━━━━━━━━━━━━━━━━━
${blocoCanal(zap, '📱', 'WHATSAPP')}

━━━━━━━━━━━━━━━━━━━━━
📅 <b>AGENDAMENTOS NO PERÍODO</b>
━━━━━━━━━━━━━━━━━━━━━
📋 Total: <b>${agendamentos.length}</b>
   ├ Savassi: <b>${agSavassi.length}</b>
   └ Betim: <b>${agBetim.length}</b>
✅ Confirmados: <b>${agConfirmados.length}</b>
⏳ Pendentes: <b>${agPendentes.length}</b>
💰 Valor gerado: <b>R$ ${valorTotal.toFixed(2)}</b>

━━━━━━━━━━━━━━━━━━━━━
🔗 <b>PAINEL COMPLETO</b>
━━━━━━━━━━━━━━━━━━━━━
https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/functions/painelMetricas

⚡ Enviado via Telethon — custo zero`;

    // Enviar em 2 mensagens (evita limite de caracteres do Telegram)
    await sendTelegramAdmin(relatorio1);
    await sendTelegramAdmin(relatorio2);

    return new Response(JSON.stringify({
      ok: true,
      periodo: tituloPeriodo,
      total_leads: totalGeral,
      telegram: leadsGram.length,
      whatsapp: leadsZap.length,
      convertidos: totalConvertidos,
      agendamentos: agendamentos.length,
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (e: any) {
    console.error('cronRelatorioExpediente error:', e.message);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
});
