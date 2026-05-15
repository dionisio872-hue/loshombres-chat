/**
 * RELATÓRIO EXPEDIENTE — LOS HOMBRES
 * Disparo às 19h via cron-job.org
 * 
 * ESCOPO:
 *   - Agenda completa do DIA ATUAL (hoje)
 *   - Agenda completa do DIA SEGUINTE (amanhã)
 *   - Divergências entre Planilha e Google Calendar (item por item via Telegram)
 *   - Confirmações para amanhã: Telegram se tiver chat_id, senão link wa.me clicável
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CRON_SECRET  = Deno.env.get('CRON_SECRET') || 'loshombres2026';
const BOT_TOKEN    = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
const CLIENT_TOKEN = Deno.env.get('TELEGRAM_CLIENT_BOT_TOKEN') || '';
const ADMIN_ID     = '7200577395';
const SHEET_ID     = '1XHF_Jw2dPtw9w8b5Eae3EmPK1CyBepjOyZ7JKWZd7Uk';
const DEST_EMAIL   = 'dionisio872@gmail.com';
const ABAS: Record<number,string> = {1:'JAN',2:'FEV',3:'MAR',4:'ABRI',5:'MAI',6:'JUN',7:'JUL',8:'AGO',9:'SET',10:'OUT',11:'NOV',12:'DEZ'};
const DIAS_SEMANA  = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

// ── HELPERS ────────────────────────────────────────────────────────────────
function normHora(h: string): string {
  if (!h) return '';
  const c = h.replace(/[hH]/, ':').replace(/\s/g, '');
  const p = c.split(':');
  const hh = p[0].replace(/\D/g, '');
  const mm = (p[1] || '00').replace(/\D/g, '').slice(0, 2) || '00';
  if (!hh || isNaN(Number(hh))) return '';
  return hh.padStart(2, '0') + ':' + mm.padStart(2, '0');
}

function horaMin(h: string): number {
  const n = normHora(h);
  if (!n) return -1;
  return parseInt(n.slice(0, 2)) * 60 + parseInt(n.slice(3));
}

function diaSemanaStr(dia: number, mes: number): string {
  const d = new Date(`2026-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}T12:00:00-03:00`);
  return DIAS_SEMANA[d.getDay()];
}

async function sendAdmin(text: string, token?: string) {
  const tk = token || BOT_TOKEN;
  if (!tk) return;
  try {
    await fetch(`https://api.telegram.org/bot${tk}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: ADMIN_ID, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
  } catch (e: any) { console.error('sendAdmin:', e.message); }
}

// ── LER PLANILHA ────────────────────────────────────────────────────────────
async function lerPlanilha(sheetsToken: string, dia: number, mes: number) {
  const aba = ABAS[mes] || 'MAI';
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${aba}!A1:I500`,
    { headers: { Authorization: `Bearer ${sheetsToken}` } }
  );
  const rows: string[][] = (await res.json()).values || [];
  const dStr = String(dia);
  const registros: { hora: string; nome: string; tel: string; servico: string; valor: string; linha: number }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = [...rows[i]]; while (r.length < 9) r.push('');
    const colA = (r[0] || '').trim();
    if (colA !== dStr && colA !== String(dia).padStart(2,'0')) continue;
    const colB = (r[1] || '').trim();
    const colG = (r[6] || '').trim();
    if (!colB && !colG) continue;
    registros.push({
      hora: normHora(colG) || colG,
      nome: colB,
      tel: (r[2] || '').trim(),
      servico: (r[3] || '').trim(),
      valor: (r[7] || '').trim(),
      linha: i + 1,
    });
  }
  return registros;
}

// ── LER CALENDAR ────────────────────────────────────────────────────────────
async function lerCalendar(calToken: string, dia: number, mes: number) {
  const dStr = `2026-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${dStr}T00:00:00-03:00&timeMax=${dStr}T23:59:59-03:00&singleEvents=true&orderBy=startTime`,
    { headers: { Authorization: `Bearer ${calToken}` } }
  );
  const items = (await res.json()).items || [];
  return items.map((ev: any) => {
    const dt = ev.start?.dateTime || ev.start?.date || '';
    const hora = dt.includes('T') ? normHora(dt.slice(11, 16)) : 'dia todo';
    const desc = (ev.description || '').replace(/<[^>]+>/g, '').replace(/\n+/g, ' ').trim().slice(0, 80);
    return {
      hora,
      titulo: ev.summary || '(sem título)',
      local: (ev.location || '').slice(0, 50),
      desc,
      id: ev.id,
    };
  });
}

// ── CRIAR EVENTO NO CALENDAR ────────────────────────────────────────────────
async function criarEvento(calToken: string, dia: number, mes: number, hora: string, titulo: string, desc: string) {
  const dStr = `2026-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
  const hh = hora.slice(0, 2); const mm = hora.slice(3, 5);
  const ini = new Date(`${dStr}T${hh}:${mm}:00-03:00`);
  const fim = new Date(ini.getTime() + 90 * 60000);
  const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: { Authorization: `Bearer ${calToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: titulo,
      description: desc,
      start: { dateTime: ini.toISOString(), timeZone: 'America/Sao_Paulo' },
      end:   { dateTime: fim.toISOString(), timeZone: 'America/Sao_Paulo' },
    }),
  });
  return r.ok;
}

// ── FORMATAR BLOCO DE AGENDA ────────────────────────────────────────────────
function formatarAgenda(
  dia: number, mes: number,
  planilha: Awaited<ReturnType<typeof lerPlanilha>>,
  calendar: Awaited<ReturnType<typeof lerCalendar>>
): string {
  const ds = DIAS_SEMANA[new Date(`2026-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}T12:00:00-03:00`).getDay()];
  const header = `📅 <b>${String(dia).padStart(2,'0')}/${String(mes).padStart(2,'0')} (${ds})</b>`;

  // Unir por hora
  const horarios = new Map<string, { nome: string; tel: string; servico: string; valor: string; fontes: string[] }>();

  for (const p of planilha) {
    if (!p.nome) continue;
    const key = p.hora || p.nome.slice(0, 6);
    const ex = horarios.get(key);
    if (ex) ex.fontes.push('📋');
    else horarios.set(key, { nome: p.nome, tel: p.tel, servico: p.servico, valor: p.valor, fontes: ['📋'] });
  }

  for (const c of calendar) {
    const key = c.hora;
    const ex = horarios.get(key);
    if (ex) { ex.fontes.push('📆'); if (!ex.servico && c.local) ex.servico = c.local; }
    else horarios.set(key, { nome: c.titulo, tel: '', servico: c.local, valor: '', fontes: ['📆'] });
  }

  if (horarios.size === 0) return `${header}\n   <i>Nenhum compromisso</i>`;

  const linhas: string[] = [header];
  const sorted = [...horarios.entries()].sort((a, b) => horaMin(a[0]) - horaMin(b[0]));

  for (const [hora, info] of sorted) {
    const fonte = info.fontes.join('');
    const telFmt = info.tel ? ` | 📱 ${info.tel}` : '';
    const servFmt = info.servico ? ` | ${info.servico.slice(0, 30)}` : '';
    const valFmt = info.valor ? ` | 💰 ${info.valor}` : '';
    linhas.push(`  ${hora || '??:??'} ${fonte} <b>${info.nome.slice(0, 35)}</b>${servFmt}${telFmt}${valFmt}`);
  }

  return linhas.join('\n');
}

// ── DETECTAR DIVERGÊNCIAS ───────────────────────────────────────────────────
function detectarDivergencias(
  dia: number, mes: number,
  planilha: Awaited<ReturnType<typeof lerPlanilha>>,
  calendar: Awaited<ReturnType<typeof lerCalendar>>
) {
  const divs: { tipo: 'so_calendar' | 'so_planilha'; hora: string; nome: string; tel: string; servico: string; desc: string }[] = [];

  // A) Só no Calendar
  for (const c of calendar) {
    const hora = c.hora;
    const diff = planilha.filter(p => p.nome).some(p => Math.abs(horaMin(p.hora) - horaMin(hora)) <= 45);
    if (!diff) {
      divs.push({ tipo: 'so_calendar', hora, nome: c.titulo, tel: c.desc, servico: c.local, desc: c.desc });
    }
  }

  // B) Só na Planilha
  for (const p of planilha) {
    if (!p.nome) continue;
    const diff = calendar.some(c => Math.abs(horaMin(c.hora) - horaMin(p.hora)) <= 45);
    if (!diff) {
      divs.push({ tipo: 'so_planilha', hora: p.hora, nome: p.nome, tel: p.tel, servico: p.servico, desc: '' });
    }
  }

  return divs;
}

// ── CONFIRMAÇÕES ─────────────────────────────────────────────────────────────
function gerarConfirmacoes(
  dia: number, mes: number,
  planilha: Awaited<ReturnType<typeof lerPlanilha>>,
  calendar: Awaited<ReturnType<typeof lerCalendar>>
): string {
  const ds = String(dia).padStart(2,'0');
  const ms = String(mes).padStart(2,'0');
  const linhas: string[] = [`\n📲 <b>CONFIRMAÇÕES AMANHÃ (${ds}/${ms})</b>\n`];

  // Unir dados dos dois
  const compromissos: { hora: string; nome: string; tel: string }[] = [];

  for (const p of planilha) {
    if (p.nome) compromissos.push({ hora: p.hora, nome: p.nome, tel: p.tel });
  }
  for (const c of calendar) {
    const jatem = compromissos.some(x => Math.abs(horaMin(x.hora) - horaMin(c.hora)) <= 45);
    if (!jatem) {
      // Extrair telefone da descrição do Calendar
      const telMatch = c.desc.match(/\d{10,11}/);
      const tel = telMatch ? telMatch[0] : '';
      compromissos.push({ hora: c.hora, nome: c.titulo, tel });
    }
  }

  compromissos.sort((a, b) => horaMin(a.hora) - horaMin(b.hora));

  for (const c of compromissos) {
    const tel = c.tel.replace(/\D/g, '');
    const temTel = tel.length >= 10;

    if (temTel) {
      // Tem número → link wa.me clicável + instrução de Telegram manual
      const telFmt = tel.startsWith('55') ? tel : `55${tel}`;
      const msg = encodeURIComponent(`Olá! Temos um compromisso agendado para amanhã, dia ${ds}/${ms}. Pode confirmar sua presença? 🙏`);
      const waLink = `https://wa.me/${telFmt}?text=${msg}`;
      linhas.push(
        `  ${c.hora} — <b>${c.nome.slice(0,30)}</b>\n` +
        `  📱 <a href="${waLink}">${c.tel} — toque para abrir WhatsApp</a>`
      );
    } else {
      // Sem contato → marcar como "sem canal disponível"
      linhas.push(
        `  ${c.hora} — <b>${c.nome.slice(0,30)}</b>\n` +
        `  ⚠️ Sem número registrado — confirmar manualmente`
      );
    }
  }

  if (compromissos.length === 0) linhas.push('  Nenhum compromisso com contato identificado.');
  return linhas.join('\n');
}

// ── HANDLER PRINCIPAL ────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret') || req.headers.get('x-cron-secret');
  if (secret !== CRON_SECRET) return new Response('Unauthorized', { status: 401 });

  try {
    const b = createClientFromRequest(req);

    // Tokens
    const [rs, rc] = await Promise.all([
      b.asServiceRole.connectors.getConnection('googlesheets').catch(() => ({ accessToken: '' })),
      b.asServiceRole.connectors.getConnection('googlecalendar').catch(() => ({ accessToken: '' })),
    ]);
    const sheetsToken = rs.accessToken || '';
    const calToken    = rc.accessToken || '';

    if (!sheetsToken || !calToken) {
      await sendAdmin('⚠️ Relatório 19h: tokens Google indisponíveis.');
      return new Response('token error', { status: 500 });
    }

    // Datas — hoje e amanhã (horário Brasília)
    const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const hoje  = { dia: agora.getDate(), mes: agora.getMonth() + 1 };
    const amDto = new Date(agora); amDto.setDate(amDto.getDate() + 1);
    const amanha = { dia: amDto.getDate(), mes: amDto.getMonth() + 1 };

    // Ler dados
    const [planHoje, calHoje, planAmanha, calAmanha] = await Promise.all([
      lerPlanilha(sheetsToken, hoje.dia, hoje.mes),
      lerCalendar(calToken, hoje.dia, hoje.mes),
      lerPlanilha(sheetsToken, amanha.dia, amanha.mes),
      lerCalendar(calToken, amanha.dia, amanha.mes),
    ]);

    // ── PARTE 1: AGENDA ──────────────────────────────────────────────────────
    const agendaHoje   = formatarAgenda(hoje.dia,   hoje.mes,   planHoje,   calHoje);
    const agendaAmanha = formatarAgenda(amanha.dia, amanha.mes, planAmanha, calAmanha);

    const msg1 = [
      `━━━━━━━━━━━━━━━━━━━━━`,
      `📊 <b>RELATÓRIO EXPEDIENTE — LOS HOMBRES</b>`,
      `🕐 Gerado às ${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}h`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      agendaHoje,
      ``,
      agendaAmanha,
    ].join('\n');

    await sendAdmin(msg1);

    // ── PARTE 2: CONFIRMAÇÕES ────────────────────────────────────────────────
    const confirmacoes = gerarConfirmacoes(amanha.dia, amanha.mes, planAmanha, calAmanha);
    await sendAdmin(confirmacoes);

    // ── PARTE 3: DIVERGÊNCIAS — ITEM POR ITEM ───────────────────────────────
    await new Promise(r => setTimeout(r, 1500));

    const divHoje   = detectarDivergencias(hoje.dia,   hoje.mes,   planHoje,   calHoje);
    const divAmanha = detectarDivergencias(amanha.dia, amanha.mes, planAmanha, calAmanha);
    const todasDivs = [
      ...divHoje.map(d => ({ ...d, dia: hoje.dia, mes: hoje.mes })),
      ...divAmanha.map(d => ({ ...d, dia: amanha.dia, mes: amanha.mes })),
    ];

    if (todasDivs.length === 0) {
      await sendAdmin(`✅ <b>Nenhuma divergência detectada.</b> Planilha e Calendar estão sincronizados.`);
    } else {
      await sendAdmin(`⚠️ <b>${todasDivs.length} divergência(s) detectada(s).</b>\nVou apresentar cada uma para você decidir:`);
      await new Promise(r => setTimeout(r, 1000));

      for (let i = 0; i < todasDivs.length; i++) {
        const d = todasDivs[i];
        const ds = String(d.dia).padStart(2,'0');
        const ms = String(d.mes).padStart(2,'0');

        let texto = '';
        if (d.tipo === 'so_calendar') {
          texto = [
            `⚠️ <b>Divergência ${i+1}/${todasDivs.length}</b>`,
            ``,
            `📆 Existe no <b>Calendar</b>, mas <b>não está na Planilha</b>`,
            `📅 ${ds}/${ms} às ${d.hora}`,
            `👤 ${d.nome}`,
            d.tel ? `📱 ${d.tel}` : '',
            d.servico ? `🏷️ ${d.servico}` : '',
            ``,
            `O que deseja fazer?`,
            `👉 Responda neste chat:`,
            `  <code>incluir</code> → adiciono na Planilha`,
            `  <code>excluir</code> → removo do Calendar`,
            `  <code>ignorar</code> → deixo como está`,
          ].filter(x => x !== null && x !== '').join('\n');
        } else {
          texto = [
            `⚠️ <b>Divergência ${i+1}/${todasDivs.length}</b>`,
            ``,
            `📋 Existe na <b>Planilha</b>, mas <b>não está no Calendar</b>`,
            `📅 ${ds}/${ms} às ${d.hora}`,
            `👤 ${d.nome}`,
            d.tel ? `📱 ${d.tel}` : '',
            d.servico ? `🏷️ ${d.servico}` : '',
            ``,
            `O que deseja fazer?`,
            `👉 Responda neste chat:`,
            `  <code>criar</code> → crio evento no Calendar`,
            `  <code>ignorar</code> → deixo como está`,
          ].filter(x => x !== null && x !== '').join('\n');
        }

        await sendAdmin(texto);

        // Aguardar resposta (30 segundos por item)
        let resposta = '';
        const timeout = Date.now() + 30000;
        while (Date.now() < timeout) {
          await new Promise(r => setTimeout(r, 5000));
          try {
            const upd = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=-1&timeout=5`);
            const data = await upd.json();
            const msgs = (data.result || []).filter((u: any) =>
              u.message?.chat?.id?.toString() === ADMIN_ID &&
              u.message?.text &&
              Date.now() / 1000 - u.message.date < 60
            );
            if (msgs.length > 0) {
              resposta = msgs[msgs.length - 1].message.text.toLowerCase().trim();
              break;
            }
          } catch (_) {}
        }

        // Processar resposta
        if (d.tipo === 'so_calendar' && resposta === 'incluir') {
          // Adicionar na planilha
          const aba = ABAS[d.mes] || 'MAI';
          await sendAdmin(`⏳ Incluindo na planilha...`);
          // Buscar linha correta na planilha
          const planRes = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${aba}!A1:H500`,
            { headers: { Authorization: `Bearer ${sheetsToken}` } }
          );
          const rows: string[][] = (await planRes.json()).values || [];
          let linhaAlvo = -1;
          for (let j = 0; j < rows.length; j++) {
            const r = [...rows[j]]; while (r.length < 8) r.push('');
            const colA = (r[0] || '').trim();
            const colG = normHora((r[6] || '').trim());
            const colB = (r[1] || '').trim();
            if ((colA === String(d.dia) || colA === String(d.dia).padStart(2,'0')) && colG === d.hora && !colB) {
              linhaAlvo = j + 1; break;
            }
          }
          if (linhaAlvo > 0) {
            await fetch(
              `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${aba}!B${linhaAlvo}:D${linhaAlvo}?valueInputOption=USER_ENTERED`,
              { method: 'PUT', headers: { Authorization: `Bearer ${sheetsToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ range: `${aba}!B${linhaAlvo}:D${linhaAlvo}`, values: [[d.nome, d.tel, d.servico]] }) }
            );
            await sendAdmin(`✅ Incluído na planilha linha ${linhaAlvo}.`);
          } else {
            await sendAdmin(`⚠️ Não encontrei linha para ${d.hora} no dia ${d.dia}. Verifique manualmente.`);
          }

        } else if (d.tipo === 'so_planilha' && resposta === 'criar') {
          await sendAdmin(`⏳ Criando evento no Calendar...`);
          const ok = await criarEvento(calToken, d.dia, d.mes, d.hora, d.nome, d.tel ? `Tel: ${d.tel}\nServiço: ${d.servico}` : d.servico);
          await sendAdmin(ok ? `✅ Evento criado no Calendar para ${d.hora}.` : `❌ Erro ao criar evento. Verifique manualmente.`);

        } else if (resposta === 'ignorar' || resposta === '') {
          await sendAdmin(`↩️ Divergência ${i+1} ignorada.`);
        } else {
          await sendAdmin(`↩️ Resposta não reconhecida — divergência ${i+1} mantida sem alteração.`);
        }

        await new Promise(r => setTimeout(r, 1000));
      }

      await sendAdmin(`✅ <b>Revisão de divergências concluída.</b>`);
    }

    return new Response(JSON.stringify({ ok: true, divergencias: todasDivs.length }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (e: any) {
    console.error('cronRelatorioExpediente ERRO:', e.message);
    await sendAdmin(`❌ Erro no relatório 19h: ${e.message}`);
    return new Response('error', { status: 500 });
  }
});
