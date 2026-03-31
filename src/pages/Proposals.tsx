import { useState, useRef } from 'react';
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
import html2canvas from 'html2canvas';
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
    portfolio: 'https://paula-pimenta-palestrante.vercel.app/',
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

  // Clean text helper
  const cleanProposalText = (text: string): string => {
    return text
      .replace(/^\s*\{?\s*"(?:message|content|text|response)"\s*:\s*"?/i, '')
      .replace(/"?\s*\}?\s*$/, '')
      .replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '  ')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^#{1,4}\s*/gm, '')
      .replace(/^["'\s]+/, '')
      .replace(/["'\s]+$/, '');
  };

  // Parse text into structured sections for HTML rendering
  const parseProposalSections = (text: string) => {
    const lines = text.split('\n');
    const sections: Array<{ type: 'header' | 'paragraph' | 'bullet' | 'check' | 'numbered' | 'divider'; content: string }> = [];

    const skipPatterns = [
      /^═+$/, /^─+$/, /^PROPOSTA COMERCIAL$/i, /^Paula Pimenta$/i,
      /^Para:/i, /^Empresa:/i, /^Evento:/i, /^Data:/i, /^Local:/i, /^Público:/i,
      /^DADOS DO CLIENTE$/i,
    ];

    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      if (skipPatterns.some(p => p.test(t))) continue;

      if (t === t.toUpperCase() && t.length > 3 && !t.startsWith('•') && !t.startsWith('✓') && !t.startsWith('-') && !/^\d/.test(t)) {
        sections.push({ type: 'header', content: t });
      } else if (t.endsWith(':') && t.length < 60 && !t.includes('.') && t.length > 4) {
        sections.push({ type: 'header', content: t });
      } else if (t.startsWith('✓')) {
        sections.push({ type: 'check', content: t.replace(/^✓\s*/, '') });
      } else if (t.startsWith('•') || t.startsWith('-')) {
        sections.push({ type: 'bullet', content: t.replace(/^[•\-]\s*/, '') });
      } else if (/^\d+\.\s/.test(t)) {
        sections.push({ type: 'numbered', content: t });
      } else {
        sections.push({ type: 'paragraph', content: t });
      }
    }
    return sections;
  };

  // PDF Generation — html2canvas approach for Canva-quality output
  const handleDownloadPdf = async () => {
    if (!generatedProposal) return;
    setGeneratingPdf(true);

    try {
      const cleaned = cleanProposalText(generatedProposal);
      const sections = parseProposalSections(cleaned);

      // Create off-screen container
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '794px'; // A4 at 96dpi
      container.style.fontFamily = "'Georgia', 'Times New Roman', serif";
      container.style.background = '#FFFFFF';
      document.body.appendChild(container);

      const sectionBgs = ['#F8F4EF', '#EDF2FA', '#FFF8F0', '#F0F8F4'];
      let secIdx = 0;

      // Build HTML sections
      const pdfSections: HTMLElement[] = [];

      // ═══════════════════════════════════════
      // SECTION 1 — HERO COVER
      // ═══════════════════════════════════════
      const cover = document.createElement('div');
      cover.setAttribute('data-pdf-section', 'cover');
      cover.style.cssText = `
        width: 794px; height: 1123px; background: #1B2A4A; position: relative;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        overflow: hidden; box-sizing: border-box;
      `;
      cover.innerHTML = `
        <div style="position:absolute;top:0;right:0;width:0;height:0;border-left:120px solid transparent;border-top:90px solid #C47B3B;"></div>
        <div style="position:absolute;bottom:0;left:0;width:0;height:0;border-right:120px solid transparent;border-bottom:90px solid #C47B3B;"></div>
        <img src="/images/logo-paula.png" style="width:280px;height:auto;margin-bottom:24px;" crossorigin="anonymous" />
        <div style="width:120px;height:3px;background:#C47B3B;margin:16px 0 32px;"></div>
        <div style="font-family:'Georgia',serif;font-size:52px;font-weight:bold;color:#FFFFFF;letter-spacing:4px;text-align:center;">PROPOSTA</div>
        <div style="font-family:'Georgia',serif;font-size:52px;font-weight:bold;color:#C47B3B;letter-spacing:4px;text-align:center;margin-top:4px;">COMERCIAL</div>
        <div style="font-size:16px;color:#FFFFFF;margin-top:20px;letter-spacing:2px;opacity:0.85;">Palestrante  •  Executiva  •  Mentora G4 Educação</div>
        <div style="
          background:#FFFFFF;border-radius:8px;padding:28px 36px;margin-top:48px;
          width:480px;border-left:6px solid #C47B3B;box-shadow:0 8px 32px rgba(0,0,0,0.3);
        ">
          <div style="font-size:11px;color:#C47B3B;font-weight:bold;letter-spacing:2px;margin-bottom:8px;">PREPARADA PARA</div>
          <div style="font-size:24px;font-weight:bold;color:#1B2A4A;">${proposal.clientName}</div>
          <div style="font-size:16px;color:#666;margin-top:4px;">${proposal.clientCompany}</div>
          <div style="font-size:13px;color:#999;margin-top:8px;">
            ${proposal.eventDate || 'Data a definir'}  •  ${proposal.eventLocation || 'Local a definir'}
          </div>
          ${proposal.eventName ? `<div style="font-size:13px;color:#999;margin-top:4px;">${proposal.eventName}</div>` : ''}
        </div>
        <div style="position:absolute;bottom:0;left:0;right:0;height:12px;background:#C47B3B;"></div>
        <div style="position:absolute;bottom:24px;left:0;right:0;text-align:center;font-size:11px;color:rgba(255,255,255,0.6);">
          ${PAULA_BIO.contact.email}  •  ${PAULA_BIO.contact.phone}  •  paulavaliopimenta.com.br
        </div>
      `;
      container.appendChild(cover);
      pdfSections.push(cover);

      // ═══════════════════════════════════════
      // SECTION 2 — CONTENT SECTIONS
      // ═══════════════════════════════════════
      const contentPage = document.createElement('div');
      contentPage.setAttribute('data-pdf-section', 'content');
      contentPage.style.cssText = `
        width: 794px; background: #FFFFFF; padding: 40px 56px 60px; box-sizing: border-box;
      `;

      // Top bar
      contentPage.innerHTML = `
        <div style="position:relative;margin:-40px -56px 32px;height:12px;background:#1B2A4A;">
          <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:#C47B3B;"></div>
        </div>
      `;

      for (const sec of sections) {
        if (sec.type === 'header') {
          const bg = sectionBgs[secIdx % sectionBgs.length];
          secIdx++;
          contentPage.innerHTML += `
            <div style="
              background:${bg};margin:24px -20px 16px;padding:14px 24px;
              border-left:4px solid #C47B3B;border-radius:0 6px 6px 0;
            ">
              <div style="font-size:16px;font-weight:bold;color:#1B2A4A;letter-spacing:1px;">${sec.content}</div>
              <div style="width:60px;height:2px;background:#C47B3B;margin-top:6px;"></div>
            </div>
          `;
        } else if (sec.type === 'bullet' || sec.type === 'check') {
          const icon = sec.type === 'check'
            ? `<div style="width:18px;height:18px;border-radius:50%;background:#C47B3B;color:#FFF;font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">✓</div>`
            : `<div style="width:8px;height:8px;border-radius:50%;background:#C47B3B;flex-shrink:0;margin-top:6px;"></div>`;
          contentPage.innerHTML += `
            <div style="display:flex;align-items:flex-start;gap:12px;margin:8px 0;padding-left:8px;">
              ${icon}
              <div style="font-size:13px;color:#333;line-height:1.7;">${sec.content}</div>
            </div>
          `;
        } else if (sec.type === 'numbered') {
          const match = sec.content.match(/^(\d+)\.\s*(.*)/);
          if (match) {
            contentPage.innerHTML += `
              <div style="display:flex;align-items:flex-start;gap:12px;margin:8px 0;padding-left:8px;">
                <div style="width:24px;height:24px;border-radius:50%;background:#C47B3B;color:#FFF;font-size:12px;font-weight:bold;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${match[1]}</div>
                <div style="font-size:13px;color:#333;line-height:1.7;">${match[2]}</div>
              </div>
            `;
          }
        } else {
          contentPage.innerHTML += `
            <p style="font-size:13.5px;color:#333;line-height:1.8;margin:10px 0;">${sec.content}</p>
          `;
        }
      }

      container.appendChild(contentPage);
      pdfSections.push(contentPage);

      // ═══════════════════════════════════════
      // SECTION 3 — INVESTMENT CTA
      // ═══════════════════════════════════════
      const investSection = document.createElement('div');
      investSection.setAttribute('data-pdf-section', 'investment');
      investSection.style.cssText = `width:794px;background:#1B2A4A;padding:40px 56px;box-sizing:border-box;`;
      investSection.innerHTML = `
        <div style="border-top:3px solid #C47B3B;padding-top:24px;display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div style="font-size:11px;color:#C47B3B;font-weight:bold;letter-spacing:2px;margin-bottom:8px;">INVESTIMENTO</div>
            <div style="font-size:40px;font-weight:bold;color:#C47B3B;font-family:'Georgia',serif;">
              R$ ${selectedFormat?.price.toLocaleString('pt-BR')},00
            </div>
            <div style="font-size:14px;color:#FFFFFF;margin-top:8px;opacity:0.9;">
              ${selectedFormat?.label}  •  ${selectedFormat?.duration}
            </div>
          </div>
          <div style="text-align:left;">
            <div style="font-size:11px;color:#FFFFFF;font-weight:bold;letter-spacing:1px;margin-bottom:12px;">INCLUI:</div>
            ${['Conteúdo autoral e personalizado', 'Presença integral + assessor', 'Apoio à condução e logística'].map(item => `
              <div style="display:flex;align-items:center;gap:8px;margin:6px 0;">
                <div style="width:6px;height:6px;border-radius:50%;background:#C47B3B;"></div>
                <span style="font-size:12px;color:#FFFFFF;opacity:0.9;">${item}</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div style="margin-top:20px;font-size:10px;color:#888;border-top:1px solid #333;padding-top:12px;">
          NF em até 5 dias  •  Pagamento: 30 dias  •  Deslocamento por conta da contratante
        </div>
        <div style="height:3px;background:#C47B3B;margin-top:20px;"></div>
      `;
      container.appendChild(investSection);
      pdfSections.push(investSection);

      // ═══════════════════════════════════════
      // SECTION 4 — BIO + CONTACT
      // ═══════════════════════════════════════
      const bioSection = document.createElement('div');
      bioSection.setAttribute('data-pdf-section', 'bio');
      bioSection.style.cssText = `width:794px;background:#FFFFFF;padding:40px 56px;box-sizing:border-box;`;
      bioSection.innerHTML = `
        <div style="background:#F8F4EF;border-radius:8px;padding:24px 28px;display:flex;gap:20px;align-items:center;">
          <div style="width:64px;height:64px;border-radius:50%;background:#C47B3B;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <span style="font-size:22px;font-weight:bold;color:#FFF;font-family:'Georgia',serif;">PP</span>
          </div>
          <div>
            <div style="font-size:18px;font-weight:bold;color:#1B2A4A;">Paula Pimenta</div>
            <div style="font-size:12px;color:#666;line-height:1.6;margin-top:6px;">${PAULA_BIO.summary}</div>
          </div>
        </div>
        <div style="margin-top:28px;padding-top:20px;border-top:2px solid #C47B3B;">
          <div style="font-size:16px;font-weight:bold;color:#1B2A4A;margin-bottom:12px;">Vamos conversar?</div>
          <div style="display:flex;gap:24px;flex-wrap:wrap;font-size:12px;color:#666;">
            <span>📧 ${PAULA_BIO.contact.email}</span>
            <span>📱 ${PAULA_BIO.contact.phone}</span>
            <span>🌐 paulavaliopimenta.com.br</span>
            <span>🔗 LinkedIn: paula-valio-pimenta</span>
          </div>
        </div>
      `;
      container.appendChild(bioSection);
      pdfSections.push(bioSection);

      // ═══════════════════════════════════════
      // FOOTER BAR
      // ═══════════════════════════════════════
      const footerSection = document.createElement('div');
      footerSection.setAttribute('data-pdf-section', 'footer');
      footerSection.style.cssText = `width:794px;background:#1B2A4A;padding:12px 56px;box-sizing:border-box;`;
      footerSection.innerHTML = `
        <div style="border-top:2px solid #C47B3B;padding-top:10px;display:flex;justify-content:space-between;align-items:center;">
          <img src="/images/logo-paula.png" style="height:20px;width:auto;" crossorigin="anonymous" />
          <div style="font-size:9px;color:rgba(255,255,255,0.6);">
            ${PAULA_BIO.contact.email}  |  ${PAULA_BIO.contact.phone}  |  paulavaliopimenta.com.br
          </div>
        </div>
      `;
      container.appendChild(footerSection);
      pdfSections.push(footerSection);

      // ═══════════════════════════════════════
      // RENDER TO PDF
      // ═══════════════════════════════════════
      await new Promise(resolve => setTimeout(resolve, 300)); // Wait for images to load

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const A4_W = 210;
      const A4_H = 297;
      const MARGIN = 0; // Full bleed for cover

      let currentY = 0;
      let isFirstPage = true;

      for (const section of pdfSections) {
        const canvas = await html2canvas(section, {
          scale: 2,
          useCORS: true,
          backgroundColor: null,
          logging: false,
        });

        const imgData = canvas.toDataURL('image/png');
        const imgW = canvas.width / 2;
        const imgH = canvas.height / 2;
        const scaleFactor = A4_W / (794 / (210 / 210)); // Scale to fit A4 width
        const pdfImgW = A4_W;
        const pdfImgH = (imgH / imgW) * pdfImgW;

        // Cover page is always full-page
        if (section.getAttribute('data-pdf-section') === 'cover') {
          if (!isFirstPage) pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, 0, A4_W, A4_H);
          isFirstPage = false;
          currentY = 0;
          continue;
        }

        // For other sections, flow them
        if (isFirstPage) {
          pdf.addPage();
          isFirstPage = false;
          currentY = 0;
        }

        const remaining = A4_H - currentY;
        if (pdfImgH > remaining && currentY > 0) {
          pdf.addPage();
          currentY = 0;
        }

        pdf.addImage(imgData, 'PNG', 0, currentY, pdfImgW, pdfImgH);
        currentY += pdfImgH;
      }

      // Cleanup
      document.body.removeChild(container);

      pdf.save(`Proposta_${proposal.clientCompany.replace(/\s/g, '_') || 'Palestra'}_Paula_Pimenta.pdf`);
      toast({ title: 'PDF profissional gerado com sucesso!' });
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
                <a href={PAULA_BIO.contact.instagram} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <Instagram className="h-4 w-4" /> Instagram
                </a>
                <a href={PAULA_BIO.contact.site} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <Globe className="h-4 w-4" /> Site Oficial
                </a>
                <a href={PAULA_BIO.contact.portfolio} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <Sparkles className="h-4 w-4" /> Portfólio de Palestras
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
