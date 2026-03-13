import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLeads } from '@/hooks/useLeads';
import { LEAD_STATUS_LABELS, LeadStatus } from '@/types';
import { Loader2, TrendingUp, DollarSign, Target, BarChart3 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  FunnelChart, Funnel, LabelList, Cell,
  LineChart, Line, PieChart, Pie, Legend, Area, AreaChart
} from 'recharts';

const FUNNEL_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#f97316', '#10b981', '#ef4444'];
const PLATFORM_COLORS = { linkedin: '#0077B5', instagram: '#E4405F', email: '#EA4335', referral: '#34A853' };

export default function AnalyticsPage() {
  const { leads, isLoading: leadsLoading } = useLeads();

  const { data: funnelData, isError: funnelError } = useQuery({
    queryKey: ['analytics-funnel'],
    queryFn: () => api.getFunnel(),
    retry: 1, staleTime: 30000,
  });

  const { data: platformData, isError: platformError } = useQuery({
    queryKey: ['analytics-platform'],
    queryFn: () => api.getPlatformPerformance(),
    retry: 1, staleTime: 30000,
  });

  const { data: revenueData, isError: revenueError } = useQuery({
    queryKey: ['analytics-revenue'],
    queryFn: () => api.getRevenue(),
    retry: 1, staleTime: 30000,
  });

  if (leadsLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const allBackendError = funnelError && platformError && revenueError;

  // Local funnel computation
  const statusOrder: LeadStatus[] = ['new', 'contacted', 'responded', 'qualified', 'meeting', 'proposal', 'closed'];
  const localFunnel = statusOrder.map(status => ({
    name: LEAD_STATUS_LABELS[status],
    value: leads.filter(l => l.status === status).length,
    status,
  }));

  const funnel = funnelData?.stages || localFunnel;

  // Local platform data
  const localPlatform = Object.entries(
    leads.reduce((acc, l) => ({ ...acc, [l.source]: (acc[l.source] || 0) + 1 }), {} as Record<string, number>)
  ).map(([platform, count]) => ({
    name: platform,
    leads: count,
    responses: leads.filter(l => l.source === platform && !['new'].includes(l.status)).length,
    meetings: leads.filter(l => l.source === platform && l.status === 'meeting').length,
    closed: leads.filter(l => l.source === platform && l.status === 'closed').length,
  }));

  const platforms = platformData?.platforms || localPlatform;

  // Local revenue data (monthly mock)
  const closedLeads = leads.filter(l => l.status === 'closed');
  const totalRevenue = closedLeads.reduce((sum, l) => sum + (l.value || 0), 0);
  const avgDealSize = closedLeads.length > 0 ? totalRevenue / closedLeads.length : 0;
  const totalLeads = leads.length;
  const conversionRate = totalLeads > 0 ? ((closedLeads.length / totalLeads) * 100).toFixed(1) : '0';
  const roi = totalRevenue > 0 ? ((totalRevenue / Math.max(totalLeads * 50, 1)) * 100).toFixed(0) : '0';

  const localRevenue = [
    { month: 'Jan', revenue: 0, deals: 0 },
    { month: 'Fev', revenue: 0, deals: 0 },
    { month: 'Mar', revenue: totalRevenue, deals: closedLeads.length },
  ];

  const revenue = revenueData?.monthly || localRevenue;

  // ROI metrics
  const roiMetrics = [
    { label: 'Receita Total', value: `R$ ${totalRevenue.toLocaleString('pt-BR')}`, icon: DollarSign, color: 'text-emerald-500' },
    { label: 'Ticket Médio', value: `R$ ${avgDealSize.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: 'text-primary' },
    { label: 'Taxa Conversão', value: `${conversionRate}%`, icon: Target, color: 'text-violet-500' },
    { label: 'ROI Estimado', value: `${roi}%`, icon: BarChart3, color: 'text-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics Avançado</h1>
          <p className="text-muted-foreground">Funil de conversão, ROI e performance por plataforma</p>
        </div>
        {!allBackendError && (
          <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200">🟢 Backend conectado</Badge>
        )}
        {allBackendError && (
          <Badge variant="outline" className="text-xs text-muted-foreground">Dados locais</Badge>
        )}
      </div>

      {/* ROI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {roiMetrics.map(m => (
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

      <Tabs defaultValue="funnel" className="space-y-4">
        <TabsList>
          <TabsTrigger value="funnel">Funil de Conversão</TabsTrigger>
          <TabsTrigger value="platform">Performance por Plataforma</TabsTrigger>
          <TabsTrigger value="revenue">Receita & ROI</TabsTrigger>
        </TabsList>

        {/* Funnel */}
        <TabsContent value="funnel">
          <Card>
            <CardHeader><CardTitle className="text-base">Funil de Conversão</CardTitle></CardHeader>
            <CardContent>
              {funnel.length > 0 && funnel.some((s: any) => s.value > 0) ? (
                <div className="space-y-6">
                  {/* Visual funnel bars */}
                  <div className="space-y-2">
                    {funnel.map((stage: any, i: number) => {
                      const maxVal = Math.max(...funnel.map((s: any) => s.value), 1);
                      const pct = (stage.value / maxVal) * 100;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-24 text-right">{stage.name}</span>
                          <div className="flex-1 h-8 bg-muted rounded overflow-hidden">
                            <div
                              className="h-full rounded flex items-center px-2 transition-all"
                              style={{ width: `${Math.max(pct, 5)}%`, backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }}
                            >
                              <span className="text-xs font-medium text-white">{stage.value}</span>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground w-12">{pct.toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Conversion between stages */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-3">Taxa de Conversão entre Etapas</h4>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                      {funnel.slice(0, -1).map((stage: any, i: number) => {
                        const next = funnel[i + 1];
                        const rate = stage.value > 0 ? ((next.value / stage.value) * 100).toFixed(0) : '0';
                        return (
                          <div key={i} className="text-center p-2 rounded bg-muted/50">
                            <p className="text-xs text-muted-foreground truncate">{stage.name} → {next.name}</p>
                            <p className="text-sm font-bold text-primary mt-1">{rate}%</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-12">Nenhum dado de funil disponível</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Platform Performance */}
        <TabsContent value="platform">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Leads por Plataforma</CardTitle></CardHeader>
              <CardContent>
                {platforms.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={platforms}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="leads" name="Leads" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="responses" name="Respostas" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="meetings" name="Reuniões" fill="hsl(263, 70%, 50%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="closed" name="Fechados" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-12">Sem dados</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Distribuição por Fonte</CardTitle></CardHeader>
              <CardContent>
                {platforms.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={platforms} cx="50%" cy="50%" outerRadius={100} dataKey="leads" label={({ name, leads: v }) => `${name}: ${v}`}>
                        {platforms.map((_: any, i: number) => (
                          <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-12">Sem dados</p>
                )}
              </CardContent>
            </Card>

            {/* Platform conversion table */}
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-base">Taxa de Conversão por Plataforma</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium text-muted-foreground">Plataforma</th>
                        <th className="text-center py-2 font-medium text-muted-foreground">Leads</th>
                        <th className="text-center py-2 font-medium text-muted-foreground">Respostas</th>
                        <th className="text-center py-2 font-medium text-muted-foreground">Reuniões</th>
                        <th className="text-center py-2 font-medium text-muted-foreground">Fechados</th>
                        <th className="text-center py-2 font-medium text-muted-foreground">Conv. %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {platforms.map((p: any, i: number) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 font-medium capitalize">{p.name}</td>
                          <td className="text-center py-2">{p.leads}</td>
                          <td className="text-center py-2">{p.responses}</td>
                          <td className="text-center py-2">{p.meetings}</td>
                          <td className="text-center py-2">{p.closed}</td>
                          <td className="text-center py-2">
                            <Badge variant="secondary">
                              {p.leads > 0 ? ((p.closed / p.leads) * 100).toFixed(0) : 0}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Revenue & ROI */}
        <TabsContent value="revenue">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-base">Evolução de Receita</CardTitle></CardHeader>
              <CardContent>
                {revenue.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={revenue}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(val: any) => `R$ ${Number(val).toLocaleString('pt-BR')}`} />
                      <Area type="monotone" dataKey="revenue" name="Receita" stroke="hsl(217, 91%, 60%)" fill="hsl(217, 91%, 60%)" fillOpacity={0.15} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-12">Sem dados de receita</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Deals Fechados por Mês</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={revenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="deals" name="Deals" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Resumo de ROI</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    { label: 'Total de leads', value: totalLeads },
                    { label: 'Deals fechados', value: closedLeads.length },
                    { label: 'Taxa de conversão', value: `${conversionRate}%` },
                    { label: 'Receita total', value: `R$ ${totalRevenue.toLocaleString('pt-BR')}` },
                    { label: 'Ticket médio', value: `R$ ${avgDealSize.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` },
                    { label: 'ROI estimado', value: `${roi}%` },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b last:border-0">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <span className="text-sm font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
