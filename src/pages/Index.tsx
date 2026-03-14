import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLeads } from '@/hooks/useLeads';
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, LeadStatus } from '@/types';
import { Users, MessageSquare, Calendar, Trophy, DollarSign, TrendingUp, Loader2, Brain, Sparkles, Mail, Phone, Send, FileText, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PIE_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#6366f1', '#f97316', '#059669', '#ef4444'];

const ACTIVITY_ICONS: Record<string, any> = {
  message_sent: Send,
  message_received: MessageSquare,
  connection_request: Users,
  connection_accepted: Users,
  meeting_scheduled: Calendar,
  proposal_sent: FileText,
  call_completed: Phone,
  note_added: FileText,
  thor_analysis: Brain,
  thor_message: Sparkles,
  email_sent: Mail,
};

const ACTIVITY_LABELS: Record<string, string> = {
  message_sent: 'Mensagem enviada',
  message_received: 'Mensagem recebida',
  connection_request: 'Solicitação de conexão',
  connection_accepted: 'Conexão aceita',
  meeting_scheduled: 'Reunião agendada',
  proposal_sent: 'Proposta enviada',
  call_completed: 'Ligação realizada',
  note_added: 'Nota adicionada',
  thor_analysis: 'Análise Thor AI',
  thor_message: 'Mensagem gerada por IA',
  email_sent: 'E-mail enviado',
};

export default function Dashboard() {
  const { leads, isLoading: leadsLoading } = useLeads();

  const { data: backendMetrics, isError: backendError } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => api.getDashboardOverview(),
    retry: 1,
    staleTime: 30000,
  });

  const { data: recentActivities = [] } = useQuery({
    queryKey: ['recent-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interactions')
        .select('*, leads!interactions_lead_id_fkey(name, company)')
        .order('created_at', { ascending: false })
        .limit(15);
      if (error) throw error;
      return data || [];
    },
    staleTime: 10000,
  });

  // Leads with thor_analysis (recent AI activity)
  const thorAnalyzedLeads = leads
    .filter(l => l.thor_analysis)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  const isLoading = leadsLoading;

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const activeLeads = backendMetrics?.activeLeads ?? leads.filter(l => !['closed', 'lost'].includes(l.status)).length;
  const closedDeals = backendMetrics?.closedDeals ?? leads.filter(l => l.status === 'closed').length;
  const meetings = backendMetrics?.meetingsScheduled ?? leads.filter(l => l.status === 'meeting').length;
  const proposals = backendMetrics?.proposalsSent ?? leads.filter(l => l.status === 'proposal').length;
  const totalRevenue = backendMetrics?.totalRevenue ?? leads.filter(l => l.status === 'closed').reduce((sum, l) => sum + (l.value || 0), 0);
  const responseRate = backendMetrics?.responseRate ?? (leads.length > 0
    ? Math.round((leads.filter(l => !['new'].includes(l.status)).length / leads.length) * 100)
    : 0);

  const statusData = Object.entries(
    leads.reduce((acc, l) => ({ ...acc, [l.status]: (acc[l.status] || 0) + 1 }), {} as Record<string, number>)
  ).map(([status, count]) => ({
    name: LEAD_STATUS_LABELS[status as LeadStatus] || status,
    value: count,
  }));

  const sourceData = Object.entries(
    leads.reduce((acc, l) => ({ ...acc, [l.source]: (acc[l.source] || 0) + 1 }), {} as Record<string, number>)
  ).map(([source, count]) => ({ name: source, leads: count }));

  const metrics = [
    { label: 'Leads Ativos', value: activeLeads, icon: Users, color: 'text-primary' },
    { label: 'Taxa Resposta', value: `${responseRate}%`, icon: MessageSquare, color: 'text-emerald-500' },
    { label: 'Reuniões', value: meetings, icon: Calendar, color: 'text-violet-500' },
    { label: 'Propostas', value: proposals, icon: TrendingUp, color: 'text-orange-500' },
    { label: 'Fechados', value: closedDeals, icon: Trophy, color: 'text-emerald-600' },
    { label: 'Receita', value: `R$ ${Number(totalRevenue).toLocaleString('pt-BR')}`, icon: DollarSign, color: 'text-primary' },
  ];

  const recentLeads = leads.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do pipeline de prospecção</p>
        </div>
        {!backendError && backendMetrics && (
          <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200">🟢 Backend conectado</Badge>
        )}
        {backendError && (
          <Badge variant="outline" className="text-xs text-muted-foreground">Dados locais</Badge>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map(m => (
          <Card key={m.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <m.icon className={`h-4 w-4 ${m.color}`} />
                <span className="text-xs text-muted-foreground">{m.label}</span>
              </div>
              <p className="text-xl font-bold">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Pipeline por Status</CardTitle></CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-12">Nenhum lead cadastrado</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Leads por Fonte</CardTitle></CardHeader>
          <CardContent>
            {sourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={sourceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="leads" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-12">Nenhum dado disponível</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SDR Activity Panel */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Atividades Recentes do SDR
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities.length > 0 ? (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {recentActivities.map((activity: any) => {
                  const Icon = ACTIVITY_ICONS[activity.type] || MessageSquare;
                  const leadInfo = activity.leads;
                  return (
                    <div key={activity.id} className="flex items-start gap-3 rounded-lg border p-3">
                      <div className="rounded-full bg-primary/10 p-1.5 mt-0.5">
                        <Icon className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{ACTIVITY_LABELS[activity.type] || activity.type}</p>
                        {leadInfo && (
                          <p className="text-xs text-muted-foreground truncate">{leadInfo.name} · {leadInfo.company}</p>
                        )}
                        {activity.content && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{activity.content}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{activity.platform}</Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Nenhuma atividade registrada ainda.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4" /> Análises Thor AI Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {thorAnalyzedLeads.length > 0 ? (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {thorAnalyzedLeads.map(lead => {
                  const analysis = lead.thor_analysis;
                  return (
                    <div key={lead.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">{lead.position} · {lead.company}</p>
                        </div>
                        <Badge className={
                          analysis?.priority === 'high' ? 'bg-emerald-100 text-emerald-800' :
                          analysis?.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {analysis?.priority === 'high' ? 'Alta' : analysis?.priority === 'medium' ? 'Média' : 'Baixa'}
                        </Badge>
                      </div>
                      {analysis?.approach && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{analysis.approach}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-muted">
                          <div className="h-1.5 rounded-full bg-primary" style={{ width: `${analysis?.confidence || 0}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{analysis?.confidence}% confiança</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Nenhuma análise Thor AI realizada ainda. Use o Thor AI para analisar seus leads.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Leads Recentes</CardTitle></CardHeader>
        <CardContent>
          {recentLeads.length > 0 ? (
            <div className="space-y-3">
              {recentLeads.map(lead => (
                <div key={lead.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-sm">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.company} · {lead.position}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={LEAD_STATUS_COLORS[lead.status] + ' text-xs'}>
                      {LEAD_STATUS_LABELS[lead.status]}
                    </Badge>
                    <span className="text-xs font-medium text-muted-foreground">Score: {lead.score}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">Nenhum lead cadastrado ainda. Vá para Leads para começar.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
