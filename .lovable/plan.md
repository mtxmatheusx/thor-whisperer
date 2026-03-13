

## SDR.ai - Sistema de Prospecção para Paula Pimenta

### Fase 1: Fundação + Dashboard + Leads + Thor AI

**1. Autenticação**
- Login/signup com email/senha usando Lovable Cloud (Supabase Auth)
- Rota protegida — redireciona para login se não autenticado
- Página de reset de senha

**2. Layout e Navegação**
- Sidebar com navegação: Dashboard, Leads, Thor AI, Configurações
- Header com nome do usuário e logout
- Branding "SDR.ai - Paula Pimenta Speakers Bureau"
- Paleta azul (#3B82F6 primary) conforme design system especificado

**3. Dashboard Principal**
- Cards de métricas: Leads Ativos, Taxa Resposta, Reuniões Agendadas, Palestras Fechadas, Receita Gerada
- Pipeline visual (Kanban dos status dos leads)
- Atividade recente (últimas interações)
- Gráficos com Recharts (funil de conversão, receita mensal)
- Dados vindos do backend FastAPI (`VITE_API_URL`)

**4. Gestão de Leads (CRM)**
- Tabela de leads com filtros (status, fonte, indústria, score, busca)
- Modal de criação/edição de lead com todos os campos (nome, empresa, cargo, LinkedIn, etc.)
- Importação em massa via CSV
- Detalhes do lead com histórico de interações
- Tags e scoring visual
- Pipeline Kanban (drag & drop entre status)
- Paginação e ordenação

**5. Integração Thor AI**
- Painel de análise Thor AI por lead (botão "Analisar" que chama `/thor/analyze-prospect`)
- Exibição de: prioridade, pain points, abordagem sugerida, mensagem personalizada
- Geração de mensagem personalizada (`/thor/generate-message`)
- Insights da empresa e oportunidades de palestra
- Indicador de confiança da análise

**6. Integração API**
- ApiClient configurado com `VITE_API_URL` e `VITE_THOR_AI_ENDPOINT`
- Hooks React: `useLeads`, `useThorAPI` conectando ao backend FastAPI existente
- Tratamento de erros e loading states
- React Query para cache e sincronização

**7. Tipos TypeScript**
- Todos os tipos do arquivo `tipos_typescript.ts` implementados (Lead, Campaign, ThorAnalysis, Interaction, etc.)

