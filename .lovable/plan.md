

# Plano: Busca de Eventos 2026 com Captura de Contatos Reais

## Problema Atual
A edge function `search-events` usa Gemini com Google Search grounding, mas:
- O prompt não enfatiza suficientemente eventos de 2026
- Os dados de contato (email/telefone) não são salvos automaticamente na tabela `event_contacts` ao importar
- Os resultados de contato não são exibidos de forma proeminente na UI

## Mudanças Planejadas

### 1. Atualizar Edge Function `search-events/index.ts`
- Reescrever o prompt para focar exclusivamente em eventos de **2026** (remover 2025)
- Enfatizar extração de dados de contato reais: email do organizador, telefone/WhatsApp, site oficial, LinkedIn
- Instruir a IA a buscar na página real do evento os dados de contato (não inventar)
- Usar modelo `gemini-2.5-flash` (mais recente) via Lovable AI em vez de API key hardcoded para maior confiabilidade

### 2. Salvar Contatos Automaticamente ao Importar
- Atualizar `useEventSearch.ts` para que ao importar eventos, os dados de contato (`organizer_name`, `organizer_email`, `organizer_phone`) sejam automaticamente inseridos na tabela `event_contacts`
- Isso elimina o passo manual de adicionar contatos depois

### 3. Melhorar Exibição de Contatos na UI
- No `SearchResultCard`, destacar email e telefone com ícones clicáveis (mailto, WhatsApp)
- Mostrar badge de "Contato disponível" quando há email/telefone
- No card do evento importado no Kanban, mostrar indicador de que há contatos vinculados

### Detalhes Técnicos

**Edge Function**: Trocar de Gemini API direto para Lovable AI (`google/gemini-2.5-flash`) que não requer API key. Manter Google Search grounding no prompt para resultados reais.

**Import flow**: Após inserir eventos na tabela `events`, fazer um segundo insert na `event_contacts` com os dados do organizador de cada evento importado.

**Arquivos modificados**:
- `supabase/functions/search-events/index.ts` — novo prompt focado 2026 + contatos + Lovable AI
- `src/hooks/useEventSearch.ts` — auto-inserir contatos ao importar
- `src/pages/EventsPage.tsx` — melhor exibição de contatos nos cards de resultado

