import { useState, useMemo } from 'react';
import { useEvents, useEventContacts } from '@/hooks/useEvents';
import { useEventSearch, SearchResult } from '@/hooks/useEventSearch';
import {
  ProspectEvent, EventContact, EventPipelineStatus, EventPlatform,
  EVENT_PIPELINE_LABELS, EVENT_PIPELINE_COLORS, EVENT_PLATFORM_LABELS,
} from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus, Search, Trash2, Loader2, Calendar, MapPin, Users, ExternalLink,
  ArrowRightLeft, Eye, UserPlus, Globe, Star, Radar, Download, CheckCheck,
  Mail, Phone, Contact,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PIPELINE_STATUSES: EventPipelineStatus[] = [
  'discovered', 'qualified', 'contact_found', 'contacted', 'responded', 'negotiating', 'booked',
];

const PLATFORMS: EventPlatform[] = ['sympla', 'eventbrite', 'even3', 'google', 'manual'];

const THEME_OPTIONS = [
  'lideranca', 'gestao', 'rh', 'cultura', 'inovacao', 'estrategia',
  'vendas', 'marketing', 'tecnologia', 'empreendedorismo',
];

const THEME_LABELS: Record<string, string> = {
  lideranca: 'Liderança',
  gestao: 'Gestão',
  rh: 'RH / Pessoas',
  cultura: 'Cultura Organizacional',
  inovacao: 'Inovação',
  estrategia: 'Estratégia',
  vendas: 'Vendas',
  marketing: 'Marketing',
  tecnologia: 'Tecnologia',
  empreendedorismo: 'Empreendedorismo',
};

