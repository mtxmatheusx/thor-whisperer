import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import {
  FileText, User, Award, Mail, Phone, Linkedin, Instagram, Youtube,
  Calendar, Clock, MapPin, DollarSign, Download, Eye, Send, Sparkles, Globe
} from 'lucide-react';

const PAULA_BIO = {
  name: 'Paula Pimenta',
  title: 'Palestrante | Executiva | Mentora G4 Educação',
  summary: 'Mais de 25 anos de experiência em grandes empresas multinacionais: Natura, Danone, Cargill e Unilever. Por 3 anos, General Manager da The Body Shop para a América Latina. Atual Country Manager da Forever Living Products do Brasil.',
  achievements: [
    'Eleita Executiva do Ano 2020 pela ABT',
    'Premiada pela PUC como Liderança em 2021',
    '10+ premiações em Customer Experience (EXAME, Consumidor Moderno, Reclame Aqui, ABT)',
    'LinkedIn Creator: Top Voice CX & Business Strategy',
    'Membro do IBGC',
    'Co-autora do livro "A Liderança Desafiada"',
    'Coach pela Sociedade Latino-Americana de Coaching',
  ],
  education: [
    'Engenharia de Alimentos — PUC-GO',
    'Food Science — McGill University, Canadá',
    'Pós-graduação Gestão da Qualidade e Inovação — Mackenzie University',
  ],
  contact: {
    email: 'pimentpa@hotmail.com',
    phone: '(11) 94312-6169',
    linkedin: 'https://linkedin.com/in/paulavaliopimenta',
    instagram: '@paulavaliopimenta',
    site: 'paulavaliopimenta.com.br',
  },
};

const TALK_THEMES = [
  { id: 'lideranca', label: 'Liderança Transformadora', desc: 'Como desenvolver líderes que inspiram e entregam resultados' },
  { id: 'cx', label: 'Customer Experience', desc: 'Estratégias para criar experiências memoráveis' },
  { id: 'mulheres', label: 'Mulheres na Liderança', desc: 'Diversidade e empoderamento feminino no mundo corporativo' },
  { id: 'inovacao', label: 'Inovação e Transformação', desc: 'Como liderar em tempos de mudança acelerada' },
  { id: 'carreira', label: 'Carreira e Propósito', desc: 'Construindo uma carreira de impacto com autenticidade' },
  { id: 'custom', label: 'Tema Personalizado', desc: 'Conteúdo sob medida para o seu evento' },
];

const FORMATS = [
  { id: 'palestra', label: 'Palestra', duration: '60 min', price: 10000 },
  { id: 'keynote', label: 'Keynote', duration: '45 min', price: 10000 },
  { id: 'workshop', label: 'Workshop Executivo', duration: '2h', price: 20000 },
  { id: 'programa', label: 'Programa de Desenvolvimento', duration: '4 módulos', price: 35000 },
];

interface ProposalData {
  clientName: string;
  clientCompany: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  audience: string;
  theme: string;
  format: string;
  customNotes: string;
  language: string;
}

