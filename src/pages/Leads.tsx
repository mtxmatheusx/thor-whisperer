import { useState, useMemo } from 'react';
import { useLeads } from '@/hooks/useLeads';
import { Lead, LeadStatus, LeadSource, LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, LEAD_SOURCE_LABELS } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Upload, Trash2, Edit, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const STATUSES: LeadStatus[] = ['new', 'contacted', 'responded', 'qualified', 'meeting', 'proposal', 'closed', 'lost'];
const SOURCES: LeadSource[] = ['linkedin', 'instagram', 'referral', 'import'];

export default function LeadsPage() {
  const { leads, isLoading, createLead, updateLead, deleteLead } = useLeads();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (sourceFilter !== 'all' && l.source !== sourceFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return l.name.toLowerCase().includes(s) || l.company.toLowerCase().includes(s) || l.position.toLowerCase().includes(s);
      }
      return true;
    });
  }, [leads, search, statusFilter, sourceFilter]);

  const openCreate = () => { setEditingLead(null); setDialogOpen(true); };
  const openEdit = (lead: Lead) => { setEditingLead(lead); setDialogOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground">{leads.length} leads no total · {filtered.length} exibidos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCsvDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-1" /> Importar CSV
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Novo Lead
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome, empresa..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{LEAD_STATUS_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Fonte" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Fontes</SelectItem>
                {SOURCES.map(s => <SelectItem key={s} value={s}>{LEAD_SOURCE_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {leads.length === 0 ? 'Nenhum lead cadastrado. Clique em "Novo Lead" para começar.' : 'Nenhum lead encontrado com esses filtros.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(lead => (
                  <TableRow key={lead.id} className="cursor-pointer" onClick={() => openEdit(lead)}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.position}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{lead.company}</TableCell>
                    <TableCell>
                      <Badge className={LEAD_STATUS_COLORS[lead.status] + ' text-xs'}>{LEAD_STATUS_LABELS[lead.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{LEAD_SOURCE_LABELS[lead.source]}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 rounded-full bg-muted">
                          <div className="h-2 rounded-full bg-primary" style={{ width: `${lead.score}%` }} />
                        </div>
                        <span className="text-xs">{lead.score}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {lead.value ? `R$ ${lead.value.toLocaleString('pt-BR')}` : '—'}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); deleteLead.mutate(lead.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <LeadDialog open={dialogOpen} onOpenChange={setDialogOpen} lead={editingLead} onCreate={createLead} onUpdate={updateLead} />
      <CsvImportDialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen} onCreate={createLead} />
    </div>
  );
}

function LeadDialog({ open, onOpenChange, lead, onCreate, onUpdate }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: Lead | null;
  onCreate: any;
  onUpdate: any;
}) {
  const [form, setForm] = useState({
    name: '', company: '', position: '', email: '', linkedin: '', phone: '',
    status: 'new' as LeadStatus, source: 'import' as LeadSource, score: 50,
    industry: '', company_size: '1-10', location: '', notes: '', value: 0, tags: [] as string[],
  });

  const isEdit = !!lead;

  useEffect(() => {
    if (lead) {
      setForm({
        name: lead.name, company: lead.company, position: lead.position,
        email: lead.email || '', linkedin: lead.linkedin || '', phone: lead.phone || '',
        status: lead.status, source: lead.source, score: lead.score,
        industry: lead.industry, company_size: lead.company_size,
        location: lead.location, notes: lead.notes, value: lead.value || 0, tags: lead.tags || [],
      });
    } else {
      setForm({
        name: '', company: '', position: '', email: '', linkedin: '', phone: '',
        status: 'new', source: 'import', score: 50,
        industry: '', company_size: '1-10', location: '', notes: '', value: 0, tags: [],
      });
    }
  }, [lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEdit && lead) {
        await onUpdate.mutateAsync({ id: lead.id, ...form });
      } else {
        await onCreate.mutateAsync(form);
      }
      onOpenChange(false);
    } catch {}
  };

  const set = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Empresa *</Label>
              <Input value={form.company} onChange={e => set('company', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Input value={form.position} onChange={e => set('position', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>LinkedIn</Label>
              <Input value={form.linkedin} onChange={e => set('linkedin', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{LEAD_STATUS_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fonte</Label>
              <Select value={form.source} onValueChange={v => set('source', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCES.map(s => <SelectItem key={s} value={s}>{LEAD_SOURCE_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Score (0-100)</Label>
              <Input type="number" min={0} max={100} value={form.score} onChange={e => set('score', parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" min={0} value={form.value} onChange={e => set('value', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Indústria</Label>
              <Input value={form.industry} onChange={e => set('industry', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Localização</Label>
              <Input value={form.location} onChange={e => set('location', e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">{isEdit ? 'Salvar' : 'Criar Lead'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CsvImportDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (v: boolean) => void; onCreate: any }) {
  const [importing, setImporting] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast({ title: 'CSV vazio', variant: 'destructive' }); return; }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      let imported = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

        await onCreate.mutateAsync({
          name: row.name || row.nome || `Lead ${i}`,
          company: row.company || row.empresa || '',
          position: row.position || row.cargo || '',
          email: row.email || '',
          linkedin: row.linkedin || '',
          phone: row.phone || row.telefone || '',
          source: 'import' as LeadSource,
          status: 'new' as LeadStatus,
          score: parseInt(row.score) || 50,
          industry: row.industry || row.industria || '',
          notes: row.notes || row.notas || '',
        });
        imported++;
      }

      toast({ title: `${imported} leads importados com sucesso!` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Erro na importação', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar Leads via CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            O CSV deve ter colunas: name/nome, company/empresa, position/cargo, email, linkedin, phone/telefone, score, industry/industria
          </p>
          <Input type="file" accept=".csv" onChange={handleFile} disabled={importing} />
          {importing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Importando...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
