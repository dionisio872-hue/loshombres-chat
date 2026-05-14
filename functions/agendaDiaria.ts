import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SPREADSHEET_ID = '1XHF_Jw2dPtw9w8b5Eae3EmPK1CyBepjOyZ7JKWZd7Uk';
const DEST_EMAIL = 'joseassis_jr@yahoo.com.br'; // email principal encontrado na planilha

const MES_ABAS: Record<number, string> = {
  1: 'JAN', 2: 'FEV', 3: 'MAR', 4: 'ABRI', 5: 'MAI',
  6: 'JUN', 7: 'JUL', 8: 'AGO', 9: 'SET', 10: 'OUT', 11: 'NOV', 12: 'DEZ'
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function parseBRDate(day: string, hour: string, month: number, year: number): Date | null {
  try {
    const d = parseInt(day);
    const [h, m] = hour.replace('h', ':').split(':').map(Number);
    if (isNaN(d) || isNaN(h)) return null;
    return new Date(year, month - 1, d, h, m || 0);
  } catch { return null; }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Obter tokens
    const { accessToken: calToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const { accessToken: sheetsToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');
    const { accessToken: gmailToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    // Data de hoje em SP
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    const startOfDay = new Date(year, month - 1, day, 0, 0, 0).toISOString();
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59).toISOString();
    const dayStr = String(day).padStart(2, '0');
    const dateLabel = `${dayStr}/${String(month).padStart(2, '0')}/${year}`;

    // ========== 1. BUSCAR CALENDÁRIOS ==========
    const calListRes = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      { headers: { Authorization: `Bearer ${calToken}` } }
    );
    const calList = await calListRes.json();
    const calendars = (calList.items || []).filter((c: any) =>
      !['pt.brazilian#holiday@group.v.calendar.google.com'].includes(c.id)
    );

    // Buscar eventos de todos os calendários
    const calEventosMap: Record<string, any[]> = {};
    for (const cal of calendars) {
      const evRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?timeMin=${startOfDay}&timeMax=${endOfDay}&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${calToken}` } }
      );
      const evData = await evRes.json();
      const events = (evData.items || []).filter((e: any) => e.status !== 'cancelled');
      if (events.length > 0) calEventosMap[cal.summary] = events;
    }

    const todosEventosCal: any[] = Object.values(calEventosMap).flat();

    // ========== 2. BUSCAR PLANILHA ==========
    const aba = MES_ABAS[month] || 'MAI';
    const sheetRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${aba}!A1:H500`,
      { headers: { Authorization: `Bearer ${sheetsToken}` } }
    );
    const sheetData = await sheetRes.json();
    const rows: string[][] = sheetData.values || [];

    // Filtrar linhas do dia de hoje
    const linhasDia: any[] = [];
    for (const row of rows) {
      if (!row[0]) continue;
      const rowDay = row[0].toString().trim();
      if (rowDay === String(day) || rowDay === dayStr) {
        const nome = row[1]?.trim() || '';
        const telefone = row[2]?.trim() || '';
        const servico = row[3]?.trim() || '';
        const hora = row[6]?.trim() || '';
        const valor = row[7]?.trim() || '';
        if (nome || hora) {
          linhasDia.push({ nome, telefone, servico, hora, valor });
        }
      }
    }

    // ========== 3. DETECTAR DIVERGÊNCIAS ==========
    const divergencias: string[] = [];

    // Clientes na planilha que têm nome — verificar se há no Calendar
    const nomesCalendar = todosEventosCal.map((e: any) => {
      const match = e.summary?.match(/\(([^)]+)\)/);
      return match ? match[1].toLowerCase() : e.summary?.toLowerCase() || '';
    });

    for (const linha of linhasDia) {
      if (!linha.nome || linha.nome.toLowerCase().includes('feriado') || linha.nome.toLowerCase().includes('gravar')) continue;
      const nomeNorm = linha.nome.toLowerCase();
      const encontrado = nomesCalendar.some(n => n.includes(nomeNorm) || nomeNorm.includes(n.split(' ')[0]));
      if (!encontrado && linha.hora) {
        divergencias.push(`⚠️ Na planilha mas NÃO no Calendar: <b>${linha.nome}</b> às ${linha.hora}`);
      }
    }

    // Eventos no Calendar com cliente — verificar se há na planilha
    const nomesPlanilha = linhasDia.map(l => l.nome.toLowerCase());
    for (const ev of todosEventosCal) {
      const match = ev.summary?.match(/\(([^)]+)\)/);
      if (!match) continue;
      const nomeEv = match[1].toLowerCase();
      const encontrado = nomesPlanilha.some(n => n.includes(nomeEv.split(' ')[0]) || nomeEv.includes(n.split(' ')[0]));
      if (!encontrado) {
        const hora = ev.start?.dateTime ? new Date(ev.start.dateTime).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }) : '';
        divergencias.push(`⚠️ No Calendar mas NÃO na planilha: <b>${ev.summary}</b>${hora ? ' às ' + hora : ''}`);
      }
    }

    // ========== 4. MONTAR EMAIL ==========
    let htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a2e; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin:0;">📅 Agenda do Dia — ${dateLabel}</h2>
          <p style="margin:5px 0 0; opacity:0.8;">Estúdio Los Hombres</p>
        </div>
        <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #ddd;">
    `;

    // Seção Calendar
    htmlBody += `<h3 style="color:#1a1a2e; border-bottom: 2px solid #1a1a2e; padding-bottom: 5px;">🗓️ Google Calendar</h3>`;
    if (todosEventosCal.length === 0) {
      htmlBody += `<p style="color:#888;">Nenhum evento encontrado.</p>`;
    } else {
      // Agrupar por calendário
      for (const [calNome, eventos] of Object.entries(calEventosMap)) {
        htmlBody += `<p style="font-weight:bold; color:#555; margin:10px 0 5px;">📌 ${calNome}</p><ul style="margin:0; padding-left:20px;">`;
        for (const ev of eventos) {
          const hora = ev.start?.dateTime
            ? new Date(ev.start.dateTime).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
            : 'dia todo';
          htmlBody += `<li style="margin-bottom:4px;"><b>${hora}</b> — ${ev.summary || '(sem título)'}</li>`;
        }
        htmlBody += `</ul>`;
      }
    }

    // Seção Planilha
    htmlBody += `<h3 style="color:#1a1a2e; border-bottom: 2px solid #1a1a2e; padding-bottom: 5px; margin-top:20px;">📊 Planilha Excel (${aba})</h3>`;
    if (linhasDia.length === 0) {
      htmlBody += `<p style="color:#888;">Nenhum registro encontrado para hoje.</p>`;
    } else {
      htmlBody += `<ul style="margin:0; padding-left:20px;">`;
      for (const l of linhasDia) {
        if (!l.nome && !l.hora) continue;
        htmlBody += `<li style="margin-bottom:4px;"><b>${l.hora || '--:--'}</b> — ${l.nome || '(sem nome)'}${l.servico ? ' | ' + l.servico : ''}${l.valor ? ' | ' + l.valor : ''}</li>`;
      }
      htmlBody += `</ul>`;
    }

    // Seção Divergências
    htmlBody += `<h3 style="color: ${divergencias.length > 0 ? '#c0392b' : '#27ae60'}; border-bottom: 2px solid ${divergencias.length > 0 ? '#c0392b' : '#27ae60'}; padding-bottom: 5px; margin-top:20px;">${divergencias.length > 0 ? '🚨 Divergências Encontradas' : '✅ Sem Divergências'}</h3>`;
    if (divergencias.length > 0) {
      htmlBody += `<div style="background:#fff3f3; border-left: 4px solid #c0392b; padding: 12px; border-radius: 4px;"><ul style="margin:0; padding-left:20px;">`;
      for (const d of divergencias) {
        htmlBody += `<li style="margin-bottom:6px;">${d}</li>`;
      }
      htmlBody += `</ul></div>`;
      htmlBody += `<p style="margin-top:10px; font-size:13px; color:#666;">👉 Acesse sua agenda para corrigir: <a href="https://calendar.google.com/calendar/u/2/r">Google Calendar</a> | <a href="https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit">Planilha Excel</a></p>`;
    } else {
      htmlBody += `<p style="color:#27ae60;">Todas as agendas estão sincronizadas! 🎉</p>`;
    }

    htmlBody += `
        <hr style="margin-top:20px; border:none; border-top:1px solid #eee;">
        <p style="font-size:11px; color:#aaa; text-align:center;">Enviado automaticamente pelo seu assistente — Estúdio Los Hombres</p>
        </div></div>
    `;

    // ========== 5. ENVIAR EMAIL ==========
    const subject = divergencias.length > 0
      ? `🚨 Agenda ${dateLabel} — ${divergencias.length} divergência(s) encontrada(s)`
      : `✅ Agenda ${dateLabel} — ${todosEventosCal.length + linhasDia.length} compromisso(s) hoje`;

    const emailContent = [
      `To: ${DEST_EMAIL}`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      htmlBody
    ].join('\r\n');

    const encodedEmail = btoa(unescape(encodeURIComponent(emailContent)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${gmailToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: encodedEmail })
    });

    const sendResult = await sendRes.json();
    if (!sendRes.ok) {
      return Response.json({ error: 'Erro ao enviar email', detail: sendResult }, { status: 500 });
    }

    return Response.json({
      ok: true,
      data: dateLabel,
      eventos_calendar: todosEventosCal.length,
      registros_planilha: linhasDia.length,
      divergencias: divergencias.length,
      email_enviado: DEST_EMAIL
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
