# 🔒 REGRA DE PROTEÇÃO DE DEPLOYS — LOS HOMBRES

## Aplicar SEMPRE antes de fazer deploy de qualquer função crítica

### Funções protegidas:
- `chatCliente` — fluxo principal de agendamento e pagamento
- `telegramBot` — atendimento ao cliente
- `cronRelatorioExpediente` — relatório diário das 19h
- `gravarAgendamento` — qualquer função que escreva na planilha ou Calendar

### Protocolo obrigatório:

**PASSO 1 — Antes de qualquer alteração, mostrar ao Jonathan:**
```
⚠️ ALTERAÇÃO EM FLUXO CRÍTICO

Você está prestes a modificar: [NOME DA FUNÇÃO]
Isso afeta: [listar impactos]

Estado atual: v[X] — [resumo do que está funcionando]

Tem certeza que quer continuar?
```

**PASSO 2 — Oferecer visualização:**
Sempre oferecer ver o estado atual antes de alterar.

**PASSO 3 — Só alterar após confirmação explícita de Jonathan.**

**PASSO 4 — Após alterar:**
- Atualizar a versão no cabeçalho do arquivo
- Registrar no histórico em `.agents/rules/sistema_loshombres.md`
- Fazer deploy apenas da parte alterada, sem reescrever o arquivo inteiro quando possível

### Regras de segurança no código:
- NUNCA reescrever uma função inteira para fazer uma mudança pequena
- SEMPRE usar substituição cirúrgica (replace de trecho específico)
- SEMPRE verificar que as funções críticas ainda existem após a alteração:
  `gravarAgendamento`, `buscarHorariosLivres`, `analisarHistorico`, `chamarIA`
- SEMPRE testar antes de confirmar ao Jonathan que está funcionando

### O que NÃO fazer:
- ❌ Reescrever o arquivo inteiro para "simplificar"
- ❌ Fazer deploy sem avisar o que mudou
- ❌ Remover funcionalidades existentes sem confirmação
- ❌ Alterar lógica de gravação na planilha sem validar colunas
