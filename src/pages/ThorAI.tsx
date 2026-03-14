import { useState } from 'react';
import { useThorAI } from '@/hooks/useThorAI';
import { useLeads } from '@/hooks/useLeads';
import { Lead, ThorAnalysis, LEAD_STATUS_LABELS } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import {
  Brain, Loader2, Sparkles, Target, Lightbulb, MessageSquare,
  Building2, AlertCircle, Users, Zap, Copy, CheckCircle2,
  Search, UserPlus, Mail, Phone, Linkedin, MapPin, Download
} from 'lucide-react';

export default function ThorAIPage() {
  const { leads, createLead } = useLeads();
  const { analyzing, generating, error, analyzeProspect, generateMessage, extractProspects } = useThorAI();
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [analysis, setAnalysis] = useState<ThorAnalysis | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'initial_outreach' | 'follow_up' | 'meeting_request' | 'proposal'>('initial_outreach');
  const [customInstructions, setCustomInstructions] = useState('');
  const [batchAnalyzing, setBatchAnalyzing] = useState(false);
  const [batchResults, setBatchResults] = useState<Array<{ lead: Lead; analysis: ThorAnalysis }>>([]);
  const [copied, setCopied] = useState(false);

  // Extractor state
  const [extractQuery, setExtractQuery] = useState('');
  const [extractIndustry, setExtractIndustry] = useState('');
  const [extractPosition, setExtractPosition] = useState('');
  const [extractCompany, setExtractCompany] = useState('');
  const [extractLocation, setExtractLocation] = useState('');
  const [extractCompanySize, setExtractCompanySize] = useState('');
  const [extractEventType, setExtractEventType] = useState('');
  const [extractedProspects, setExtractedProspects] = useState<any[]>([]);
  const [extractSummary, setExtractSummary] = useState('');
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());

  const selectedLead = leads.find(l => l.id === selectedLeadId);
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
          name: lead.name, company: lead.company, position: lead.position,
          linkedin: lead.linkedin, industry: lead.industry,
        });
        results.push({ lead, analysis: result });
      } catch {}
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
        name: lead.name, company: lead.company, position: lead.position,
        linkedin: lead.linkedin, industry: lead.industry,
      });
      setAnalysis(result);
    } catch {}
  };

  const handleExtract = async () => {
    if (!extractQuery && !extractIndustry && !extractPosition && !extractCompany && !extractLocation) {
      toast({ title: 'Preencha ao menos um critério de busca', variant: 'destructive' });
      return;
    }
    try {
      const result = await extractProspects({
        query: extractQuery || undefined,
        industry: extractIndustry || undefined,
        position: extractPosition || undefined,
        company: extractCompany || undefined,
        location: extractLocation || undefined,
        company_size: extractCompanySize || undefined,
        event_type: extractEventType || undefined,
      });
      setExtractedProspects(result.prospects || []);
      setExtractSummary(result.search_summary || '');
      toast({ title: `${result.prospects?.length || 0} prospects encontrados!` });
    } catch {}
  };

  const handleSaveAsLead = async (prospect: any, index: number) => {
    setSavingIds(prev => new Set(prev).add(index));
    try {
      await createLead.mutateAsync({
        name: prospect.name,
        company: prospect.company,
        position: prospect.position,
        industry: prospect.industry || '',
        company_size: prospect.company_size || '',
        location: prospect.location || '',
        email: prospect.email || prospect.email_guess || '',
        linkedin: prospect.linkedin_url || prospect.linkedin_guess || '',
        phone: prospect.phone || prospect.phone_guess || '',
        score: prospect.score || 50,
        source: 'import' as const,
        status: 'new' as const,
        notes: `${prospect.reasoning}\n\nAbordagem: ${prospect.suggested_approach}`,
        tags: prospect.events_potential || [],
        value: 0,
      });
      toast({ title: `${prospect.name} salvo como lead!` });
    } catch {} finally {
      setSavingIds(prev => { const n = new Set(prev); n.delete(index); return n; });
    }
  };

  const handleSaveAll = async () => {
    let saved = 0;
    for (let i = 0; i < extractedProspects.length; i++) {
      if (savingIds.has(i)) continue;
      try {
        await handleSaveAsLead(extractedProspects[i], i);
        saved++;
      } catch {}
    }
    if (saved > 0) toast({ title: `${saved} prospects salvos como leads!` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" /> Thor AI — Painel SDR
          </h1>
          <p className="text-muted-foreground">Análise, extração de dados e geração de mensagens para prospecção</p>
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

      <Tabs defaultValue="extractor">
        <TabsList>
          <TabsTrigger value="extractor" className="gap-1"><Search className="h-3.5 w-3.5" /> Extrator de Dados</TabsTrigger>
          <TabsTrigger value="individual" className="gap-1"><Target className="h-3.5 w-3.5" /> Análise Individual</TabsTrigger>
          <TabsTrigger value="priority" className="gap-1"><Users className="h-3.5 w-3.5" /> Leads Prioritários</TabsTrigger>
          <TabsTrigger value="batch" className="gap-1" disabled={batchResults.length === 0}>
            <Zap className="h-3.5 w-3.5" /> Resultados em Lote ({batchResults.length})
          </TabsTrigger>
        </TabsList>

        {/* Data Extractor Tab */}
        <TabsContent value="extractor" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4" /> Buscar Prospects e Contatos
              </CardTitle>
              <CardDescription>
                Use IA para encontrar perfis, contatos e dados de prospects relevantes para prospecção.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Busca livre</label>
                <Input
                  placeholder="Ex: Diretores de RH em empresas de tecnologia em São Paulo"
                  value={extractQuery}
                  onChange={e => setExtractQuery(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Setor/Indústria</label>
                  <Input placeholder="Tecnologia, Saúde..." value={extractIndustry} onChange={e => setExtractIndustry(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Cargo/Função</label>
                  <Input placeholder="Diretor de RH, CEO..." value={extractPosition} onChange={e => setExtractPosition(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Empresa</label>
                  <Input placeholder="Nome da empresa" value={extractCompany} onChange={e => setExtractCompany(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Localização</label>
                  <Input placeholder="São Paulo, Curitiba..." value={extractLocation} onChange={e => setExtractLocation(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Porte da empresa</label>
                  <Select value={extractCompanySize} onValueChange={setExtractCompanySize}>
                    <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Qualquer</SelectItem>
                      <SelectItem value="startup">Startup</SelectItem>
                      <SelectItem value="pme">PME</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="grande">Grande</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Tipo de evento</label>
                  <Select value={extractEventType} onValueChange={setExtractEventType}>
                    <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Qualquer</SelectItem>
                      <SelectItem value="palestra">Palestra</SelectItem>
                      <SelectItem value="keynote">Keynote</SelectItem>
                      <SelectItem value="workshop">Workshop</SelectItem>
                      <SelectItem value="treinamento">Treinamento</SelectItem>
                      <SelectItem value="programa">Programa completo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleExtract} disabled={analyzing} className="gap-1">
                  {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Extrair Prospects
                </Button>
                {extractedProspects.length > 0 && (
                  <Button onClick={handleSaveAll} variant="outline" className="gap-1">
                    <Download className="h-4 w-4" /> Salvar Todos como Leads
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {extractSummary && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">{extractSummary}</p>
              </CardContent>
            </Card>
          )}

          {extractedProspects.length > 0 && (
            <div className="space-y-3">
              {extractedProspects.map((p, i) => (
                <Card key={i} className="hover:border-primary/30 transition-colors">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm">{p.name}</h3>
                          <Badge variant="outline" className="text-xs">{p.position}</Badge>
                          <div className="flex items-center gap-1.5 ml-auto">
                            <div className="h-2 w-14 rounded-full bg-muted">
                              <div className="h-2 rounded-full bg-primary" style={{ width: `${p.score}%` }} />
                            </div>
                            <span className="text-xs font-medium">{p.score}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {p.company}</span>
                          {p.industry && <span>· {p.industry}</span>}
                          {p.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.location}</span>}
                          {p.company_size && <Badge variant="secondary" className="text-[10px] h-4">{p.company_size}</Badge>}
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          {p.email_guess && (
                            <button onClick={() => handleCopy(p.email_guess)} className="flex items-center gap-1 text-primary hover:underline">
                              <Mail className="h-3 w-3" /> {p.email_guess}
                            </button>
                          )}
                          {p.phone_guess && (
                            <button onClick={() => handleCopy(p.phone_guess)} className="flex items-center gap-1 text-primary hover:underline">
                              <Phone className="h-3 w-3" /> {p.phone_guess}
                            </button>
                          )}
                          {p.linkedin_guess && (
                            <a href={p.linkedin_guess} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                              <Linkedin className="h-3 w-3" /> LinkedIn
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{p.reasoning}</p>
                        <p className="text-xs"><span className="font-medium">Abordagem:</span> {p.suggested_approach}</p>
                        {p.events_potential?.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {p.events_potential.map((ev: string, j: number) => (
                              <Badge key={j} variant="secondary" className="text-[10px]">{ev}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 shrink-0"
                        onClick={() => handleSaveAsLead(p, i)}
                        disabled={savingIds.has(i)}
                      >
                        {savingIds.has(i) ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                        Salvar Lead
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

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
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione um lead..." /></SelectTrigger>
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
                    <a href={selectedLead.linkedin} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Ver LinkedIn</a>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          {analysis && <AnalysisDisplay analysis={analysis} />}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Gerar Mensagem</CardTitle>
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
              <Textarea placeholder="Instruções customizadas (opcional)..." value={customInstructions} onChange={e => setCustomInstructions(e.target.value)} rows={2} />
              {generatedMessage && (
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Mensagem Gerada:</p>
                    <Button variant="ghost" size="sm" className="gap-1 h-7" onClick={() => handleCopy(generatedMessage)}>
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
              <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" /> Leads Prioritários</CardTitle>
              <CardDescription>Leads novos e contatados, ordenados por score.</CardDescription>
            </CardHeader>
            <CardContent>
              {priorityLeads.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum lead prioritário encontrado.</p>
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
                        <Button size="sm" variant="outline" className="gap-1 h-7" onClick={() => quickSelectAndAnalyze(lead)} disabled={analyzing}>
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
                  <Badge className={a.priority === 'high' ? 'bg-emerald-100 text-emerald-800' : a.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                    {a.priority === 'high' ? 'Alta' : a.priority === 'medium' ? 'Média' : 'Baixa'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{a.approach}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Confiança:</span>
                  <div className="h-2 w-20 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${a.confidence}%` }} /></div>
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
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" /> Análise do Prospect</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Prioridade</span>
            <Badge className={analysis.priority === 'high' ? 'bg-emerald-100 text-emerald-800' : analysis.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
              {analysis.priority === 'high' ? 'Alta' : analysis.priority === 'medium' ? 'Média' : 'Baixa'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Confiança</span>
            <div className="flex items-center gap-2">
              <div className="h-2 w-24 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${analysis.confidence}%` }} /></div>
              <span className="text-xs font-medium">{analysis.confidence}%</span>
            </div>
          </div>
          <div><p className="text-sm font-medium mb-1">Abordagem Sugerida</p><p className="text-sm text-muted-foreground">{analysis.approach}</p></div>
          <div><p className="text-sm font-medium mb-1">Timing Recomendado</p><p className="text-sm text-muted-foreground">{analysis.recommendedTiming}</p></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lightbulb className="h-4 w-4" /> Insights</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {analysis.painPoints.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Pain Points</p>
              <ul className="space-y-1">{analysis.painPoints.map((p, i) => <li key={i} className="text-sm text-muted-foreground flex items-start gap-1"><span className="text-destructive mt-0.5">•</span> {p}</li>)}</ul>
            </div>
          )}
          {analysis.opportunities.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Oportunidades</p>
              <ul className="space-y-1">{analysis.opportunities.map((o, i) => <li key={i} className="text-sm text-muted-foreground flex items-start gap-1"><span className="text-emerald-500 mt-0.5">•</span> {o}</li>)}</ul>
            </div>
          )}
        </CardContent>
      </Card>
      {analysis.companyInsights && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Empresa</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {analysis.companyInsights.revenue && <p className="text-sm"><span className="text-muted-foreground">Receita:</span> {analysis.companyInsights.revenue}</p>}
            {analysis.companyInsights.employees && <p className="text-sm"><span className="text-muted-foreground">Funcionários:</span> {analysis.companyInsights.employees}</p>}
            {analysis.companyInsights.challenges?.map((c, i) => <p key={i} className="text-sm text-muted-foreground">• {c}</p>)}
          </CardContent>
        </Card>
      )}
      {analysis.speakingOpportunities && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" /> Oportunidades de Palestra</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {analysis.speakingOpportunities.events?.map((e, i) => <Badge key={i} variant="outline" className="mr-1">{e}</Badge>)}
            {analysis.speakingOpportunities.topics?.map((t, i) => <Badge key={i} variant="secondary" className="mr-1">{t}</Badge>)}
            {analysis.speakingOpportunities.budget && <p className="text-sm"><span className="text-muted-foreground">Budget:</span> {analysis.speakingOpportunities.budget}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
