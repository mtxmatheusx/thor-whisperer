import { useState, useMemo } from 'react';
import { useBusinessProspects, useBusinessSearch, BusinessProspect, BusinessSearchResult } from '@/hooks/useBusinessProspects';
import { useClientProfiles } from '@/hooks/useClientProfiles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Search, Loader2, Mail, Phone, Instagram, Linkedin, Globe, Star,
  Trash2, Plus, Building2, MapPin, CheckCheck, Radar, ExternalLink,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const STATUS_LABELS: Record<string, string> = {
  new: 'Novo',
  contacted: 'Contatado',
  responded: 'Respondeu',
  meeting: 'Reunião',
  client: 'Cliente',
  lost: 'Perdido',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  responded: 'bg-green-100 text-green-800',
  meeting: 'bg-purple-100 text-purple-800',
  client: 'bg-emerald-100 text-emerald-800',
  lost: 'bg-red-100 text-red-800',
};

const SEGMENT_PRESETS = [
  { label: 'Hamburguerias', value: 'hamburgueria artesanal' },
  { label: 'E-commerce', value: 'loja e-commerce online' },
  { label: 'Clínicas de Estética', value: 'clínica estética' },
  { label: 'Restaurantes', value: 'restaurante' },
  { label: 'Academias', value: 'academia crossfit' },
  { label: 'Salões de Beleza', value: 'salão beleza cabeleireiro' },
  { label: 'Consultórios', value: 'consultório médico dentista' },
  { label: 'Imobiliárias', value: 'imobiliária corretor' },
];

export default function BusinessProspectingPage() {
  const { activeProfiles } = useClientProfiles();
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const { prospects, isLoading, deleteProspect, updateProspect } = useBusinessProspects(
    selectedClient !== 'all' ? selectedClient : undefined
  );
  const businessSearch = useBusinessSearch();
  const [searchOpen, setSearchOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  const filtered = useMemo(() => {
    return prospects.filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (searchText) {
        const s = searchText.toLowerCase();
        return p.business_name.toLowerCase().includes(s) ||
          (p.segment || '').toLowerCase().includes(s) ||
          (p.city || '').toLowerCase().includes(s) ||
          (p.email || '').toLowerCase().includes(s);
      }
      return true;
    });
  }, [prospects, statusFilter, searchText]);

  const stats = useMemo(() => ({
    total: prospects.length,
    withEmail: prospects.filter(p => p.email).length,
    withPhone: prospects.filter(p => p.phone).length,
    contacted: prospects.filter(p => ['contacted', 'responded', 'meeting', 'client'].includes(p.status)).length,
  }), [prospects]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prospecção de Empresários</h1>
          <p className="text-sm text-muted-foreground">Encontre empresários por nicho para oferecer seus serviços</p>
        </div>
        <Button onClick={() => setSearchOpen(true)}>
          <Radar className="mr-2 h-4 w-4" /> Buscar Empresas
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-sm text-muted-foreground">Com Email</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.withEmail}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-sm text-muted-foreground">Com Telefone</p>
          <p className="text-2xl font-bold text-blue-600">{stats.withPhone}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-sm text-muted-foreground">Contatados</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.contacted}</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar prospects..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {activeProfiles.length > 0 && (
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Cliente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {activeProfiles.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Prospects List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-1">Nenhum prospect encontrado</h3>
            <p className="text-sm text-muted-foreground mb-4">Busque empresas por nicho para começar</p>
            <Button onClick={() => setSearchOpen(true)}><Radar className="mr-2 h-4 w-4" /> Buscar Empresas</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(prospect => (
            <ProspectCard
              key={prospect.id}
              prospect={prospect}
              onDelete={() => deleteProspect.mutate(prospect.id)}
              onStatusChange={(status) => updateProspect.mutate({ id: prospect.id, status: status as BusinessProspect['status'] })}
            />
          ))}
        </div>
      )}

      {/* Search Dialog */}
      <SearchBusinessDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        businessSearch={businessSearch}
        clientProfiles={activeProfiles}
      />
    </div>
  );
}

