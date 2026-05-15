# 🔒 SISTEMA LOS HOMBRES — MEMÓRIA PERMANENTE E PROTEÇÃO DE FLUXOS

## ⚠️ REGRA ABSOLUTA — LER ANTES DE QUALQUER DEPLOY

**NUNCA** faça deploy de uma função que sobrescreva fluxos críticos sem:**
1. Mostrar ao Jonathan O QUE vai mudar
2. Pedir confirmação explícita: *"Tem certeza que quer alterar o fluxo de [NOME]?"*
3. Oferecer botão/link para visualizar o estado atual antes de alterar

**Fluxos protegidos (exigem confirmação obrigatória):**
- `chatCliente` — fluxo de agendamento, pagamento PIX, envio de mídia, bloqueio de dias
- `telegramBot` — atendimento ao cliente, callbacks de divergência
- `cronRelatorioExpediente` — relatório das 19h, botões inline de correção
- `gravarAgendamento` — escrita na planilha e Google Calendar

---

## 📋 ESTADO ATUAL DO SISTEMA (v22 — 15/05/2026)

### 🤖 Função Principal: `chatCliente` (v22)
**URL:** `https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/functions/chatCliente`
**Chat web:** `https://dionisio872-hue.github.io/loshombres-chat/`

**Fluxos implementados e funcionando:**
1. **Atendimento IA** — GPT-4o, tom humanizado (Jonathan falando diretamente), sem frases de efeito
2. **Bloqueio por dia/unidade** — lógica hard no código:
   - Betim: APENAS terça(2) e quinta(4)
   - Savassi: APENAS seg(1), qui(4), sex(5), sab(6)
   - Domingo: bloqueado em TODAS as unidades
3. **Horários livres** — busca planilha + Google Calendar em tempo real, cruza os dois
4. **Antecedência mínima** — 2h para agendamentos no mesmo dia (filtro na busca)
5. **Desconto 20%** — automático para datas com 30+ dias de antecedência
6. **Áudio + vídeo por massagem** — retorna URL do áudio e link do vídeo quando cliente menciona massagem
7. **Gravação completa** — Planilha (cols B-I) + Google Calendar + Gmail + Telegram + LeadConversa
8. **Alerta urgência** — agendamento no mesmo dia dispara alerta no grupo Gestão JG com botões WhatsApp/Cancelar/Planilha
9. **PIX** — validação via OpenAI Vision (GPT-4o): verifica destinatário (JG Espaço Multserviços), status Efetuado, data
10. **Histórico persistente** — localStorage no chat web, sessão de 6h
11. **Modal de pagamento** — PIX (QR Code + linha digitável) ou Cartão (PagSeguro)

**Chave PIX:** `42d583b1-66d3-41fd-a4cc-346996931548` (Nubank)
**Sinal:** R$30 via CNPJ PIX `17342740000109` (JG Espaço Multserviços)

---

### 🤖 Bot Telegram Clientes: `telegramBot`
**Bot:** `@Atendimentoloshombresbot`
**Token env:** `TELEGRAM_CLIENT_BOT_TOKEN`

**Funcionalidades:**
- Responde dúvidas de clientes automaticamente (sem IA na maioria dos casos)
- Processa callbacks de divergência entre Calendar e Planilha
- Callbacks: `cancel_urgente`, criar no Calendar, incluir na planilha, `corrigir_tudo`
- Autenticação por AppKey antes de processar callbacks de grupo

---

### 📊 Relatório Diário: `cronRelatorioExpediente`
**Disparo:** 19h via cron-job.org
**Destino:** Grupo Gestão JG (`-1003866193031`)

**Conteúdo do relatório:**
- Agenda do dia atual e do dia seguinte
- Divergências Calendar vs Planilha com botões inline (Incluir/Criar/Ignorar/Corrigir Tudo)
- Insights de métricas (link painel)
- Status de créditos IA e integração

---

