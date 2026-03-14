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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { jsPDF } from 'jspdf';
import {
  FileText, User, Award, Mail, Phone, Linkedin, Instagram,
  Calendar, Clock, MapPin, DollarSign, Download, Eye, Send, Sparkles, Globe, Loader2, Brain
} from 'lucide-react';

const PAULA_BIO = {
  name: 'Paula Pimenta',
  title: 'Palestrante | Executiva | Mentora G4 Educação',
  summary: 'Mais de 25 anos de experiência em grandes empresas multinacionais: Natura, Danone, Cargill e Unilever. Por 3 anos, General Manager da The Body Shop para a América Latina. Atual Country Manager da Forever Living Products do Brasil.',
  achievements: [
    'Eleita Executiva do Ano 2020 pela ABT',
    'Premiada pela PUC como Liderança em 2021',
     '10+ premiações em Liderança e Gestão (EXAME, Consumidor Moderno, Reclame Aqui, ABT)',
     'LinkedIn Creator: Top Voice Business Strategy',
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
    email: 'paula@paulapimenta.com.br',
    phone: '(11) 99999-9999',
    linkedin: 'https://linkedin.com/in/paulavaliopimenta',
    instagram: '@paulavaliopimenta',
    site: 'paulavaliopimenta.com.br',
  },
};

