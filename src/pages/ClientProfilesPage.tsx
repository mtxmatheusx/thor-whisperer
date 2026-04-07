import { useState } from 'react';
import { useClientProfiles, ClientProfile } from '@/hooks/useClientProfiles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Loader2, Building2, Target, Users, Globe } from 'lucide-react';

const SEGMENT_SUGGESTIONS = [
  'Palestras & Eventos',
  'Marketing Digital',
  'Consultoria',
  'E-commerce',
  'Alimentação',
  'Saúde & Bem-estar',
  'Tecnologia',
  'Educação',
];

export default function ClientProfilesPage() {
  const { profiles, isLoading, createProfile, updateProfile, deleteProfile } = useClientProfiles();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClientProfile | null>(null);

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (p: ClientProfile) => { setEditing(p); setDialogOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meus Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie perfis de clientes para prospecção personalizada
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : profiles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-1">Nenhum cliente cadastrado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Cadastre seus clientes para fazer prospecção personalizada para cada um
            </p>
            <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Criar Primeiro Cliente</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map(profile => (
            <Card key={profile.id} className={!profile.active ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{profile.name}</CardTitle>
                    {profile.segment && (
                      <CardDescription className="mt-1">
                        <Badge variant="secondary" className="text-xs">{profile.segment}</Badge>
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(profile)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => { if (confirm('Excluir este perfil?')) deleteProfile.mutate(profile.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {profile.target_audience && (
                  <div className="flex items-start gap-2 text-sm">
                    <Target className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <span>{profile.target_audience}</span>
                  </div>
                )}
                {profile.industry && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{profile.industry}</span>
                  </div>
                )}
                {profile.service_description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{profile.service_description}</p>
                )}
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <Globe className="h-3 w-3" /> {profile.website}
                  </a>
                )}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    {profile.active ? '✅ Ativo' : '⏸ Inativo'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ClientProfileDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSave={(data) => {
          if (editing) {
            updateProfile.mutate({ id: editing.id, ...data });
          } else {
            createProfile.mutate(data);
          }
          setDialogOpen(false);
        }}
      />
    </div>
  );
}

function ClientProfileDialog({ open, onOpenChange, editing, onSave }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: ClientProfile | null;
  onSave: (data: Partial<ClientProfile>) => void;
}) {
  const [form, setForm] = useState<Partial<ClientProfile>>({
    name: '', segment: '', target_audience: '', service_description: '',
    industry: '', website: '', active: true,
  });

  const resetForm = () => {
    if (editing) {
      setForm({
        name: editing.name, segment: editing.segment, target_audience: editing.target_audience,
        service_description: editing.service_description, industry: editing.industry,
        website: editing.website, active: editing.active,
      });
    } else {
      setForm({ name: '', segment: '', target_audience: '', service_description: '', industry: '', website: '', active: true });
    }
  };

  // Reset form when dialog opens
  useState(() => { resetForm(); });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome do Cliente *</Label>
            <Input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Assessoria de Marketing XYZ" />
          </div>
          <div>
            <Label>Segmento</Label>
            <Input value={form.segment || ''} onChange={e => setForm(f => ({ ...f, segment: e.target.value }))}
              placeholder="Ex: Marketing Digital" />
            <div className="flex flex-wrap gap-1 mt-1">
              {SEGMENT_SUGGESTIONS.map(s => (
                <Badge key={s} variant={form.segment === s ? 'default' : 'outline'}
                  className="cursor-pointer text-[10px]"
                  onClick={() => setForm(f => ({ ...f, segment: s }))}>
                  {s}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <Label>Público-Alvo</Label>
            <Textarea value={form.target_audience || ''} onChange={e => setForm(f => ({ ...f, target_audience: e.target.value }))}
              placeholder="Ex: Donos de hamburgueria, gestores de e-commerce, clínicas de estética..." rows={2} />
          </div>
          <div>
            <Label>Descrição do Serviço</Label>
            <Textarea value={form.service_description || ''} onChange={e => setForm(f => ({ ...f, service_description: e.target.value }))}
              placeholder="Descreva os serviços oferecidos por este cliente..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Indústria</Label>
              <Input value={form.industry || ''} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                placeholder="Ex: Eventos, Food Service" />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={form.website || ''} onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                placeholder="https://..." />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.active ?? true} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
            <Label>Cliente ativo</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={!form.name?.trim()}>
            {editing ? 'Salvar Alterações' : 'Criar Cliente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