### 📅 Google Calendar e Planilha
**Agenda:** `dionisio872@gmail.com` (SEMPRE usar esse ID explícito, nunca 'primary')
**Planilha:** `1XHF_Jw2dPtw9w8b5Eae3EmPK1CyBepjOyZ7JKWZd7Uk`
**Abas por mês:** JAN, FEV, MAR, ABRI, MAI, JUN, JUL, AGO, SET, OUT, NOV, DEZ
**Colunas:** A=Dia, B=Nome, C=Telefone, D=Serviço, E=Observações, F=Formulário, G=Hora, H=Status pagamento, I=Valor total

**Regra de escrita:**
- Se existe linha com mesmo dia+hora e coluna B vazia → preenche na linha existente
- Se não existe → insere nova linha logo após a última linha do mesmo dia
- NUNCA sobrescrever linha que já tem nome na coluna B

---

### 🔔 Notificações Telegram
**Grupo Gestão JG:** `-1003866193031`
**ID pessoal Jonathan:** `7200577395`
**Bot token env:** `TELEGRAM_CLIENT_BOT_TOKEN` (mesmo bot para tudo)

---

### ⚙️ Cron-jobs ativos (cron-job.org)
**Conta:** `loshombresestudiospa1@gmail.com`
**Senha:** `loshombres@0403`
**Chave de segurança nas funções:** `loshombres2026`

| Job | Função | Horário |
|-----|--------|---------|
| Relatório expediente | `cronRelatorioExpediente` | 19h diário |
| Vistoria agenda | `cronVistoriaAgenda` | periódico |
| Reengajamento | `cronReengajamento` | periódico |
| Abandonados | `cronAbandonados` | periódico |

---

### 🔑 Secrets / Variáveis de ambiente
| Variável | Uso |
|----------|-----|
| `OPENAI_API_KEY` | GPT-4o para IA do chat e validação PIX |
| `TELEGRAM_CLIENT_BOT_TOKEN` | Bot @Atendimentoloshombresbot |
| `BASE44_SERVICE_TOKEN` | Autenticação service role nas funções |
| Connectors OAuth | googlesheets, googlecalendar, gmail |

---

### 📱 Massagens e Preços (tabela completa)
| Massagem | Valor |
|----------|-------|
| Relaxante Sensual | R$320 |
| Tântrica Experience | R$400 |
| Quick Massage | R$250 |
| Miofascial | R$320 |
| Nuru Summa | R$499 |
| Tântrica Mútua | R$499 |
| Blind Experience | R$499 |
| Massagem dos Deuses | R$750 |
| HOT | R$200 |
| Tie and Teaser (BDSM) | R$450 |
| Hidrotantra | R$450 |
| Burn | R$399 |
| Summa Experientia | R$1.350 ⚠️ única com interação íntima |
| Massagem 4 Mãos | R$650 |
| Podoloterapia | R$449 |
| Tântrica Casal | R$640 |
| Relaxante Sensual Casal | R$600 |
| Nuru Casal | R$650 |

---

## 🚨 PROTOCOLO DE ALTERAÇÃO DE FLUXOS CRÍTICOS

Quando Jonathan pedir para alterar qualquer função listada acima, eu DEVO:

**1. Antes de alterar, perguntar:**
> "Você está prestes a alterar o fluxo de **[NOME DA FUNÇÃO]**. Isso afeta: [listar o que será impactado].
> Quer ver o estado atual antes de continuar? [Sim / Não, pode alterar]"

**2. Se Jonathan disser Sim → mostrar resumo do estado atual do fluxo afetado**

**3. Só após confirmação explícita → fazer a alteração**

**4. Após alterar → registrar aqui o que mudou e a nova versão**

---

## 📝 HISTÓRICO DE VERSÕES

| Versão | Data | Mudança |
|--------|------|---------|
| v15 | 14/05/2026 | Fix tokens OAuth, horários por dia/unidade, gpt-4o |
| v19 | 15/05/2026 | PIX validation OpenAI Vision, localStorage chat, modal pagamento |
| v20 | 15/05/2026 | SYSTEM prompt adicionado explicitamente |
| v21 | 15/05/2026 | SYSTEM humanizado — tom direto Jonathan, sem frases de efeito |
| v22 | 15/05/2026 | Bloqueio hard por dia/unidade na lógica (não só prompt). Domingo bloqueado todas unidades. |