export default function Proposals() {
  const [activeTab, setActiveTab] = useState('generator');
  const [proposal, setProposal] = useState<ProposalData>({
    clientName: '',
    clientCompany: '',
    eventName: '',
    eventDate: '',
    eventLocation: '',
    audience: '',
    theme: '',
    format: 'palestra',
    customNotes: '',
    language: 'pt',
  });
  const [generatedProposal, setGeneratedProposal] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const selectedFormat = FORMATS.find(f => f.id === proposal.format);
  const selectedTheme = TALK_THEMES.find(t => t.id === proposal.theme);

  const handleGenerate = async () => {
    if (!proposal.clientName || !proposal.clientCompany || !proposal.theme || !proposal.format) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    // Simulate generation (replace with Thor AI endpoint later)
    await new Promise(r => setTimeout(r, 1500));

    const doc = `
═══════════════════════════════════════════════
          PROPOSTA DE PALESTRA
          Paula Pimenta
═══════════════════════════════════════════════

Para: ${proposal.clientName}
Empresa: ${proposal.clientCompany}
${proposal.eventName ? `Evento: ${proposal.eventName}` : ''}
${proposal.eventDate ? `Data sugerida: ${proposal.eventDate}` : 'Data sugerida: A definir'}
${proposal.eventLocation ? `Local: ${proposal.eventLocation}` : 'Local: A definir'}
Idioma: ${proposal.language === 'pt' ? 'Português' : proposal.language === 'en' ? 'Inglês' : 'Espanhol'}

───────────────────────────────────────────────
TEMA: ${selectedTheme?.label || proposal.theme}
───────────────────────────────────────────────
${selectedTheme?.desc || ''}

FORMATO: ${selectedFormat?.label}
Duração: ${selectedFormat?.duration}

${proposal.audience ? `PÚBLICO-ALVO: ${proposal.audience}` : ''}

───────────────────────────────────────────────
ESTRUTURA
───────────────────────────────────────────────
• Introdução — Apresentação e contextualização do tema
• Desenvolvimento — Conteúdo autoral com exemplos práticos e estudos de caso
• Dinâmica interativa — Engajamento com o público
• Conclusão — Reflexões finais e ações práticas
• Q&A — Abertura para perguntas

───────────────────────────────────────────────
INVESTIMENTO
───────────────────────────────────────────────
Valor: R$ ${selectedFormat?.price.toLocaleString('pt-BR')},00

Inclui:
✓ Conteúdo autoral e direcionado ao momento da equipe
✓ Presença integral de Paula Pimenta + assessor
✓ Apoio à condução, dinâmica e logística

Importante:
• Custos de deslocamento (aéreo/terrestre) são de responsabilidade da empresa contratante

Condições de pagamento:
• NF emitida em até 5 dias após o evento
• Prazo de pagamento: 30 dias

${proposal.customNotes ? `\nOBSERVAÇÕES:\n${proposal.customNotes}` : ''}

───────────────────────────────────────────────
SOBRE PAULA PIMENTA
───────────────────────────────────────────────
${PAULA_BIO.summary}

Destaques:
${PAULA_BIO.achievements.map(a => `• ${a}`).join('\n')}

───────────────────────────────────────────────
CONTATO
───────────────────────────────────────────────
E-mail: ${PAULA_BIO.contact.email}
Telefone: ${PAULA_BIO.contact.phone}
LinkedIn: ${PAULA_BIO.contact.linkedin}
Instagram: ${PAULA_BIO.contact.instagram}
Site: ${PAULA_BIO.contact.site}
    `.trim();

    setGeneratedProposal(doc);
    setGenerating(false);
    setActiveTab('preview');
    toast({ title: 'Proposta gerada com sucesso!' });
  };

  const handleCopy = () => {
    if (generatedProposal) {
      navigator.clipboard.writeText(generatedProposal);
      toast({ title: 'Proposta copiada!' });
    }
  };

  const handleDownload = () => {
    if (!generatedProposal) return;
    const blob = new Blob([generatedProposal], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Proposta_${proposal.clientCompany.replace(/\s/g, '_') || 'Palestra'}_Paula_Pimenta.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Download iniciado!' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Propostas de Palestra</h1>
          <p className="text-muted-foreground">Gere propostas profissionais para eventos e palestras</p>
        </div>
        <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
          <Sparkles className="h-3 w-3" /> Gerador Inteligente
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="generator" className="gap-1"><FileText className="h-3.5 w-3.5" /> Gerar Proposta</TabsTrigger>
          <TabsTrigger value="preview" className="gap-1" disabled={!generatedProposal}><Eye className="h-3.5 w-3.5" /> Visualizar</TabsTrigger>
          <TabsTrigger value="profile" className="gap-1"><User className="h-3.5 w-3.5" /> Perfil Paula</TabsTrigger>
          <TabsTrigger value="portfolio" className="gap-1"><Award className="h-3.5 w-3.5" /> Portfólio</TabsTrigger>
        </TabsList>

        {/* ── GENERATOR TAB ── */}
        <TabsContent value="generator" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Client Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Dados do Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Nome do contato *</Label>
                  <Input placeholder="João Silva" value={proposal.clientName} onChange={e => setProposal(p => ({ ...p, clientName: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Empresa *</Label>
                  <Input placeholder="Empresa ABC" value={proposal.clientCompany} onChange={e => setProposal(p => ({ ...p, clientCompany: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Público-alvo</Label>
                  <Input placeholder="Ex: Líderes de vendas, 200 pessoas" value={proposal.audience} onChange={e => setProposal(p => ({ ...p, audience: e.target.value }))} />
                </div>
              </CardContent>
            </Card>

            {/* Event Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Dados do Evento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Nome do evento</Label>
                  <Input placeholder="Convenção Anual 2026" value={proposal.eventName} onChange={e => setProposal(p => ({ ...p, eventName: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Data</Label>
                    <Input type="date" value={proposal.eventDate} onChange={e => setProposal(p => ({ ...p, eventDate: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Idioma</Label>
                    <Select value={proposal.language} onValueChange={v => setProposal(p => ({ ...p, language: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt">Português</SelectItem>
                        <SelectItem value="en">Inglês</SelectItem>
                        <SelectItem value="es">Espanhol</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Local</Label>
                  <Input placeholder="São Paulo, SP" value={proposal.eventLocation} onChange={e => setProposal(p => ({ ...p, eventLocation: e.target.value }))} />
                </div>
              </CardContent>
            </Card>

            {/* Theme */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Tema da Palestra *</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {TALK_THEMES.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => setProposal(p => ({ ...p, theme: theme.id }))}
                      className={`rounded-lg border p-3 text-left transition-all hover:border-primary/50 ${
                        proposal.theme === theme.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                          : 'border-border'
                      }`}
                    >
                      <p className="text-sm font-medium text-foreground">{theme.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{theme.desc}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Format */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Formato *</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {FORMATS.map(fmt => (
                    <button
                      key={fmt.id}
                      onClick={() => setProposal(p => ({ ...p, format: fmt.id }))}
                      className={`flex w-full items-center justify-between rounded-lg border p-3 transition-all hover:border-primary/50 ${
                        proposal.format === fmt.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                          : 'border-border'
                      }`}
                    >
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">{fmt.label}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {fmt.duration}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-primary">
                        R$ {fmt.price.toLocaleString('pt-BR')}
                      </span>
                    </button>
                  ))}
                </div>
                <Separator />
                <div className="space-y-1.5">
                  <Label>Observações adicionais</Label>
                  <Textarea
                    placeholder="Ex: A empresa está em processo de fusão e precisa de foco em gestão de mudanças..."
                    value={proposal.customNotes}
                    onChange={e => setProposal(p => ({ ...p, customNotes: e.target.value }))}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Button onClick={handleGenerate} disabled={generating} className="w-full gap-2" size="lg">
            <Sparkles className="h-4 w-4" />
            {generating ? 'Gerando proposta...' : 'Gerar Proposta'}
          </Button>
        </TabsContent>

        {/* ── PREVIEW TAB ── */}
        <TabsContent value="preview" className="mt-4 space-y-4">
          {generatedProposal && (
            <>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1">
                  <FileText className="h-3.5 w-3.5" /> Copiar
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1">
                  <Download className="h-3.5 w-3.5" /> Download
                </Button>
                <Button size="sm" className="gap-1">
                  <Send className="h-3.5 w-3.5" /> Enviar por E-mail
                </Button>
              </div>
              <Card>
                <CardContent className="p-6">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-foreground leading-relaxed">
                    {generatedProposal}
                  </pre>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── PROFILE TAB ── */}
        <TabsContent value="profile" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" /> {PAULA_BIO.name}
                </CardTitle>
                <CardDescription>{PAULA_BIO.title}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-foreground leading-relaxed">{PAULA_BIO.summary}</p>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Conquistas & Reconhecimentos</h4>
                  <ul className="space-y-1.5">
                    {PAULA_BIO.achievements.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Award className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" /> {a}
                      </li>
                    ))}
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Formação Acadêmica</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {PAULA_BIO.education.map((e, i) => (
                      <li key={i}>• {e}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <a href={`mailto:${PAULA_BIO.contact.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <Mail className="h-4 w-4" /> {PAULA_BIO.contact.email}
                </a>
                <a href={`tel:${PAULA_BIO.contact.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <Phone className="h-4 w-4" /> {PAULA_BIO.contact.phone}
                </a>
                <a href={PAULA_BIO.contact.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <Linkedin className="h-4 w-4" /> LinkedIn
                </a>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Instagram className="h-4 w-4" /> {PAULA_BIO.contact.instagram}
                </div>
                <a href={`https://${PAULA_BIO.contact.site}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <Globe className="h-4 w-4" /> {PAULA_BIO.contact.site}
                </a>
              </CardContent>
            </Card>
          </div>

          {/* PDF Images Gallery */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Media Kit</CardTitle>
              <CardDescription>Material visual para divulgação</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { src: '/images/paula-cover.jpg', label: 'Capa' },
                  { src: '/images/paula-bio.jpg', label: 'Bio' },
                  { src: '/images/paula-portfolio.jpg', label: 'Portfólio' },
                  { src: '/images/paula-awards.jpg', label: 'Premiações' },
                  { src: '/images/paula-proposal.jpg', label: 'Proposta' },
                  { src: '/images/paula-contact.jpg', label: 'Contato' },
                ].map(img => (
                  <div key={img.label} className="group relative overflow-hidden rounded-lg border border-border">
                    <img src={img.src} alt={img.label} className="w-full h-auto object-cover transition-transform group-hover:scale-105" />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <span className="text-xs font-medium text-white">{img.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PORTFOLIO TAB ── */}
        <TabsContent value="portfolio" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Temas de Palestra</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {TALK_THEMES.filter(t => t.id !== 'custom').map(theme => (
                  <div key={theme.id} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium text-foreground">{theme.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{theme.desc}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Formatos & Investimento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {FORMATS.map(fmt => (
                  <div key={fmt.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{fmt.label}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {fmt.duration}
                      </p>
                    </div>
                    <Badge variant="secondary" className="gap-1">
                      <DollarSign className="h-3 w-3" /> R$ {fmt.price.toLocaleString('pt-BR')}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Incluso em Todas as Propostas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    'Conteúdo autoral e personalizado',
                    'Presença integral + assessor',
                    'Dinâmica de grupo interativa',
                    'Apoio logístico no evento',
                  ].map(item => (
                    <div key={item} className="flex items-start gap-2 rounded-lg bg-primary/5 p-3">
                      <span className="text-primary text-sm">✓</span>
                      <span className="text-xs text-foreground">{item}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  * Custos de deslocamento (aéreo/terrestre) de Paula Pimenta e assessor são de responsabilidade da empresa contratante.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
