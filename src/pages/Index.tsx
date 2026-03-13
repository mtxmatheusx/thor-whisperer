import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLeads } from '@/hooks/useLeads';
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, LeadStatus } from '@/types';
import { Users, MessageSquare, Calendar, Trophy, DollarSign, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const PIE_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#6366f1', '#f97316', '#059669', '#ef4444'];

export default function Dashboard() {
  const { leads, isLoading: leadsLoading } = useLeads();

  // Try to fetch from backend API, fallback to local calculation
  const { data: backendMetrics, isError: backendError } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => api.getDashboardOverview(),
    retry: 1,
    staleTime: 30000,
  });

  const isLoading = leadsLoading;

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // Use backend data if available, otherwise compute locally
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
          <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200">
            🟢 Backend conectado
          </Badge>
        )}
        {backendError && (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Dados locais
          </Badge>
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
