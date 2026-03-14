import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User, Award, Mail, Phone, Linkedin, Instagram, Youtube, Globe,
  Clock, DollarSign, Loader2, Sparkles, BookOpen, Mic, GraduationCap, Star
} from 'lucide-react';

const FALLBACK_PROFILE = {
  name: 'Paula Pimenta',
  title: 'Palestrante | Executiva | Mentora G4 Educação',
  summary: 'Mais de 25 anos de experiência em grandes empresas multinacionais: Natura, Danone, Cargill e Unilever. Por 3 anos, General Manager da The Body Shop para a América Latina. Atual Country Manager da Forever Living Products do Brasil.',
  bio: 'Paula é esposa, mãe, cristã, alta executiva de empresas multinacionais. Após longos anos de uma carreira sólida e de uma trajetória de sucesso, Paula vem treinando e desenvolvendo líderes, inspirando e guiando-os ao amadurecimento pessoal. Utilizando ferramentas validadas no mercado corporativo, Paula detém o método XPS, conduzindo profissionais de suas experiências de vida ao sucesso pleno.',
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
  themes: [
    { id: 'lideranca', name: 'Liderança Transformadora', description: 'Como desenvolver líderes que inspiram e entregam resultados' },
    { id: 'cx', name: 'Customer Experience', description: 'Estratégias para criar experiências memoráveis' },
    { id: 'mulheres', name: 'Mulheres na Liderança', description: 'Diversidade e empoderamento feminino no mundo corporativo' },
    { id: 'inovacao', name: 'Inovação e Transformação', description: 'Como liderar em tempos de mudança acelerada' },
    { id: 'carreira', name: 'Carreira e Propósito', description: 'Construindo uma carreira de impacto com autenticidade' },
    { id: 'autolideranca', name: 'Auto-liderança Feminina', description: 'Método XPS para mulheres alcançarem sucesso pleno no corpo, alma e espírito' },
  ],
  formats: [
    { name: 'Palestra', duration: '60 min', price: 10000 },
    { name: 'Keynote', duration: '45 min', price: 10000 },
    { name: 'Workshop Executivo', duration: '2h', price: 20000 },
    { name: 'Programa de Desenvolvimento', duration: '4 módulos', price: 35000 },
  ],
  services: ['Palestras', 'Mentorias', 'Imersões', 'Aulas Gravadas', 'Ferramentas Práticas', 'E-books'],
  contact: {
    email: 'pimentpa@hotmail.com',
    phone: '(11) 94312-6169',
    linkedin: 'https://linkedin.com/in/paulavaliopimenta',
    instagram: '@paulavaliopimenta',
    youtube: 'https://youtube.com/@paulapimenta',
    site: 'paulavaliopimenta.com.br',
  },
};

export default function ProfilePage() {
  const p = FALLBACK_PROFILE;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Perfil da Palestrante</h1>
        <p className="text-muted-foreground">Informações completas para propostas comerciais</p>
      </div>

      {/* Header Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
          <div className="flex items-start gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/20">
              <User className="h-10 w-10 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{p.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{p.title}</p>
              <p className="text-sm text-foreground/80 mt-3 max-w-2xl leading-relaxed">{p.summary}</p>
            </div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="bio" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="bio">Bio</TabsTrigger>
          <TabsTrigger value="themes">Temas</TabsTrigger>
          <TabsTrigger value="pricing">Preços</TabsTrigger>
          <TabsTrigger value="achievements">Prêmios</TabsTrigger>
          <TabsTrigger value="contact">Contato</TabsTrigger>
        </TabsList>

        {/* Bio */}
        <TabsContent value="bio" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" /> Sobre</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-foreground/80">{p.bio}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Formação</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {(p.education || FALLBACK_PROFILE.education).map((edu: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    {edu}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" /> Serviços</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(p.services || FALLBACK_PROFILE.services).map((s: string, i: number) => (
                  <Badge key={i} variant="secondary">{s}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Themes */}
        <TabsContent value="themes" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {(p.themes || FALLBACK_PROFILE.themes).map((theme: any) => (
              <Card key={theme.id || theme.name} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Mic className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{theme.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{theme.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Pricing */}
        <TabsContent value="pricing" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {(p.formats || FALLBACK_PROFILE.formats).map((fmt: any, i: number) => (
              <Card key={i} className="hover:shadow-md transition-shadow border-l-4 border-l-primary/40">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{fmt.name}</h3>
                      <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-xs">{fmt.duration}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-primary">
                        R$ {Number(fmt.price).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">
                * Valores base. Podem variar de acordo com local, logística e personalização. Deslocamento e hospedagem não inclusos.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Achievements */}
        <TabsContent value="achievements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4" /> Conquistas e Prêmios</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {(p.achievements || FALLBACK_PROFILE.achievements).map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <Star className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact */}
        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações de Contato</CardTitle>
              <CardDescription>Use estes dados para propostas e agendamentos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { icon: Mail, label: 'Email', value: (p.contact || FALLBACK_PROFILE.contact).email },
                { icon: Phone, label: 'Telefone', value: (p.contact || FALLBACK_PROFILE.contact).phone },
                { icon: Linkedin, label: 'LinkedIn', value: (p.contact || FALLBACK_PROFILE.contact).linkedin, link: true },
                { icon: Instagram, label: 'Instagram', value: (p.contact || FALLBACK_PROFILE.contact).instagram },
                { icon: Youtube, label: 'YouTube', value: (p.contact || FALLBACK_PROFILE.contact).youtube, link: true },
                { icon: Globe, label: 'Website', value: (p.contact || FALLBACK_PROFILE.contact).site, link: true },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground w-20">{item.label}</span>
                  {item.link ? (
                    <a href={item.value?.startsWith('http') ? item.value : `https://${item.value}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {item.value}
                    </a>
                  ) : (
                    <span>{item.value}</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