const TALK_THEMES = [
  { id: 'lideranca', label: 'Liderança Transformadora', desc: 'Como desenvolver líderes que inspiram e entregam resultados' },
  { id: 'autolideranca', label: 'Autoliderança', desc: 'Como liderar a si mesmo para alcançar resultados extraordinários' },
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

// Brand colors
const BRAND = {
  primary: '#C47B3B',      // warm orange/copper
  primaryDark: '#1B2A4A',  // dark navy
  text: '#222222',
  muted: '#666666',
  light: '#F5F0EB',
};

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
    clientName: '', clientCompany: '', eventName: '', eventDate: '',
    eventLocation: '', audience: '', theme: '', format: 'palestra',
    customNotes: '', language: 'pt',
  });
  const [generatedProposal, setGeneratedProposal] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailTo, setEmailTo] = useState('');

  const selectedFormat = FORMATS.find(f => f.id === proposal.format);
  const selectedTheme = TALK_THEMES.find(t => t.id === proposal.theme);

  // Generate proposal using Thor AI
  const handleGenerate = async () => {
    if (!proposal.clientName || !proposal.clientCompany || !proposal.theme || !proposal.format) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }
    setGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('thor-ai', {
        body: {
          action: 'generate-message',
          data: {
            lead: {
              name: proposal.clientName,
              company: proposal.clientCompany,
              position: '',
              industry: '',
            },
            messageType: 'proposal',
            customInstructions: `Gere uma proposta comercial COMPLETA e profissional para uma palestra/evento.

DADOS DO EVENTO:
- Cliente: ${proposal.clientName} da ${proposal.clientCompany}
- Evento: ${proposal.eventName || 'A definir'}
- Data: ${proposal.eventDate || 'A definir'}
- Local: ${proposal.eventLocation || 'A definir'}
- Público: ${proposal.audience || 'Executivos e líderes'}
- Tema: ${selectedTheme?.label} — ${selectedTheme?.desc}
- Formato: ${selectedFormat?.label} (${selectedFormat?.duration})
- Investimento: R$ ${selectedFormat?.price.toLocaleString('pt-BR')},00
- Idioma: ${proposal.language === 'pt' ? 'Português' : proposal.language === 'en' ? 'Inglês' : 'Espanhol'}
${proposal.customNotes ? `- Observações: ${proposal.customNotes}` : ''}

A proposta deve incluir:
1. Saudação personalizada ao cliente
2. Descrição detalhada do tema e abordagem
3. Estrutura da palestra (introdução, desenvolvimento, dinâmica, conclusão, Q&A)
4. Metodologia e diferenciais
5. Investimento e condições
6. Bio resumida de Paula Pimenta
7. Contato

Escreva de forma profissional, persuasiva e personalizada. NÃO use formato JSON. Escreva texto corrido e formatado.`,
          },
        },
      });

      if (error) throw error;

      // Parse AI response - may be JSON string or already parsed object
      let aiText = '';
      if (typeof data === 'string') {
        try {
          const parsed = JSON.parse(data);
          aiText = parsed.message || parsed.content || data;
        } catch {
          aiText = data;
        }
      } else {
        aiText = data?.message || data?.content || JSON.stringify(data);
      }
      // Convert escaped newlines to actual newlines
      aiText = aiText.replace(/\\n/g, '\n').replace(/\\\"/g, '"');

      // Build final proposal with header/footer
      const doc = `═══════════════════════════════════════════════
          PROPOSTA COMERCIAL
          Paula Pimenta
═══════════════════════════════════════════════

Para: ${proposal.clientName}
Empresa: ${proposal.clientCompany}
${proposal.eventName ? `Evento: ${proposal.eventName}` : ''}
${proposal.eventDate ? `Data: ${proposal.eventDate}` : 'Data: A definir'}
${proposal.eventLocation ? `Local: ${proposal.eventLocation}` : 'Local: A definir'}

───────────────────────────────────────────────

${aiText}

───────────────────────────────────────────────
INVESTIMENTO
───────────────────────────────────────────────
Formato: ${selectedFormat?.label} (${selectedFormat?.duration})
Valor: R$ ${selectedFormat?.price.toLocaleString('pt-BR')},00

Inclui:
✓ Conteúdo autoral e direcionado
✓ Presença integral de Paula Pimenta + assessor
✓ Apoio à condução, dinâmica e logística

Condições:
• NF emitida em até 5 dias após o evento
• Prazo de pagamento: 30 dias
• Custos de deslocamento por conta da contratante

───────────────────────────────────────────────
CONTATO
───────────────────────────────────────────────
E-mail: ${PAULA_BIO.contact.email}
Telefone: ${PAULA_BIO.contact.phone}
LinkedIn: ${PAULA_BIO.contact.linkedin}
Instagram: ${PAULA_BIO.contact.instagram}
Site: ${PAULA_BIO.contact.site}`;

      setGeneratedProposal(doc);
      setActiveTab('preview');
      toast({ title: 'Proposta gerada com Thor AI!' });
    } catch (err) {
      console.error('Proposal generation error:', err);
      // Fallback to template
      const doc = `═══════════════════════════════════════════════
          PROPOSTA COMERCIAL
          Paula Pimenta
═══════════════════════════════════════════════

Para: ${proposal.clientName}
Empresa: ${proposal.clientCompany}
${proposal.eventName ? `Evento: ${proposal.eventName}` : ''}
${proposal.eventDate ? `Data: ${proposal.eventDate}` : 'Data: A definir'}
${proposal.eventLocation ? `Local: ${proposal.eventLocation}` : 'Local: A definir'}

───────────────────────────────────────────────
TEMA: ${selectedTheme?.label || proposal.theme}
───────────────────────────────────────────────
${selectedTheme?.desc || ''}

FORMATO: ${selectedFormat?.label}
Duração: ${selectedFormat?.duration}
${proposal.audience ? `\nPÚBLICO-ALVO: ${proposal.audience}` : ''}

───────────────────────────────────────────────
ESTRUTURA
───────────────────────────────────────────────
• Introdução — Apresentação e contextualização
• Desenvolvimento — Conteúdo autoral com exemplos práticos
• Dinâmica interativa — Engajamento com o público
• Conclusão — Reflexões finais e ações práticas
• Q&A — Abertura para perguntas

───────────────────────────────────────────────
INVESTIMENTO
───────────────────────────────────────────────
Valor: R$ ${selectedFormat?.price.toLocaleString('pt-BR')},00

Inclui:
✓ Conteúdo autoral e direcionado
✓ Presença integral de Paula Pimenta + assessor
✓ Apoio à condução, dinâmica e logística

Condições:
• NF emitida em até 5 dias após o evento
• Prazo de pagamento: 30 dias
• Custos de deslocamento por conta da contratante
${proposal.customNotes ? `\nOBSERVAÇÕES:\n${proposal.customNotes}` : ''}

───────────────────────────────────────────────
SOBRE PAULA PIMENTA
───────────────────────────────────────────────
${PAULA_BIO.summary}

${PAULA_BIO.achievements.map(a => `• ${a}`).join('\n')}

───────────────────────────────────────────────
CONTATO
───────────────────────────────────────────────
E-mail: ${PAULA_BIO.contact.email}
Telefone: ${PAULA_BIO.contact.phone}
LinkedIn: ${PAULA_BIO.contact.linkedin}
Site: ${PAULA_BIO.contact.site}`;

      setGeneratedProposal(doc);
      setActiveTab('preview');
      toast({ title: 'Proposta gerada (template local)', description: 'Thor AI indisponível, usando template.' });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (generatedProposal) {
      navigator.clipboard.writeText(generatedProposal);
      toast({ title: 'Proposta copiada!' });
    }
  };

  const handleDownloadTxt = () => {
    if (!generatedProposal) return;
    const blob = new Blob([generatedProposal], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Proposta_${proposal.clientCompany.replace(/\s/g, '_') || 'Palestra'}_Paula_Pimenta.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // PDF Generation with premium branding
  const handleDownloadPdf = async () => {
    if (!generatedProposal) return;
    setGeneratingPdf(true);

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const marginL = 22;
      const marginR = 22;
      const contentW = pageW - marginL - marginR;
      let y = 0;
      const footerH = 18;

      // Load logo
      let logoImg: string | null = null;
      try {
        const response = await fetch('/images/logo-paula.png');
        const blob = await response.blob();
        logoImg = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch { /* logo not available */ }

      // Helper: get logo aspect ratio
      const getLogoSize = (maxW: number, maxH: number) => {
        // Default aspect ratio ~3.5:1 for wide logos
        const aspect = 3.5;
        let w = maxW;
        let h = w / aspect;
        if (h > maxH) { h = maxH; w = h * aspect; }
        return { w, h };
      };

      const addPage = () => {
        doc.addPage();
        y = 12;
        // Subtle top accent bar on continuation pages
        doc.setFillColor(BRAND.primaryDark);
        doc.rect(0, 0, pageW, 4, 'F');
        doc.setDrawColor(BRAND.primary);
        doc.setLineWidth(1);
        doc.line(0, 4, pageW, 4);
        y = 16;
      };

      const checkSpace = (needed: number) => {
        if (y + needed > pageH - footerH - 8) addPage();
      };

      // Clean text: remove markdown artifacts, JSON wrappers
      const cleanText = (text: string): string => {
        let cleaned = text;
        // Remove JSON wrapper artifacts
        cleaned = cleaned.replace(/^\s*\{?\s*"message"\s*:\s*"?/i, '');
        cleaned = cleaned.replace(/"?\s*\}?\s*$/, '');
        // Convert escaped chars
        cleaned = cleaned.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '  ');
        // Remove markdown bold markers
        cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
        // Remove markdown italic
        cleaned = cleaned.replace(/\*(.*?)\*/g, '$1');
        // Remove markdown headers
        cleaned = cleaned.replace(/^#{1,4}\s*/gm, '');
        return cleaned;
      };

      // ═══════════════════════════════════════════
      // PAGE 1 — COVER HEADER
      // ═══════════════════════════════════════════

      // Full-width navy header
      const headerH = 52;
      doc.setFillColor(BRAND.primaryDark);
      doc.rect(0, 0, pageW, headerH, 'F');

      // Logo — large and responsive
      if (logoImg) {
        const logo = getLogoSize(55, 20);
        doc.addImage(logoImg, 'PNG', marginL, (headerH - logo.h) / 2 - 4, logo.w, logo.h);
      }

      // Title block — right aligned
      doc.setTextColor('#FFFFFF');
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('PROPOSTA COMERCIAL', pageW - marginR, headerH / 2 - 4, { align: 'right' });
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(BRAND.primary);
      doc.text('Paula Pimenta  •  Palestrante & Mentora', pageW - marginR, headerH / 2 + 5, { align: 'right' });

      // Copper accent line below header
      doc.setDrawColor(BRAND.primary);
      doc.setLineWidth(2);
      doc.line(0, headerH, pageW, headerH);

      y = headerH + 12;

      // ═══════════════════════════════════════════
      // CLIENT INFO BOX
      // ═══════════════════════════════════════════
      const clientBoxH = 38;
      // Light background box
      doc.setFillColor(245, 240, 235); // BRAND.light
      doc.roundedRect(marginL, y, contentW, clientBoxH, 3, 3, 'F');
      // Left copper accent bar
      doc.setFillColor(BRAND.primary);
      doc.rect(marginL, y, 3, clientBoxH, 'F');

      const infoX = marginL + 10;
      let infoY = y + 8;

      doc.setTextColor(BRAND.primary);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('DADOS DO CLIENTE', infoX, infoY);
      infoY += 6;

      doc.setTextColor(BRAND.text);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      const clientFields = [
        { label: 'Para', value: proposal.clientName },
        { label: 'Empresa', value: proposal.clientCompany },
        { label: 'Evento', value: proposal.eventName || 'A definir' },
        { label: 'Data', value: proposal.eventDate || 'A definir' },
        { label: 'Local', value: proposal.eventLocation || 'A definir' },
        { label: 'Público', value: proposal.audience || 'Executivos' },
      ];

      // Render in 2 columns
      const col1X = infoX;
      const col2X = infoX + contentW / 2 - 5;
      clientFields.forEach((field, idx) => {
        const colX = idx < 3 ? col1X : col2X;
        const rowY = infoY + (idx % 3) * 6;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(BRAND.muted);
        doc.text(`${field.label}:`, colX, rowY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(BRAND.text);
        doc.text(field.value, colX + doc.getTextWidth(`${field.label}: `) + 1, rowY);
      });

      y += clientBoxH + 10;

      // ═══════════════════════════════════════════
      // PROPOSAL BODY — cleaned and formatted
      // ═══════════════════════════════════════════
      const cleaned = cleanText(generatedProposal);
      const lines = cleaned.split('\n');

      // Skip lines already rendered in header/client box
      const skipPatterns = [
        /^═+$/, /^─+$/, /^PROPOSTA COMERCIAL$/i, /^Paula Pimenta$/i,
        /^Para:/i, /^Empresa:/i, /^Evento:/i, /^Data:/i, /^Local:/i, /^Público:/i,
        /^DADOS DO CLIENTE$/i,
      ];

      const isSectionHeader = (line: string) => {
        const t = line.trim();
        if (!t || t.length < 4) return false;
        // ALL CAPS lines (excluding bullets)
        if (t === t.toUpperCase() && !t.startsWith('•') && !t.startsWith('✓') && !t.startsWith('-') && !/^\d/.test(t)) return true;
        // Lines ending with colon that look like headers
        if (t.endsWith(':') && t.length < 60 && !t.includes('.')) return true;
        return false;
      };

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) { y += 2; continue; }

        // Skip already-rendered content
        if (skipPatterns.some(p => p.test(trimmed))) continue;

        // ── Section Header ──
        if (isSectionHeader(trimmed)) {
          checkSpace(14);
          y += 4;
          // Copper left accent
          doc.setFillColor(BRAND.primary);
          doc.rect(marginL, y - 3.5, 2, 5, 'F');
          doc.setTextColor(BRAND.primaryDark);
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(trimmed, marginL + 6, y);
          y += 8;
          continue;
        }

        // ── Bullet / check items ──
        if (trimmed.startsWith('•') || trimmed.startsWith('✓') || trimmed.startsWith('-') || /^\d+\.\s/.test(trimmed)) {
          checkSpace(7);
          doc.setTextColor(BRAND.text);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');

          // Use copper bullet
          const bulletChar = trimmed.startsWith('✓') ? '✓' : '•';
          const textContent = trimmed.replace(/^[•✓\-]\s*/, '').replace(/^\d+\.\s*/, '');

          doc.setTextColor(BRAND.primary);
          doc.setFontSize(9);
          doc.text(bulletChar, marginL + 3, y);
          doc.setTextColor(BRAND.text);
          const bulletWrapped = doc.splitTextToSize(textContent, contentW - 10);
          bulletWrapped.forEach((bl: string, idx: number) => {
            checkSpace(5);
            doc.text(bl, marginL + 8, y);
            y += 4.5;
          });
          y += 1;
          continue;
        }

        // ── Regular paragraph text ──
        checkSpace(6);
        doc.setTextColor(BRAND.text);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const wrapped = doc.splitTextToSize(trimmed, contentW);
        wrapped.forEach((wl: string) => {
          checkSpace(5);
          doc.text(wl, marginL, y);
          y += 4.5;
        });
        y += 1;
      }

      // ═══════════════════════════════════════════
      // INVESTMENT BOX (if not already in content)
      // ═══════════════════════════════════════════
      checkSpace(40);
      y += 4;
      const investBoxH = 32;
      doc.setFillColor(BRAND.primaryDark);
      doc.roundedRect(marginL, y, contentW, investBoxH, 3, 3, 'F');

      doc.setTextColor('#FFFFFF');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('INVESTIMENTO', marginL + 8, y + 8);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Formato: ${selectedFormat?.label} (${selectedFormat?.duration})`, marginL + 8, y + 15);

      doc.setTextColor(BRAND.primary);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`R$ ${selectedFormat?.price.toLocaleString('pt-BR')},00`, pageW - marginR - 8, y + 14, { align: 'right' });

      doc.setTextColor('#FFFFFF');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Inclui: Conteúdo autoral  •  Presença integral + assessor  •  Apoio logístico', marginL + 8, y + 22);
      doc.text('NF em até 5 dias  •  Pgto: 30 dias  •  Deslocamento por conta da contratante', marginL + 8, y + 27);

      y += investBoxH + 8;

      // ═══════════════════════════════════════════
      // CONTACT STRIP
      // ═══════════════════════════════════════════
      checkSpace(20);
      doc.setDrawColor(BRAND.primary);
      doc.setLineWidth(0.5);
      doc.line(marginL, y, pageW - marginR, y);
      y += 6;

      doc.setTextColor(BRAND.primary);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('CONTATO', marginL, y);
      y += 5;

      doc.setTextColor(BRAND.muted);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const contactLine = `${PAULA_BIO.contact.email}  •  ${PAULA_BIO.contact.phone}  •  ${PAULA_BIO.contact.site}  •  LinkedIn: paulavaliopimenta`;
      doc.text(contactLine, marginL, y);

      // ═══════════════════════════════════════════
      // FOOTER on every page
      // ═══════════════════════════════════════════
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        // Navy footer bar
        doc.setFillColor(BRAND.primaryDark);
        doc.rect(0, pageH - footerH, pageW, footerH, 'F');

        // Copper line on top of footer
        doc.setDrawColor(BRAND.primary);
        doc.setLineWidth(1);
        doc.line(0, pageH - footerH, pageW, pageH - footerH);

        // Small logo in footer
        if (logoImg) {
          const fLogo = getLogoSize(28, 8);
          doc.addImage(logoImg, 'PNG', marginL, pageH - footerH / 2 - fLogo.h / 2, fLogo.w, fLogo.h);
        }

        // Contact info
        doc.setTextColor('#FFFFFF');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `${PAULA_BIO.contact.email}  |  ${PAULA_BIO.contact.phone}  |  ${PAULA_BIO.contact.site}`,
          pageW / 2, pageH - footerH / 2 + 1, { align: 'center' }
        );

        // Page number
        doc.setTextColor(BRAND.primary);
        doc.setFontSize(8);
        doc.text(`${i} / ${totalPages}`, pageW - marginR, pageH - footerH / 2 + 1, { align: 'right' });
      }

      doc.save(`Proposta_${proposal.clientCompany.replace(/\s/g, '_') || 'Palestra'}_Paula_Pimenta.pdf`);
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (err) {
      console.error('PDF generation error:', err);
      toast({ title: 'Erro ao gerar PDF', variant: 'destructive' });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleSendEmail = async () => {
    if (!generatedProposal || !emailTo) return;
    setSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-proposal-email', {
        body: {
          recipientEmail: emailTo,
          recipientName: proposal.clientName,
          proposalText: generatedProposal,
          subject: `Proposta Comercial — Paula Pimenta — ${proposal.clientCompany}`,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Proposta enviada!', description: data.message });
      setEmailDialogOpen(false);
      setEmailTo('');
    } catch (err: any) {
      toast({ title: 'Erro ao enviar', description: err.message, variant: 'destructive' });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Propostas de Palestra</h1>
          <p className="text-muted-foreground">Gere propostas profissionais com IA</p>
        </div>
        <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
          <Brain className="h-3 w-3" /> Thor AI Integrado
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
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Dados do Cliente</CardTitle></CardHeader>
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

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Dados do Evento</CardTitle></CardHeader>
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

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Tema da Palestra *</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {TALK_THEMES.map(theme => (
                    <button key={theme.id} onClick={() => setProposal(p => ({ ...p, theme: theme.id }))}
                      className={`rounded-lg border p-3 text-left transition-all hover:border-primary/50 ${
                        proposal.theme === theme.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border'
                      }`}>
                      <p className="text-sm font-medium text-foreground">{theme.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{theme.desc}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Formato *</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {FORMATS.map(fmt => (
                    <button key={fmt.id} onClick={() => setProposal(p => ({ ...p, format: fmt.id }))}
                      className={`flex w-full items-center justify-between rounded-lg border p-3 transition-all hover:border-primary/50 ${
                        proposal.format === fmt.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border'
                      }`}>
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">{fmt.label}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {fmt.duration}</p>
                      </div>
                      <span className="text-sm font-semibold text-primary">R$ {fmt.price.toLocaleString('pt-BR')}</span>
                    </button>
                  ))}
                </div>
                <Separator />
                <div className="space-y-1.5">
                  <Label>Observações adicionais</Label>
                  <Textarea placeholder="Ex: A empresa está em processo de fusão..." value={proposal.customNotes}
                    onChange={e => setProposal(p => ({ ...p, customNotes: e.target.value }))} rows={3} />
                </div>
              </CardContent>
            </Card>
          </div>

          <Button onClick={handleGenerate} disabled={generating} className="w-full gap-2" size="lg">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? 'Gerando com Thor AI...' : 'Gerar Proposta com IA'}
          </Button>
        </TabsContent>

        {/* ── PREVIEW TAB ── */}
        <TabsContent value="preview" className="mt-4 space-y-4">
          {generatedProposal && (
            <>
              <div className="flex gap-2 justify-end flex-wrap">
                <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1">
                  <FileText className="h-3.5 w-3.5" /> Copiar
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadTxt} className="gap-1">
                  <Download className="h-3.5 w-3.5" /> TXT
                </Button>
                <Button size="sm" onClick={handleDownloadPdf} disabled={generatingPdf} className="gap-1 bg-primary">
                  {generatingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  PDF com Branding
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setEmailDialogOpen(true)} className="gap-1">
                  <Send className="h-3.5 w-3.5" /> Enviar por E-mail
                </Button>
              </div>
              <Card>
                <CardContent className="p-6">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-foreground leading-relaxed">{generatedProposal}</pre>
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
                <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" /> {PAULA_BIO.name}</CardTitle>
                <CardDescription>{PAULA_BIO.title}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-foreground leading-relaxed">{PAULA_BIO.summary}</p>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Conquistas</h4>
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
                  <h4 className="text-sm font-semibold text-foreground mb-2">Formação</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {PAULA_BIO.education.map((e, i) => <li key={i}>• {e}</li>)}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Contato</CardTitle></CardHeader>
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
              <CardHeader><CardTitle className="text-base">Temas de Palestra</CardTitle></CardHeader>
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
              <CardHeader><CardTitle className="text-base">Formatos & Investimento</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {FORMATS.map(fmt => (
                  <div key={fmt.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{fmt.label}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {fmt.duration}</p>
                    </div>
                    <Badge variant="secondary" className="gap-1">
                      <DollarSign className="h-3 w-3" /> R$ {fmt.price.toLocaleString('pt-BR')}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-base">Incluso em Todas as Propostas</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['Conteúdo autoral e personalizado', 'Presença integral + assessor', 'Dinâmica de grupo interativa', 'Apoio logístico no evento'].map(item => (
                    <div key={item} className="flex items-start gap-2 rounded-lg bg-primary/5 p-3">
                      <span className="text-primary text-sm">✓</span>
                      <span className="text-xs text-foreground">{item}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  * Custos de deslocamento (aéreo/terrestre) são de responsabilidade da empresa contratante.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Proposta por E-mail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>E-mail do destinatário</Label>
              <Input
                type="email"
                placeholder="cliente@empresa.com"
                value={emailTo}
                onChange={e => setEmailTo(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              A proposta será formatada com o branding da Paula Pimenta e enviada ao destinatário.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSendEmail} disabled={sendingEmail || !emailTo} className="gap-1">
              {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