export default function EventsPage() {
  const { events, isLoading, createEvent, updateEvent, deleteEvent, updatePipelineStatus, convertToLead } = useEvents();
  const eventSearch = useEventSearch();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<ProspectEvent | null>(null);
  const [contactOpen, setContactOpen] = useState(false);

  const filtered = useMemo(() => {
    return events.filter(e => {
      if (statusFilter !== 'all' && e.pipeline_status !== statusFilter) return false;
      if (platformFilter !== 'all' && e.platform !== platformFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return e.name.toLowerCase().includes(s) ||
          (e.location_city || '').toLowerCase().includes(s) ||
          (e.description || '').toLowerCase().includes(s);
      }
      return true;
    });
  }, [events, search, statusFilter, platformFilter]);

  const stats = useMemo(() => {
    const total = events.length;
    const qualified = events.filter(e => e.qualification_score >= 60).length;
    const contacted = events.filter(e => ['contacted', 'responded', 'negotiating', 'booked'].includes(e.pipeline_status)).length;
    const booked = events.filter(e => e.pipeline_status === 'booked').length;
    return { total, qualified, contacted, booked };
  }, [events]);

  const handleKanbanDrop = (eventId: string, newStatus: EventPipelineStatus) => {
    updatePipelineStatus.mutate({ id: eventId, status: newStatus });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prospecção de Eventos</h1>
          <p className="text-sm text-muted-foreground">Descubra eventos e envie propostas automaticamente</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSearchOpen(true)}>
            <Radar className="mr-2 h-4 w-4" /> Buscar Eventos
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar Evento
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Descobertos</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Qualificados</p>
            <p className="text-2xl font-bold text-blue-600">{stats.qualified}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Contatados</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.contacted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Fechados</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.booked}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar eventos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {PIPELINE_STATUSES.map(s => (
              <SelectItem key={s} value={s}>{EVENT_PIPELINE_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Plataforma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {PLATFORMS.map(p => (
              <SelectItem key={p} value={p}>{EVENT_PLATFORM_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {PIPELINE_STATUSES.map(status => {
              const statusEvents = filtered.filter(e => e.pipeline_status === status);
              return (
                <div
                  key={status}
                  className="w-[280px] flex-shrink-0"
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    const eventId = e.dataTransfer.getData('eventId');
                    if (eventId) handleKanbanDrop(eventId, status);
                  }}
                >
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <Badge variant="secondary" className={EVENT_PIPELINE_COLORS[status]}>
                      {EVENT_PIPELINE_LABELS[status]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{statusEvents.length}</span>
                  </div>
                  <div className="space-y-2 min-h-[100px] bg-muted/30 rounded-lg p-2">
                    {statusEvents.map(event => (
                      <Card
                        key={event.id}
                        className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                        draggable
                        onDragStart={e => e.dataTransfer.setData('eventId', event.id)}
                        onClick={() => setDetailEvent(event)}
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm leading-tight line-clamp-2">{event.name}</p>
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {EVENT_PLATFORM_LABELS[event.platform]}
                            </Badge>
                          </div>
                          {event.event_date && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(event.event_date), "dd MMM yyyy", { locale: ptBR })}
                            </div>
                          )}
                          {event.location_city && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {event.location_city}{event.location_state ? `, ${event.location_state}` : ''}
                            </div>
                          )}
                          {event.estimated_audience && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="h-3 w-3" />
                              ~{event.estimated_audience} pessoas
                            </div>
                          )}
                          {event.qualification_score > 0 && (
                            <div className="flex items-center gap-2">
                              <Progress value={event.qualification_score} className="h-1.5 flex-1" />
                              <span className="text-[10px] font-medium">{event.qualification_score}</span>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {event.themes.slice(0, 3).map(t => (
                              <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">
                                {THEME_LABELS[t] || t}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Event Dialog */}
      <CreateEventDialog open={createOpen} onOpenChange={setCreateOpen} onCreate={createEvent.mutate} />

      {/* Search Events Dialog */}
      <SearchEventsDialog open={searchOpen} onOpenChange={setSearchOpen} eventSearch={eventSearch} />

      {/* Event Detail Dialog */}
      {detailEvent && (
        <EventDetailDialog
          event={detailEvent}
          open={!!detailEvent}
          onOpenChange={open => !open && setDetailEvent(null)}
          onUpdate={(updates) => updateEvent.mutate({ id: detailEvent.id, ...updates })}
          onDelete={() => { deleteEvent.mutate(detailEvent.id); setDetailEvent(null); }}
          onAddContact={() => setContactOpen(true)}
          onConvertToLead={(contact) => convertToLead.mutate({ eventId: detailEvent.id, contact })}
        />
      )}

      {/* Add Contact Dialog */}
      {detailEvent && (
        <AddContactDialog
          eventId={detailEvent.id}
          open={contactOpen}
          onOpenChange={setContactOpen}
        />
      )}
    </div>
  );
}

function CreateEventDialog({ open, onOpenChange, onCreate }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (e: Partial<ProspectEvent>) => void;
}) {
  const [form, setForm] = useState({
    name: '', description: '', platform: 'manual' as EventPlatform,
    platform_url: '', event_date: '', location_city: '', location_state: '',
    location_venue: '', is_online: false, estimated_audience: '',
    category: '', audience_type: '', themes: [] as string[],
  });

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    onCreate({
      name: form.name,
      description: form.description || undefined,
      platform: form.platform,
      platform_url: form.platform_url || undefined,
      event_date: form.event_date || undefined,
      location_city: form.location_city || undefined,
      location_state: form.location_state || undefined,
      location_venue: form.location_venue || undefined,
      is_online: form.is_online,
      estimated_audience: form.estimated_audience ? parseInt(form.estimated_audience) : undefined,
      category: form.category || undefined,
      audience_type: form.audience_type || undefined,
      themes: form.themes,
      pipeline_status: 'discovered',
      qualification_score: 0,
    });
    setForm({
      name: '', description: '', platform: 'manual', platform_url: '',
      event_date: '', location_city: '', location_state: '', location_venue: '',
      is_online: false, estimated_audience: '', category: '', audience_type: '', themes: [],
    });
    onOpenChange(false);
  };

  const toggleTheme = (theme: string) => {
    setForm(f => ({
      ...f,
      themes: f.themes.includes(theme)
        ? f.themes.filter(t => t !== theme)
        : [...f.themes, theme],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Evento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome do Evento *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Summit de Liderança 2026" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Plataforma</Label>
              <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v as EventPlatform }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => <SelectItem key={p} value={p}>{EVENT_PLATFORM_LABELS[p]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>URL do Evento</Label>
            <Input value={form.platform_url} onChange={e => setForm(f => ({ ...f, platform_url: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Cidade</Label>
              <Input value={form.location_city} onChange={e => setForm(f => ({ ...f, location_city: e.target.value }))} />
            </div>
            <div>
              <Label>Estado</Label>
              <Input value={form.location_state} onChange={e => setForm(f => ({ ...f, location_state: e.target.value }))} placeholder="SP" />
            </div>
            <div>
              <Label>Público est.</Label>
              <Input type="number" value={form.estimated_audience} onChange={e => setForm(f => ({ ...f, estimated_audience: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_online} onCheckedChange={v => setForm(f => ({ ...f, is_online: v }))} />
            <Label>Evento online</Label>
          </div>
          <div>
            <Label>Temas (selecione)</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {THEME_OPTIONS.map(t => (
                <Badge
                  key={t}
                  variant={form.themes.includes(t) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleTheme(t)}
                >
                  {THEME_LABELS[t]}
                </Badge>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="conference">Conferência</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="summit">Summit</SelectItem>
                  <SelectItem value="forum">Fórum</SelectItem>
                  <SelectItem value="seminar">Seminário</SelectItem>
                  <SelectItem value="congress">Congresso</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de Público</Label>
              <Select value={form.audience_type} onValueChange={v => setForm(f => ({ ...f, audience_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="corporate">Corporativo</SelectItem>
                  <SelectItem value="academic">Acadêmico</SelectItem>
                  <SelectItem value="public">Público Geral</SelectItem>
                  <SelectItem value="mixed">Misto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!form.name.trim()}>Salvar Evento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EventDetailDialog({ event, open, onOpenChange, onUpdate, onDelete, onAddContact, onConvertToLead }: {
  event: ProspectEvent;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onUpdate: (updates: Partial<ProspectEvent>) => void;
  onDelete: () => void;
  onAddContact: () => void;
  onConvertToLead: (contact: EventContact) => void;
}) {
  const { contacts, isLoading: contactsLoading } = useEventContacts(event.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-lg">{event.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={EVENT_PIPELINE_COLORS[event.pipeline_status]}>
                  {EVENT_PIPELINE_LABELS[event.pipeline_status]}
                </Badge>
                <Badge variant="outline">{EVENT_PLATFORM_LABELS[event.platform]}</Badge>
                {event.qualification_score > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <Star className="h-3 w-3" /> {event.qualification_score}/100
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details">
          <TabsList className="w-full">
            <TabsTrigger value="details" className="flex-1">Detalhes</TabsTrigger>
            <TabsTrigger value="contacts" className="flex-1">Contatos ({contacts.length})</TabsTrigger>
            <TabsTrigger value="actions" className="flex-1">Ações</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
            <div className="grid grid-cols-2 gap-4">
              {event.event_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {format(new Date(event.event_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </div>
              )}
              {event.location_city && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {event.location_city}{event.location_state ? `, ${event.location_state}` : ''}
                  {event.location_venue ? ` — ${event.location_venue}` : ''}
                </div>
              )}
              {event.estimated_audience && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  ~{event.estimated_audience} pessoas
                </div>
              )}
              {event.is_online && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  Evento Online
                </div>
              )}
            </div>
            {event.platform_url && (
              <a href={event.platform_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                <ExternalLink className="h-3 w-3" /> Ver na plataforma
              </a>
            )}
            {event.themes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {event.themes.map(t => (
                  <Badge key={t} variant="secondary">{THEME_LABELS[t] || t}</Badge>
                ))}
              </div>
            )}
            <div>
              <Label>Notas de Qualificação</Label>
              <Textarea
                defaultValue={event.qualification_notes || ''}
                onBlur={e => onUpdate({ qualification_notes: e.target.value })}
                rows={3}
                placeholder="Observações sobre o fit deste evento..."
              />
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="space-y-4 mt-4">
            <Button size="sm" onClick={onAddContact}>
              <UserPlus className="mr-2 h-4 w-4" /> Adicionar Contato
            </Button>
            {contactsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum contato adicionado</p>
            ) : (
              <div className="space-y-3">
                {contacts.map(c => (
                  <Card key={c.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{c.name || 'Sem nome'}</p>
                        <p className="text-xs text-muted-foreground">{c.role || 'Organizador'}</p>
                        {c.email && <p className="text-xs">{c.email}</p>}
                        {c.phone && <p className="text-xs">{c.phone}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{c.confidence}</Badge>
                        <Button size="sm" variant="outline" onClick={() => onConvertToLead(c)}>
                          <ArrowRightLeft className="h-3 w-3 mr-1" /> Lead
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="actions" className="space-y-4 mt-4">
            <div>
              <Label>Alterar Status</Label>
              <Select
                value={event.pipeline_status}
                onValueChange={v => onUpdate({ pipeline_status: v as EventPipelineStatus })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[...PIPELINE_STATUSES, 'completed' as EventPipelineStatus, 'discarded' as EventPipelineStatus].map(s => (
                    <SelectItem key={s} value={s}>{EVENT_PIPELINE_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Score de Qualificação</Label>
              <Input
                type="number" min={0} max={100}
                defaultValue={event.qualification_score}
                onBlur={e => onUpdate({ qualification_score: parseInt(e.target.value) || 0 })}
              />
            </div>
            {event.pipeline_status === 'discarded' && (
              <div>
                <Label>Motivo do Descarte</Label>
                <Textarea
                  defaultValue={event.discard_reason || ''}
                  onBlur={e => onUpdate({ discard_reason: e.target.value })}
                  rows={2}
                />
              </div>
            )}
            <div className="pt-4 border-t">
              <Button variant="destructive" size="sm" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" /> Excluir Evento
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ─── Search Events Dialog ────────────────────────────────────────────────────
function SearchEventsDialog({ open, onOpenChange, eventSearch }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventSearch: ReturnType<typeof import('@/hooks/useEventSearch').useEventSearch>;
}) {
  const [keywordInput, setKeywordInput] = useState('');
  const [searchPlatforms, setSearchPlatforms] = useState<string[]>(['eventbrite', 'sympla']);

  const QUICK_KEYWORDS = [
    'liderança', 'gestão', 'RH', 'cultura organizacional',
    'inovação', 'estratégia', 'vendas', 'empreendedorismo',
  ];

  const handleSearch = () => {
    const keywords = keywordInput
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);
    if (keywords.length === 0) return;
    eventSearch.search.mutate({ keywords, platforms: searchPlatforms });
  };

  const addQuickKeyword = (kw: string) => {
    const current = keywordInput ? keywordInput.split(',').map(k => k.trim()) : [];
    if (!current.includes(kw)) {
      setKeywordInput([...current, kw].join(', '));
    }
  };

  const togglePlatform = (platform: string) => {
    setSearchPlatforms(prev =>
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) eventSearch.clearResults(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radar className="h-5 w-5" /> Buscar Eventos nas Plataformas
          </DialogTitle>
          <DialogDescription>
            Thor busca eventos no Eventbrite e Sympla por palavras-chave e qualifica automaticamente.
          </DialogDescription>
        </DialogHeader>

        {/* Search Form */}
        <div className="space-y-4">
          <div>
            <Label>Palavras-chave (separadas por vírgula)</Label>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="liderança, gestão de pessoas, cultura organizacional..."
                value={keywordInput}
                onChange={e => setKeywordInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={eventSearch.isSearching || !keywordInput.trim()}>
                {eventSearch.isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Quick keywords */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_KEYWORDS.map(kw => (
              <Badge
                key={kw}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => addQuickKeyword(kw)}
              >
                + {kw}
              </Badge>
            ))}
          </div>

          {/* Platform toggles */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={searchPlatforms.includes('eventbrite')}
                onCheckedChange={() => togglePlatform('eventbrite')}
              />
              Eventbrite
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={searchPlatforms.includes('sympla')}
                onCheckedChange={() => togglePlatform('sympla')}
              />
              Sympla
            </label>
          </div>
        </div>

        {/* Results */}
        {eventSearch.results.length > 0 && (
          <div className="space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{eventSearch.results.length} eventos encontrados</p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={eventSearch.selectAll}>
                  <CheckCheck className="mr-1 h-3 w-3" /> Selecionar todos
                </Button>
                <Button variant="ghost" size="sm" onClick={eventSearch.deselectAll}>
                  Limpar seleção
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {eventSearch.results.map((ev) => (
                <SearchResultCard
                  key={ev.fingerprint}
                  event={ev}
                  selected={eventSearch.selectedIds.has(ev.fingerprint)}
                  onToggle={() => eventSearch.toggleSelect(ev.fingerprint)}
                />
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { eventSearch.clearResults(); onOpenChange(false); }}>
                Cancelar
              </Button>
              <Button
                onClick={() => eventSearch.importSelected.mutate()}
                disabled={eventSearch.selectedIds.size === 0 || eventSearch.isImporting}
              >
                {eventSearch.isImporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Importar {eventSearch.selectedIds.size} evento(s)
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Empty state after search */}
        {eventSearch.search.isSuccess && eventSearch.results.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Radar className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum evento encontrado para essas palavras-chave.</p>
            <p className="text-sm mt-1">Tente termos diferentes ou mais amplos.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Search Result Card ──────────────────────────────────────────────────────
function SearchResultCard({ event, selected, onToggle }: {
  event: SearchResult;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
        selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
      }`}
      onClick={onToggle}
    >
      <Checkbox checked={selected} className="mt-1" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{event.name}</span>
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {EVENT_PLATFORM_LABELS[event.platform as EventPlatform] || event.platform}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
          {event.event_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {(() => { try { return format(new Date(event.event_date), 'dd MMM yyyy', { locale: ptBR }); } catch { return 'Data TBD'; } })()}
            </span>
          )}
          {(event.location_city || event.is_online) && (
            <span className="flex items-center gap-1">
              {event.is_online ? <Globe className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
              {event.is_online ? 'Online' : event.location_city}
            </span>
          )}
          {event.estimated_audience && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" /> {event.estimated_audience}
            </span>
          )}
        </div>
        {event.themes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {event.themes.slice(0, 4).map(t => (
              <Badge key={t} variant="outline" className="text-[10px] py-0">
                {THEME_LABELS[t] || t}
              </Badge>
            ))}
          </div>
        )}
        {/* Contact Info */}
        {(event.organizer_email || event.organizer_phone) && (
          <div className="flex items-center gap-2 mt-2 p-1.5 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
            <Badge variant="outline" className="text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 gap-1">
              <Contact className="h-2.5 w-2.5" /> Contato
            </Badge>
            {event.organizer_name && (
              <span className="text-xs font-medium text-foreground">{event.organizer_name}</span>
            )}
            {event.organizer_email && (
              <a href={`mailto:${event.organizer_email}`} className="inline-flex items-center gap-0.5 text-xs text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>
                <Mail className="h-3 w-3" /> {event.organizer_email}
              </a>
            )}
            {event.organizer_phone && (
              <a href={`https://wa.me/${event.organizer_phone.replace(/\D/g, '')}`} className="inline-flex items-center gap-0.5 text-xs text-green-600 hover:underline" onClick={e => e.stopPropagation()}>
                <Phone className="h-3 w-3" /> {event.organizer_phone}
              </a>
            )}
          </div>
        )}
        {event.organizer_name && !event.organizer_email && !event.organizer_phone && (
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
            <Contact className="h-3 w-3" /> {event.organizer_name}
          </div>
        )}
        {event.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{event.description}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 text-yellow-500" />
          <span className={`text-sm font-bold ${
            event.qualification_score >= 60 ? 'text-green-600' :
            event.qualification_score >= 30 ? 'text-yellow-600' : 'text-muted-foreground'
          }`}>
            {event.qualification_score}
          </span>
        </div>
        {event.platform_url && (
          <a
            href={event.platform_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline mt-1 inline-flex items-center gap-0.5"
            onClick={e => e.stopPropagation()}
          >
            Ver <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
      </div>
    </div>
  );
}

function AddContactDialog({ eventId, open, onOpenChange }: {
  eventId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { addContact } = useEventContacts(eventId);
  const [form, setForm] = useState({
    name: '', role: 'organizer', email: '', phone: '', linkedin: '', confidence: 'medium' as const,
  });

  const handleSubmit = () => {
    addContact.mutate({
      event_id: eventId,
      name: form.name || undefined,
      role: form.role,
      email: form.email || undefined,
      phone: form.phone || undefined,
      linkedin: form.linkedin || undefined,
      confidence: form.confidence,
    });
    setForm({ name: '', role: 'organizer', email: '', phone: '', linkedin: '', confidence: 'medium' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Adicionar Contato</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label>Cargo / Função</Label>
            <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="organizer">Organizador</SelectItem>
                <SelectItem value="speaker_coordinator">Coordenador de Palestrantes</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <Label>LinkedIn</Label>
            <Input value={form.linkedin} onChange={e => setForm(f => ({ ...f, linkedin: e.target.value }))} />
          </div>
          <div>
            <Label>Confiança do Contato</Label>
            <Select value={form.confidence} onValueChange={v => setForm(f => ({ ...f, confidence: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
