import { useState } from 'react';
import { useThorAI } from '@/hooks/useThorAI';
import { useLeads } from '@/hooks/useLeads';
import { Lead, ThorAnalysis, LEAD_STATUS_LABELS } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import {
  Brain, Loader2, Sparkles, Target, Lightbulb, MessageSquare,
  Building2, AlertCircle, Users, Zap, Copy, CheckCircle2
} from 'lucide-react';

export default function ThorAIPage() {
  const { leads } = useLeads();
  const { analyzing, generating, error, analyzeProspect, generateMessage } = useThorAI();
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [analysis, setAnalysis] = useState<ThorAnalysis | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'initial_outreach' | 'follow_up' | 'meeting_request' | 'proposal'>('initial_outreach');
  const [customInstructions, setCustomInstructions] = useState('');
  const [batchAnalyzing, setBatchAnalyzing] = useState(false);
  const [batchResults, setBatchResults] = useState<Array<{ lead: Lead; analysis: ThorAnalysis }>>([]);
  const [copied, setCopied] = useState(false);

  const selectedLead = leads.find(l => l.id === selectedLeadId);

  // Priority leads: new or contacted, sorted by score desc
  const priorityLeads = leads
    .filter(l => ['new', 'contacted'].includes(l.status))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const handleAnalyze = async () => {
    if (!selectedLead) return;
    try {
      const result = await analyzeProspect({
        name: selectedLead.name,
        company: selectedLead.company,
        position: selectedLead.position,
        linkedin: selectedLead.linkedin,
        industry: selectedLead.industry,
      });
      setAnalysis(result);
    } catch {}
  };

  const handleGenerateMessage = async () => {
    if (!selectedLead) return;
    try {
      const result = await generateMessage({
        lead: selectedLead,
        analysis: analysis || undefined,
        messageType,
        customInstructions: customInstructions || undefined,
      });
      setGeneratedMessage(result.message);
    } catch {}
  };

  const handleBatchAnalyze = async () => {
    const targets = priorityLeads.slice(0, 5);
    if (targets.length === 0) {
      toast({ title: 'Nenhum lead prioritário encontrado', variant: 'destructive' });
      return;
    }
    setBatchAnalyzing(true);
    const results: Array<{ lead: Lead; analysis: ThorAnalysis }> = [];
    for (const lead of targets) {
      try {
        const result = await analyzeProspect({
          name: lead.name,
          company: lead.company,
          position: lead.position,
          linkedin: lead.linkedin,
          industry: lead.industry,
        });
        results.push({ lead, analysis: result });
      } catch {
        // skip failed
      }
    }
    setBatchResults(results);
    setBatchAnalyzing(false);
    toast({ title: `${results.length} leads analisados!` });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const quickSelectAndAnalyze = async (lead: Lead) => {
    setSelectedLeadId(lead.id);
    try {
      const result = await analyzeProspect({
        name: lead.name,
        company: lead.company,
        position: lead.position,
        linkedin: lead.linkedin,
        industry: lead.industry,
      });
      setAnalysis(result);
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" /> Thor AI — Painel SDR
          </h1>
          <p className="text-muted-foreground">Análise inteligente e geração de mensagens para prospecção eficiente</p>
        </div>
        <Button onClick={handleBatchAnalyze} disabled={batchAnalyzing} variant="outline" className="gap-1">
          {batchAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          Análise em Lote (Top 5)
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-4 flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="individual">
        <TabsList>
          <TabsTrigger value="individual" className="gap-1"><Target className="h-3.5 w-3.5" /> Análise Individual</TabsTrigger>
          <TabsTrigger value="priority" className="gap-1"><Users className="h-3.5 w-3.5" /> Leads Prioritários</TabsTrigger>
          <TabsTrigger value="batch" className="gap-1" disabled={batchResults.length === 0}>
            <Zap className="h-3.5 w-3.5" /> Resultados em Lote ({batchResults.length})
          </TabsTrigger>
        </TabsList>

        {/* Individual Analysis */}
        <TabsContent value="individual" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Selecionar Lead</CardTitle>
              <CardDescription>Escolha um lead para analisar com Thor AI</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione um lead..." />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map(l => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name} — {l.company} ({LEAD_STATUS_LABELS[l.status]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAnalyze} disabled={!selectedLeadId || analyzing}>
                  {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                  Analisar
                </Button>
              </div>

              {selectedLead && (
                <div className="mt-4 rounded-lg border p-4 space-y-1">
                  <p className="font-medium">{selectedLead.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedLead.position} · {selectedLead.company}</p>
                  {selectedLead.industry && <p className="text-xs text-muted-foreground">Indústria: {selectedLead.industry}</p>}
                  {selectedLead.linkedin && (
                    <a href={selectedLead.linkedin} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                      Ver LinkedIn
                    </a>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Analysis Results */}
          {analysis && <AnalysisDisplay analysis={analysis} />}

          {/* Message Generator */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Gerar Mensagem
              </CardTitle>
              <CardDescription>Gere mensagens personalizadas com IA para enviar ao prospect</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Select value={messageType} onValueChange={v => setMessageType(v as any)}>
                  <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="initial_outreach">Primeiro Contato</SelectItem>
                    <SelectItem value="follow_up">Follow-up</SelectItem>
                    <SelectItem value="meeting_request">Agendar Reunião</SelectItem>
                    <SelectItem value="proposal">Proposta</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleGenerateMessage} disabled={!selectedLeadId || generating}>
                  {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                  Gerar
                </Button>
              </div>
              <Textarea
                placeholder="Instruções customizadas (opcional). Ex: mencionar evento recente, usar tom mais informal..."
                value={customInstructions}
                onChange={e => setCustomInstructions(e.target.value)}
                rows={2}
              />
              {generatedMessage && (
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Mensagem Gerada:</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 h-7"
                      onClick={() => handleCopy(generatedMessage)}
                    >
                      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Copiado!' : 'Copiar'}
                    </Button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{generatedMessage}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Priority Leads Tab */}
        <TabsContent value="priority" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" /> Leads Prioritários para Prospecção
              </CardTitle>
              <CardDescription>Leads novos e contatados, ordenados por score. Clique para analisar rapidamente.</CardDescription>
            </CardHeader>
            <CardContent>
              {priorityLeads.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum lead novo ou contatado encontrado.</p>
              ) : (
                <div className="space-y-2">
                  {priorityLeads.map(lead => (
                    <div key={lead.id} className="flex items-center justify-between rounded-lg border p-3 hover:border-primary/50 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.position} · {lead.company}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-12 rounded-full bg-muted">
                            <div className="h-2 rounded-full bg-primary" style={{ width: `${lead.score}%` }} />
                          </div>
                          <span className="text-xs font-medium w-8">{lead.score}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">{LEAD_STATUS_LABELS[lead.status]}</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 h-7"
                          onClick={() => quickSelectAndAnalyze(lead)}
                          disabled={analyzing}
                        >
                          {analyzing && selectedLeadId === lead.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          Analisar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Batch Results Tab */}
        <TabsContent value="batch" className="mt-4 space-y-4">
          {batchResults.map(({ lead, analysis: a }) => (
            <Card key={lead.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{lead.name} — {lead.company}</CardTitle>
                  <Badge className={
                    a.priority === 'high' ? 'bg-emerald-100 text-emerald-800' :
                    a.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }>
                    {a.priority === 'high' ? 'Alta' : a.priority === 'medium' ? 'Média' : 'Baixa'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{a.approach}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Confiança:</span>
                  <div className="h-2 w-20 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${a.confidence}%` }} />
                  </div>
                  <span className="text-xs font-medium">{a.confidence}%</span>
                </div>
                {a.personalizedMessage && (
                  <div className="rounded border bg-muted/30 p-3 mt-2">
                    <p className="text-xs font-medium mb-1">Mensagem sugerida:</p>
                    <p className="text-xs text-muted-foreground">{a.personalizedMessage}</p>
                    <Button size="sm" variant="ghost" className="h-6 mt-1 text-xs gap-1" onClick={() => handleCopy(a.personalizedMessage)}>
                      <Copy className="h-3 w-3" /> Copiar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AnalysisDisplay({ analysis }: { analysis: ThorAnalysis }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" /> Análise do Prospect
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Prioridade</span>
            <Badge className={
              analysis.priority === 'high' ? 'bg-emerald-100 text-emerald-800' :
              analysis.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }>
              {analysis.priority === 'high' ? 'Alta' : analysis.priority === 'medium' ? 'Média' : 'Baixa'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Confiança</span>
            <div className="flex items-center gap-2">
              <div className="h-2 w-24 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${analysis.confidence}%` }} />
              </div>
              <span className="text-xs font-medium">{analysis.confidence}%</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-1">Abordagem Sugerida</p>
            <p className="text-sm text-muted-foreground">{analysis.approach}</p>
          </div>
          <div>
            <p className="text-sm font-medium mb-1">Timing Recomendado</p>
            <p className="text-sm text-muted-foreground">{analysis.recommendedTiming}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4" /> Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {analysis.painPoints.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Pain Points</p>
              <ul className="space-y-1">
                {analysis.painPoints.map((p, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-1">
                    <span className="text-destructive mt-0.5">•</span> {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analysis.opportunities.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Oportunidades</p>
              <ul className="space-y-1">
                {analysis.opportunities.map((o, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-1">
                    <span className="text-emerald-500 mt-0.5">•</span> {o}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {analysis.companyInsights && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analysis.companyInsights.revenue && (
              <p className="text-sm"><span className="text-muted-foreground">Receita:</span> {analysis.companyInsights.revenue}</p>
            )}
            {analysis.companyInsights.employees && (
              <p className="text-sm"><span className="text-muted-foreground">Funcionários:</span> {analysis.companyInsights.employees}</p>
            )}
            {analysis.companyInsights.challenges?.map((c, i) => (
              <p key={i} className="text-sm text-muted-foreground">• {c}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {analysis.speakingOpportunities && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Oportunidades de Palestra
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analysis.speakingOpportunities.events?.map((e, i) => (
              <Badge key={i} variant="outline" className="mr-1">{e}</Badge>
            ))}
            {analysis.speakingOpportunities.topics?.map((t, i) => (
              <Badge key={i} variant="secondary" className="mr-1">{t}</Badge>
            ))}
            {analysis.speakingOpportunities.budget && (
              <p className="text-sm"><span className="text-muted-foreground">Budget:</span> {analysis.speakingOpportunities.budget}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
