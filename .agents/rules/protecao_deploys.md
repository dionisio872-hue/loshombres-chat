# 🔒 REGRA ABSOLUTA — PROTEÇÃO DE DEPLOYS — LOS HOMBRES
**Ativado em:** 15/05/2026 às 16:03 (America/Sao_Paulo)

---

## ⛔ REGRA MÁXIMA — LER ANTES DE QUALQUER AÇÃO

**NUNCA apagar, sobrescrever ou quebrar o que já foi construído.**
**SEMPRE melhorar e complementar — nunca destruir para recriar.**

Qualquer alteração nos fluxos abaixo exige confirmação explícita de Jonathan antes de qualquer ação.

---

## Fluxos protegidos (confirmação OBRIGATÓRIA):
- `chatCliente` — fluxo de agendamento, pagamento PIX, envio de mídia, bloqueio de dias
- `telegramBot` — atendimento ao cliente, callbacks de divergência
- `cronRelatorioExpediente` — relatório das 19h, botões inline de correção
- `gravarAgendamento` — qualquer escrita na planilha ou Google Calendar
- `analisarPix` — validação de comprovantes via OpenAI Vision
- `cronVistoriaAgenda`, `cronReengajamento`, `cronAbandonados` — automações ativas

---

## Protocolo OBRIGATÓRIO antes de qualquer deploy:

**PASSO 1 — Avisar com clareza:**
```
⚠️ ALTERAÇÃO EM FLUXO CRÍTICO

Função: [NOME]
O que vai mudar: [descrição precisa]
O que pode ser afetado: [efeitos em cascata possíveis]
Versão atual: vXX (funcionando desde DD/MM/AAAA)

❓ Quer ver o estado atual antes de continuar?
✅ Confirmar alteração | ❌ Cancelar
```

**PASSO 2 — Aguardar resposta de Jonathan. Não prosseguir sem isso.**

**PASSO 3 — Se confirmado, fazer APENAS a mudança específica:**
- Nunca reescrever o arquivo inteiro para uma mudança pequena
- Usar substituição cirúrgica do trecho afetado
- Preservar todas as funcionalidades existentes

**PASSO 4 — Após deploy, verificar:**
- Testar os pontos críticos que poderiam ter sido afetados
- Confirmar que nada quebrou
- Registrar a nova versão no histórico de `.agents/rules/sistema_loshombres.md`

---

## O que é PROIBIDO sem confirmação:
- ❌ Reescrever função inteira para "simplificar"
- ❌ Remover qualquer funcionalidade existente
- ❌ Alterar lógica de gravação na planilha ou Calendar
- ❌ Mudar tom/personalidade do chatCliente
- ❌ Alterar regras de dias de atendimento por unidade
- ❌ Modificar IDs do Telegram, IDs da planilha, contas Google
- ❌ Fazer deploy sem avisar o que mudou
- ❌ Causar efeito cascata sem aviso sério prévio

## O que é PERMITIDO sem confirmação:
- ✅ Ler arquivos e funções para análise
- ✅ Criar NOVAS funções que não afetam as existentes
- ✅ Atualizar o painel e documentação
- ✅ Responder perguntas e sugerir melhorias (sem aplicar)
- ✅ Testar funções existentes sem alterar

---

## Modo de proteção ativado por Jonathan em 15/05/2026.
Esta regra é permanente e carrega automaticamente em toda sessão.
