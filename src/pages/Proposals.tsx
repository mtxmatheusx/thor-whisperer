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
    email: 'pimentpa@gmail.com',
    phone: '(51) 99144-3171',
    linkedin: 'https://www.linkedin.com/in/paula-valio-pimenta/',
    instagram: 'https://www.instagram.com/paulavaliopimenta/',
    site: 'https://paulavaliopimenta.com.br/',
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

      // Parse AI response — aggressively strip JSON wrappers
      let aiText = '';
      const extractText = (input: any): string => {
        if (typeof input === 'string') {
          // Try to parse as JSON first
          try {
            const parsed = JSON.parse(input);
            return extractText(parsed);
          } catch {
            return input;
          }
        }
        if (input && typeof input === 'object') {
          // Try common keys
          return input.message || input.content || input.text || input.response || JSON.stringify(input);
        }
        return String(input || '');
      };

      aiText = extractText(data);

      // Strip any remaining JSON wrapper artifacts
      aiText = aiText
        .replace(/^\s*\{?\s*"(?:message|content|text|response)"\s*:\s*"?/i, '')
        .replace(/"?\s*\}?\s*$/, '')
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\t/g, '  ')
        .replace(/^["'\s]+/, '')
        .replace(/["'\s]+$/, '');

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

  // PDF Generation — Sales Page Style with UX Design
  const handleDownloadPdf = async () => {
    if (!generatedProposal) return;
    setGeneratingPdf(true);

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();   // 210
      const H = doc.internal.pageSize.getHeight();   // 297
      const M = 18; // margin
      const CW = W - M * 2; // content width
      const footerH = 14;
      let y = 0;

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

      const logoSize = (maxW: number, maxH: number) => {
        const a = 3.5; let w = maxW; let h = w / a;
        if (h > maxH) { h = maxH; w = h * a; }
        return { w, h };
      };

      // Clean text helper
      const clean = (text: string): string => {
        return text
          .replace(/^\s*\{?\s*"message"\s*:\s*"?/i, '')
          .replace(/"?\s*\}?\s*$/, '')
          .replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '  ')
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/^#{1,4}\s*/gm, '');
      };

      // Rounded rect with fill (helper)
      const roundBox = (x: number, yy: number, w: number, h: number, r: number, color: string) => {
        doc.setFillColor(color);
        doc.roundedRect(x, yy, w, h, r, r, 'F');
      };

      const newPage = () => {
        doc.addPage();
        y = 0;
      };

      const checkSpace = (needed: number) => {
        if (y + needed > H - footerH - 6) {
          newPage();
          // Mini header bar on continuation pages
          doc.setFillColor(BRAND.primaryDark);
          doc.rect(0, 0, W, 6, 'F');
          doc.setFillColor(BRAND.primary);
          doc.rect(0, 6, W, 1.5, 'F');
          y = 14;
        }
      };

      // ════════════════════════════════════════════════
      // PAGE 1 — FULL-PAGE HERO COVER (Sales Page Style)
      // ════════════════════════════════════════════════

      // Full dark navy background
      doc.setFillColor(BRAND.primaryDark);
      doc.rect(0, 0, W, H, 'F');

      // Decorative copper diagonal stripe (top-right)
      doc.setFillColor(BRAND.primary);
      doc.triangle(W - 60, 0, W, 0, W, 45, 'F');

      // Decorative copper diagonal stripe (bottom-left)
      doc.triangle(0, H - 45, 0, H, 60, H, 'F');

      // Logo — centered, large
      if (logoImg) {
        const logo = logoSize(80, 28);
        doc.addImage(logoImg, 'PNG', (W - logo.w) / 2, 50, logo.w, logo.h);
      }

      // Copper divider line
      doc.setDrawColor(BRAND.primary);
      doc.setLineWidth(1.5);
      doc.line(W / 2 - 30, 90, W / 2 + 30, 90);

      // "PROPOSTA COMERCIAL" — large title
      doc.setTextColor('#FFFFFF');
      doc.setFontSize(32);
      doc.setFont('helvetica', 'bold');
      doc.text('PROPOSTA', W / 2, 112, { align: 'center' });
      doc.setTextColor(BRAND.primary);
      doc.text('COMERCIAL', W / 2, 124, { align: 'center' });

      // Subtitle
      doc.setTextColor('#FFFFFF');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Palestrante  •  Executiva  •  Mentora G4 Educação', W / 2, 138, { align: 'center' });

      // Client info block — centered card on cover
      const cardW = 130;
      const cardH = 50;
      const cardX = (W - cardW) / 2;
      const cardY = 160;
      roundBox(cardX, cardY, cardW, cardH, 4, '#FFFFFF');

      // Left copper accent bar inside card
      doc.setFillColor(BRAND.primary);
      doc.rect(cardX, cardY, 4, cardH, 'F');

      doc.setTextColor(BRAND.primaryDark);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('PREPARADA PARA', cardX + 12, cardY + 10);

      doc.setFontSize(14);
      doc.setTextColor(BRAND.primaryDark);
      doc.text(proposal.clientName, cardX + 12, cardY + 20);
      doc.setFontSize(11);
      doc.setTextColor(BRAND.muted);
      doc.text(proposal.clientCompany, cardX + 12, cardY + 28);

      doc.setFontSize(8);
      doc.setTextColor(BRAND.muted);
      const eventLine = [
        proposal.eventDate || 'Data a definir',
        proposal.eventLocation || 'Local a definir',
      ].join('  •  ');
      doc.text(eventLine, cardX + 12, cardY + 36);

      if (proposal.eventName) {
        doc.setFontSize(8);
        doc.text(proposal.eventName, cardX + 12, cardY + 43);
      }

      // Bottom copper bar
      doc.setFillColor(BRAND.primary);
      doc.rect(0, H - 8, W, 8, 'F');

      // Footer text on cover
      doc.setTextColor('#FFFFFF');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(`${PAULA_BIO.contact.email}  •  ${PAULA_BIO.contact.phone}  •  ${PAULA_BIO.contact.site}`, W / 2, H - 14, { align: 'center' });

      // ════════════════════════════════════════════════
      // PAGE 2+ — CONTENT PAGES (Sales Page Sections)
      // ════════════════════════════════════════════════
      newPage();

      // Top bar
      doc.setFillColor(BRAND.primaryDark);
      doc.rect(0, 0, W, 6, 'F');
      doc.setFillColor(BRAND.primary);
      doc.rect(0, 6, W, 1.5, 'F');
      y = 14;

      // Parse content into sections
      const cleaned = clean(generatedProposal);
      const allLines = cleaned.split('\n');

      const skipPatterns = [
        /^═+$/, /^─+$/, /^PROPOSTA COMERCIAL$/i, /^Paula Pimenta$/i,
        /^Para:/i, /^Empresa:/i, /^Evento:/i, /^Data:/i, /^Local:/i, /^Público:/i,
        /^DADOS DO CLIENTE$/i,
      ];

      const isSectionHeader = (line: string) => {
        const t = line.trim();
        if (!t || t.length < 4) return false;
        if (t === t.toUpperCase() && !t.startsWith('•') && !t.startsWith('✓') && !t.startsWith('-') && !/^\d/.test(t)) return true;
        if (t.endsWith(':') && t.length < 60 && !t.includes('.')) return true;
        return false;
      };

      let sectionIndex = 0;
      const sectionColors = ['#F8F4EF', '#EDF2FA', '#FFF8F0', '#F0F8F4']; // alternating backgrounds

      for (const line of allLines) {
        const trimmed = line.trim();
        if (!trimmed) { y += 2; continue; }
        if (skipPatterns.some(p => p.test(trimmed))) continue;

        // ── SECTION HEADER — styled card-like block ──
        if (isSectionHeader(trimmed)) {
          checkSpace(18);
          y += 3;

          // Section background stripe
          const bgColor = sectionColors[sectionIndex % sectionColors.length];
          doc.setFillColor(bgColor);
          doc.rect(0, y - 5, W, 14, 'F');

          // Copper left accent bar
          doc.setFillColor(BRAND.primary);
          doc.rect(M - 2, y - 4, 3, 12, 'F');

          // Section title
          doc.setTextColor(BRAND.primaryDark);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(trimmed, M + 6, y + 3);

          // Thin copper underline
          doc.setDrawColor(BRAND.primary);
          doc.setLineWidth(0.4);
          doc.line(M + 6, y + 6, M + 6 + Math.min(doc.getTextWidth(trimmed), CW - 10), y + 6);

          y += 14;
          sectionIndex++;
          continue;
        }

        // ── BULLET / CHECK / NUMBERED ITEMS — icon-style ──
        if (trimmed.startsWith('•') || trimmed.startsWith('✓') || trimmed.startsWith('-') || /^\d+\.\s/.test(trimmed)) {
          checkSpace(8);
          const textContent = trimmed.replace(/^[•✓\-]\s*/, '').replace(/^\d+\.\s*/, '');
          const isCheck = trimmed.startsWith('✓');
          const isNumbered = /^\d+\.\s/.test(trimmed);
          const numberMatch = trimmed.match(/^(\d+)\./);

          // Copper circle bullet or number
          const bulletX = M + 4;
          if (isNumbered && numberMatch) {
            // Copper circle with number
            doc.setFillColor(BRAND.primary);
            doc.circle(bulletX, y - 1, 2.5, 'F');
            doc.setTextColor('#FFFFFF');
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text(numberMatch[1], bulletX, y, { align: 'center' });
          } else {
            // Copper dot or check
            doc.setFillColor(BRAND.primary);
            if (isCheck) {
              doc.circle(bulletX, y - 1, 2, 'F');
              doc.setTextColor('#FFFFFF');
              doc.setFontSize(7);
              doc.setFont('helvetica', 'bold');
              doc.text('✓', bulletX, y, { align: 'center' });
            } else {
              doc.circle(bulletX, y - 1, 1.2, 'F');
            }
          }

          // Bullet text
          doc.setTextColor(BRAND.text);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          const bulletWrapped = doc.splitTextToSize(textContent, CW - 14);
          bulletWrapped.forEach((bl: string) => {
            checkSpace(5);
            doc.text(bl, M + 10, y);
            y += 4.5;
          });
          y += 2;
          continue;
        }

        // ── REGULAR PARAGRAPH — with proper line-height ──
        checkSpace(6);
        doc.setTextColor(BRAND.text);
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'normal');
        const wrapped = doc.splitTextToSize(trimmed, CW);
        wrapped.forEach((wl: string) => {
          checkSpace(5);
          doc.text(wl, M, y);
          y += 5;
        });
        y += 2;
      }

      // ════════════════════════════════════════════════
      // INVESTMENT — Premium CTA Section (Sales-page style)
      // ════════════════════════════════════════════════
      checkSpace(65);
      y += 6;

      // Full-width dark section background
      const investStartY = y - 4;
      const investH = 55;
      doc.setFillColor(BRAND.primaryDark);
      doc.rect(0, investStartY, W, investH, 'F');

      // Copper top accent
      doc.setFillColor(BRAND.primary);
      doc.rect(0, investStartY, W, 2, 'F');

      // "INVESTIMENTO" label
      doc.setTextColor(BRAND.primary);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('INVESTIMENTO', M, investStartY + 12);

      // Price — large, copper
      doc.setTextColor(BRAND.primary);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text(`R$ ${selectedFormat?.price.toLocaleString('pt-BR')},00`, M, investStartY + 25);

      // Format details
      doc.setTextColor('#FFFFFF');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`${selectedFormat?.label}  •  ${selectedFormat?.duration}`, M, investStartY + 33);

      // Includes — right column
      const incX = W / 2 + 5;
      doc.setTextColor('#FFFFFF');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('INCLUI:', incX, investStartY + 12);

      const includes = [
        'Conteúdo autoral e personalizado',
        'Presença integral + assessor',
        'Apoio à condução e logística',
      ];
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      includes.forEach((item, i) => {
        doc.setTextColor(BRAND.primary);
        doc.text('●', incX, investStartY + 18 + i * 5);
        doc.setTextColor('#FFFFFF');
        doc.text(item, incX + 4, investStartY + 18 + i * 5);
      });

      // Conditions — bottom of invest section
      doc.setTextColor('#AAAAAA');
      doc.setFontSize(7);
      doc.text('NF em até 5 dias  •  Pgto: 30 dias  •  Deslocamento por conta da contratante', M, investStartY + 48);

      // Copper bottom accent
      doc.setFillColor(BRAND.primary);
      doc.rect(0, investStartY + investH - 2, W, 2, 'F');

      y = investStartY + investH + 8;

      // ════════════════════════════════════════════════
      // ABOUT — Bio strip
      // ════════════════════════════════════════════════
      checkSpace(35);
      roundBox(M, y, CW, 28, 3, '#F8F4EF');

      // Photo placeholder circle
      doc.setFillColor(BRAND.primary);
      doc.circle(M + 12, y + 14, 8, 'F');
      doc.setTextColor('#FFFFFF');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('PP', M + 12, y + 16, { align: 'center' });

      // Bio text
      doc.setTextColor(BRAND.primaryDark);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Paula Pimenta', M + 25, y + 8);
      doc.setTextColor(BRAND.muted);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      const bioWrapped = doc.splitTextToSize(PAULA_BIO.summary, CW - 30);
      bioWrapped.slice(0, 3).forEach((bl: string, i: number) => {
        doc.text(bl, M + 25, y + 14 + i * 3.5);
      });

      y += 34;

      // ════════════════════════════════════════════════
      // CONTACT — Final CTA
      // ════════════════════════════════════════════════
      checkSpace(22);

      doc.setDrawColor(BRAND.primary);
      doc.setLineWidth(0.5);
      doc.line(M, y, W - M, y);
      y += 6;

      doc.setTextColor(BRAND.primaryDark);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Vamos conversar?', M, y);
      y += 5;

      doc.setTextColor(BRAND.muted);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`${PAULA_BIO.contact.email}  •  ${PAULA_BIO.contact.phone}  •  ${PAULA_BIO.contact.site}  •  LinkedIn: paulavaliopimenta`, M, y);

      // ════════════════════════════════════════════════
      // FOOTER — all pages (except cover)
      // ════════════════════════════════════════════════
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        if (i === 1) continue; // Cover has its own footer

        // Slim navy footer
        doc.setFillColor(BRAND.primaryDark);
        doc.rect(0, H - footerH, W, footerH, 'F');
        doc.setFillColor(BRAND.primary);
        doc.rect(0, H - footerH, W, 0.8, 'F');

        // Logo in footer
        if (logoImg) {
          const fLogo = logoSize(22, 6);
          doc.addImage(logoImg, 'PNG', M, H - footerH / 2 - fLogo.h / 2, fLogo.w, fLogo.h);
        }

        // Contact
        doc.setTextColor('#FFFFFF');
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `${PAULA_BIO.contact.email}  |  ${PAULA_BIO.contact.phone}  |  ${PAULA_BIO.contact.site}`,
          W / 2, H - footerH / 2 + 1, { align: 'center' }
        );

        // Page number
        doc.setTextColor(BRAND.primary);
        doc.setFontSize(7);
        doc.text(`${i} / ${totalPages}`, W - M, H - footerH / 2 + 1, { align: 'right' });
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