function ProspectCard({ prospect, onDelete, onStatusChange }: {
  prospect: BusinessProspect;
  onDelete: () => void;
  onStatusChange: (status: string) => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm">{prospect.business_name}</p>
            <Badge variant="secondary" className="text-[10px] mt-1">{prospect.segment}</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Badge className={`text-[10px] ${STATUS_COLORS[prospect.status] || ''}`}>
              {STATUS_LABELS[prospect.status] || prospect.status}
            </Badge>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); if (confirm('Excluir?')) onDelete(); }}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {(prospect.city || prospect.state) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {[prospect.city, prospect.state].filter(Boolean).join(', ')}
          </div>
        )}

        {prospect.rating && (
          <div className="flex items-center gap-1 text-xs">
            <Star className="h-3 w-3 text-yellow-500" />
            {prospect.rating} {prospect.review_count ? `(${prospect.review_count} avaliações)` : ''}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {prospect.email && (
            <a href={`mailto:${prospect.email}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
              <Mail className="h-3 w-3" /> {prospect.email}
            </a>
          )}
          {prospect.phone && (
            <a href={`tel:${prospect.phone}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
              <Phone className="h-3 w-3" /> {prospect.phone}
            </a>
          )}
          {prospect.instagram && (
            <a href={`https://instagram.com/${prospect.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline">
              <Instagram className="h-3 w-3" /> {prospect.instagram}
            </a>
          )}
          {prospect.linkedin && (
            <a href={prospect.linkedin} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline">
              <Linkedin className="h-3 w-3" /> LinkedIn
            </a>
          )}
          {prospect.website && (
            <a href={prospect.website} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline">
              <Globe className="h-3 w-3" /> Site
            </a>
          )}
        </div>

        <Select value={prospect.status} onValueChange={onStatusChange}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}

function SearchBusinessDialog({ open, onOpenChange, businessSearch, clientProfiles }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  businessSearch: ReturnType<typeof useBusinessSearch>;
  clientProfiles: Array<{ id: string; name: string }>;
}) {
  const [segment, setSegment] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [clientId, setClientId] = useState<string>('');

  const handleSearch = () => {
    if (!segment.trim()) return;
    businessSearch.search.mutate({ segment, city, state, limit: 15 });
  };

  const handleImport = () => {
    businessSearch.importSelected.mutate(clientId || undefined);
  };

  const selectedCount = businessSearch.selectedIds.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buscar Empresas por Nicho</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Segment presets */}
          <div>
            <Label>Segmento / Nicho</Label>
            <Input value={segment} onChange={e => setSegment(e.target.value)}
              placeholder="Ex: hamburgueria artesanal, clínica estética..."
              onKeyDown={e => e.key === 'Enter' && handleSearch()} />
            <div className="flex flex-wrap gap-1 mt-2">
              {SEGMENT_PRESETS.map(p => (
                <Badge key={p.value} variant={segment === p.value ? 'default' : 'outline'}
                  className="cursor-pointer text-xs" onClick={() => setSegment(p.value)}>
                  {p.label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Cidade</Label>
              <Input value={city} onChange={e => setCity(e.target.value)} placeholder="São Paulo" />
            </div>
            <div>
              <Label>Estado</Label>
              <Input value={state} onChange={e => setState(e.target.value)} placeholder="SP" />
            </div>
            {clientProfiles.length > 0 && (
              <div>
                <Label>Vincular ao Cliente</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {clientProfiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Button onClick={handleSearch} disabled={businessSearch.isSearching || !segment.trim()} className="w-full">
            {businessSearch.isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Buscar Empresas
          </Button>
        </div>

        {/* Results */}
        {businessSearch.results.length > 0 && (
          <div className="space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{businessSearch.results.length} resultado(s)</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={businessSearch.selectAll}>
                  <CheckCheck className="mr-1 h-3 w-3" /> Selecionar Tudo
                </Button>
                {selectedCount > 0 && (
                  <Button size="sm" onClick={handleImport} disabled={businessSearch.isImporting}>
                    {businessSearch.isImporting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />}
                    Importar ({selectedCount})
                  </Button>
                )}
              </div>
            </div>

            {businessSearch.results.map((biz, idx) => (
              <Card key={idx} className={`transition-colors ${businessSearch.selectedIds.has(idx) ? 'ring-2 ring-primary' : ''}`}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={businessSearch.selectedIds.has(idx)}
                      onCheckedChange={() => businessSearch.toggleSelect(idx)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between">
                        <p className="font-medium text-sm">{biz.business_name}</p>
                        <Badge variant={biz.confidence === 'high' ? 'default' : 'outline'} className="text-[10px]">
                          {biz.confidence === 'high' ? '✓ Verificado' : biz.confidence === 'medium' ? '~ Parcial' : '? Baixa'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs">
                        {biz.email && (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <Mail className="h-3 w-3" /> {biz.email}
                          </span>
                        )}
                        {biz.phone && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <Phone className="h-3 w-3" /> {biz.phone}
                          </span>
                        )}
                        {biz.instagram && (
                          <span className="flex items-center gap-1 text-pink-600">
                            <Instagram className="h-3 w-3" /> {biz.instagram}
                          </span>
                        )}
                        {biz.linkedin && (
                          <span className="flex items-center gap-1 text-blue-700">
                            <Linkedin className="h-3 w-3" /> LinkedIn
                          </span>
                        )}
                      </div>
                      {biz.website && (
                        <a href={biz.website} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                          <ExternalLink className="h-3 w-3" /> {biz.website}
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
