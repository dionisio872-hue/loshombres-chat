import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SPREADSHEET_ID = '1XHF_Jw2dPtw9w8b5Eae3EmPK1CyBepjOyZ7JKWZd7Uk';
const DEST_EMAIL = 'dionisio872@gmail.com';

const MES_ABAS: Record<number, string> = {
  1: 'JAN', 2: 'FEV', 3: 'MAR', 4: 'ABRI', 5: 'MAI',
  6: 'JUN', 7: 'JUL', 8: 'AGO', 9: 'SET', 10: 'OUT', 11: 'NOV', 12: 'DEZ'
};

// Colunas: A=Dia, B=Nome, C=Telefone, D=Serviço, E=Observações, F=Formulário, G=Hora, H=Pagamento, I=Valor Total

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      nome,
      telefone,
      servico,
      unidade,       // SAVASSI ou BETIM
      data_hora,     // ISO string ou "DD/MM/YYYY HH:MM"
      valor_total,
      sinal = 30,
      observacoes = '',
      formulario = ''
    } = body;

    if (!nome || !data_hora) {
      return Response.json({ error: 'nome e data_hora são obrigatórios' }, { status: 400 });
    }

    // Parse da data
    let dataObj: Date;
    if (data_hora.includes('T') || data_hora.includes('-')) {
      dataObj = new Date(data_hora);
    } else {
      // formato DD/MM/YYYY HH:MM
      const [datePart, timePart = '00:00'] = data_hora.split(' ');
      const [d, m, y] = datePart.split('/').map(Number);
      const [h, min] = timePart.split(':').map(Number);
      dataObj = new Date(y, m - 1, d, h, min);
    }

    const dia = dataObj.getDate();
    const mes = dataObj.getMonth() + 1;
    const ano = dataObj.getFullYear();
    const hora = `${String(dataObj.getHours()).padStart(2, '0')}:${String(dataObj.getMinutes()).padStart(2, '0')}`;
    const aba = MES_ABAS[mes];

    if (!aba) return Response.json({ error: `Mês ${mes} não encontrado nas abas` }, { status: 400 });

    const { accessToken: sheetsToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');
    const { accessToken: calToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const { accessToken: gmailToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    // ========== 1. VERIFICAR DUPLICIDADE NA PLANILHA ==========
    const sheetRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${aba}!A1:I500`,
      { headers: { Authorization: `Bearer ${sheetsToken}` } }
    );
    const sheetData = await sheetRes.json();
    const rows: string[][] = sheetData.values || [];

    const diaStr = String(dia);
    const diaStr2 = String(dia).padStart(2, '0');

    // Checar se já existe mesmo dia + hora + nome parecido
    const duplicado = rows.find(row => {
      const rowDia = row[0]?.toString().trim();
      const rowHora = row[6]?.toString().trim();
      const rowNome = row[1]?.toString().trim().toLowerCase();
      const mesmaData = rowDia === diaStr || rowDia === diaStr2;
      const mesmaHora = rowHora === hora;
      const mesmoNome = rowNome && rowNome.includes(nome.toLowerCase().split(' ')[0]);
      return mesmaData && (mesmaHora || mesmoNome);
    });

    if (duplicado) {
      return Response.json({
        ok: false,
        duplicidade: true,
        mensagem: `⚠️ Já existe registro para ${nome} no dia ${dia} às ${hora} na planilha.`,
        registro_existente: duplicado
      });
    }

    // ========== 2. VERIFICAR DUPLICIDADE NO CALENDAR ==========
    const startOfSlot = new Date(ano, mes - 1, dia, dataObj.getHours() - 1, 0, 0).toISOString();
    const endOfSlot = new Date(ano, mes - 1, dia, dataObj.getHours() + 2, 0, 0).toISOString();

    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startOfSlot}&timeMax=${endOfSlot}&singleEvents=true`,
      { headers: { Authorization: `Bearer ${calToken}` } }
    );
    const calData = await calRes.json();
    const eventosSobrepostos = (calData.items || []).filter((e: any) => e.status !== 'cancelled');

    // ========== 3. GRAVAR NA PLANILHA ==========
    const valorRestante = valor_total ? (parseFloat(String(valor_total).replace('R$', '').replace(',', '.').trim()) - sinal).toFixed(2).replace('.', ',') : '';
    const pagamentoObs = valor_total
      ? `Sinal R$${sinal},00 pago - falta R$${valorRestante}`
      : `Sinal R$${sinal},00 pago`;
    const valorFormatado = valor_total
      ? `R$ ${parseFloat(String(valor_total).replace('R$', '').replace(',', '.').trim()).toFixed(2).replace('.', ',')}`
      : '';
    const servicoCompleto = unidade ? `${servico} - ${unidade}` : servico;

    // Encontrar a próxima linha vazia após os registros do dia
    let insertRowIndex = -1;
    let lastDayRowIndex = -1;

    for (let i = 0; i < rows.length; i++) {
      const rowDia = rows[i][0]?.toString().trim();
      if (rowDia === diaStr || rowDia === diaStr2) {
        lastDayRowIndex = i;
      }
    }

    if (lastDayRowIndex >= 0) {
      insertRowIndex = lastDayRowIndex + 2; // linha após o último registro do dia
    } else {
      insertRowIndex = rows.length + 1;
    }

    const novaLinha = [
      diaStr,
      nome.toUpperCase(),
      telefone || '',
      servicoCompleto.toUpperCase(),
      observacoes,
      formulario,
      hora,
      pagamentoObs,
      valorFormatado
    ];

    // Append na planilha
    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${aba}!A:I:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${sheetsToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [novaLinha] })
      }
    );
    const appendResult = await appendRes.json();
    if (!appendRes.ok) {
      return Response.json({ error: 'Erro ao gravar na planilha', detail: appendResult }, { status: 500 });
    }

    // ========== 4. ENVIAR EMAIL DE NOTIFICAÇÃO ==========
    const dateLabel = `${diaStr2}/${String(mes).padStart(2, '0')}/${ano}`;
    const alertaSobreposicao = eventosSobrepostos.length > 0
      ? `<div style="background:#fff8e1; border-left:4px solid #f39c12; padding:10px; margin:10px 0; border-radius:4px;">
          <b>⚠️ Atenção:</b> Há ${eventosSobrepostos.length} evento(s) próximo(s) no Calendar:<br>
          ${eventosSobrepostos.map((e: any) => `• ${e.summary}`).join('<br>')}
         </div>`
      : '';

    const htmlEmail = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a2e; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin:0;">🔔 Novo Agendamento Confirmado</h2>
          <p style="margin:5px 0 0; opacity:0.8;">Estúdio Los Hombres</p>
        </div>
        <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #ddd;">
          ${alertaSobreposicao}
          <table style="width:100%; border-collapse:collapse;">
            <tr><td style="padding:8px; font-weight:bold; color:#555; width:35%;">👤 Cliente</td><td style="padding:8px;">${nome}</td></tr>
            <tr style="background:#fff;"><td style="padding:8px; font-weight:bold; color:#555;">📱 Telefone</td><td style="padding:8px;">${telefone || '-'}</td></tr>
            <tr><td style="padding:8px; font-weight:bold; color:#555;">💆 Serviço</td><td style="padding:8px;">${servico}</td></tr>
            <tr style="background:#fff;"><td style="padding:8px; font-weight:bold; color:#555;">📍 Unidade</td><td style="padding:8px;">${unidade || '-'}</td></tr>
            <tr><td style="padding:8px; font-weight:bold; color:#555;">📅 Data</td><td style="padding:8px;">${dateLabel} às ${hora}</td></tr>
            <tr style="background:#fff;"><td style="padding:8px; font-weight:bold; color:#555;">💰 Valor Total</td><td style="padding:8px;">${valorFormatado || '-'}</td></tr>
            <tr><td style="padding:8px; font-weight:bold; color:#555;">✅ Sinal Pago</td><td style="padding:8px;">R$ ${sinal},00</td></tr>
            <tr style="background:#fff;"><td style="padding:8px; font-weight:bold; color:#555;">💳 Restante</td><td style="padding:8px;">R$ ${valorRestante || '-'}</td></tr>
            ${observacoes ? `<tr><td style="padding:8px; font-weight:bold; color:#555;">📝 Obs</td><td style="padding:8px;">${observacoes}</td></tr>` : ''}
          </table>
          <div style="margin-top:15px; text-align:center;">
            <a href="https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit" style="background:#1a1a2e; color:white; padding:10px 20px; border-radius:5px; text-decoration:none; margin-right:10px;">Ver Planilha</a>
            <a href="https://calendar.google.com/calendar/u/2/r" style="background:#4285f4; color:white; padding:10px 20px; border-radius:5px; text-decoration:none;">Ver Calendar</a>
          </div>
          <hr style="margin-top:20px; border:none; border-top:1px solid #eee;">
          <p style="font-size:11px; color:#aaa; text-align:center;">Enviado automaticamente pelo seu assistente — Estúdio Los Hombres</p>
        </div>
      </div>
    `;

    const subject = `🔔 Novo agendamento: ${nome} — ${dateLabel} às ${hora}`;
    const emailContent = [
      `To: ${DEST_EMAIL}`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      htmlEmail
    ].join('\r\n');

    const encodedEmail = btoa(unescape(encodeURIComponent(emailContent)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${gmailToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: encodedEmail })
    });

    return Response.json({
      ok: true,
      mensagem: `Agendamento de ${nome} registrado na planilha (${aba}, dia ${dia} às ${hora}) e email enviado.`,
      sobreposicoes_calendar: eventosSobrepostos.length,
      planilha_linha: novaLinha
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
