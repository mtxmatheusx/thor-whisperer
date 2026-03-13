import { useState } from 'react';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useLeads } from '@/hooks/useLeads';
import { Campaign, CampaignStep, CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_COLORS, LEAD_STATUS_LABELS } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus, Trash2, Play, Pause, MessageSquare, Clock, GitBranch,
  Mail, Send, Calendar, FileText, Loader2, Megaphone, ArrowDown, Users
} from 'lucide-react';

const STEP_ICONS = {
  message: MessageSquare,
  wait: Clock,
  condition: GitBranch,
};

const MESSAGE_TYPE_LABELS = {
  initial_outreach: 'Primeiro Contato',
  follow_up: 'Follow-up',
  meeting_request: 'Agendar Reunião',
  proposal: 'Proposta',
};

const PLATFORM_ICONS = {
  linkedin: Mail,
  instagram: Send,
  email: Mail,
  phone: Calendar,
  meeting: Calendar,
};

export default function CampaignsPage() {
  const { campaigns, createCampaign, deleteCampaign, addStep, removeStep, setStatus, assignLeads } = useCampaigns();
  const { leads } = useLeads();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleCreate = () => {
    if (!newName.trim()) return;
    const c = createCampaign(newName, newDesc);
    setSelectedCampaign(c);
    setCreateOpen(false);
    setNewName('');
    setNewDesc('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" /> Campanhas
          </h1>
          <p className="text-muted-foreground">Crie sequências de outreach automatizadas</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nova Campanha
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Nenhuma campanha criada ainda.</p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Criar Primeira Campanha
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {/* Campaign list */}
          <div className="grid md:grid-cols-3 gap-4">
            {campaigns.map(c => (
              <Card
                key={c.id}
                className={`cursor-pointer transition-all hover:shadow-md ${selectedCampaign?.id === c.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedCampaign(c)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{c.name}</CardTitle>
                    <Badge className={CAMPAIGN_STATUS_COLORS[c.status] + ' text-xs'}>
                      {CAMPAIGN_STATUS_LABELS[c.status]}
                    </Badge>
                  </div>
                  {c.description && <CardDescription className="text-xs">{c.description}</CardDescription>}
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{c.steps.length} etapas</span>
                    <span>{c.targetLeadIds.length} leads</span>
                  </div>
                  <div className="flex gap-3 mt-2 text-xs">
                    <span>📤 {c.stats.sent}</span>
                    <span>📬 {c.stats.opened}</span>
                    <span>💬 {c.stats.replied}</span>
                    <span>📅 {c.stats.meetings}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Campaign detail / builder */}
          {selectedCampaign && (
            <CampaignBuilder
              campaign={selectedCampaign}
              onAddStep={(step) => addStep(selectedCampaign.id, step)}
              onRemoveStep={(stepId) => removeStep(selectedCampaign.id, stepId)}
              onSetStatus={(status) => setStatus(selectedCampaign.id, status)}
              onDelete={() => { deleteCampaign(selectedCampaign.id); setSelectedCampaign(null); }}
              onAssignLeads={() => setAssignOpen(true)}
            />
          )}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Campanha</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Outreach Q1 LinkedIn" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} placeholder="Descrição opcional..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign leads dialog */}
      {selectedCampaign && (
        <AssignLeadsDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          leads={leads}
          selectedIds={selectedCampaign.targetLeadIds}
          onSave={(ids) => { assignLeads(selectedCampaign.id, ids); setAssignOpen(false); }}
        />
      )}
    </div>
  );
}

function CampaignBuilder({ campaign, onAddStep, onRemoveStep, onSetStatus, onDelete, onAssignLeads }: {
  campaign: Campaign;
  onAddStep: (step: Omit<CampaignStep, 'id' | 'order'>) => void;
  onRemoveStep: (stepId: string) => void;
  onSetStatus: (status: any) => void;
  onDelete: () => void;
  onAssignLeads: () => void;
}) {
  const [addStepOpen, setAddStepOpen] = useState(false);
  const [stepType, setStepType] = useState<'message' | 'wait' | 'condition'>('message');
  const [stepPlatform, setStepPlatform] = useState('email');
  const [stepMsgType, setStepMsgType] = useState('initial_outreach');
  const [stepTemplate, setStepTemplate] = useState('');
  const [stepWaitDays, setStepWaitDays] = useState(3);

  const handleAddStep = () => {
    if (stepType === 'message') {
      onAddStep({ type: 'message', platform: stepPlatform as any, messageType: stepMsgType as any, template: stepTemplate });
    } else if (stepType === 'wait') {
      onAddStep({ type: 'wait', waitDays: stepWaitDays });
    } else {
      onAddStep({ type: 'condition', condition: stepTemplate });
    }
    setAddStepOpen(false);
    setStepTemplate('');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{campaign.name} — Sequência</CardTitle>
            <CardDescription>{campaign.steps.length} etapas · {campaign.targetLeadIds.length} leads</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onAssignLeads}>
              <Users className="h-4 w-4 mr-1" /> Leads
            </Button>
            {campaign.status === 'draft' || campaign.status === 'paused' ? (
              <Button size="sm" onClick={() => onSetStatus('active')}>
                <Play className="h-4 w-4 mr-1" /> Ativar
              </Button>
            ) : campaign.status === 'active' ? (
              <Button size="sm" variant="outline" onClick={() => onSetStatus('paused')}>
                <Pause className="h-4 w-4 mr-1" /> Pausar
              </Button>
            ) : null}
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Steps visualization */}
        <div className="space-y-1">
          {campaign.steps.map((step, i) => {
            const Icon = STEP_ICONS[step.type];
            return (
              <div key={step.id}>
                <div className="flex items-center gap-3 rounded-lg border p-3 group">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {step.type === 'message'
                        ? `${MESSAGE_TYPE_LABELS[step.messageType || 'initial_outreach']} via ${step.platform}`
                        : step.type === 'wait'
                        ? `Aguardar ${step.waitDays} dia(s)`
                        : `Condição: ${step.condition || '...'}`}
                    </p>
                    {step.template && (
                      <p className="text-xs text-muted-foreground truncate">{step.template}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">#{step.order}</Badge>
                  <Button
                    variant="ghost" size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onRemoveStep(step.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
                {i < campaign.steps.length - 1 && (
                  <div className="flex justify-center py-0.5">
                    <ArrowDown className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Button variant="outline" className="w-full mt-3" onClick={() => setAddStepOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar Etapa
        </Button>

        {/* Add step dialog */}
        <Dialog open={addStepOpen} onOpenChange={setAddStepOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Etapa</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={stepType} onValueChange={v => setStepType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="message">📩 Mensagem</SelectItem>
                    <SelectItem value="wait">⏳ Aguardar</SelectItem>
                    <SelectItem value="condition">🔀 Condição</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {stepType === 'message' && (
                <>
                  <div className="space-y-2">
                    <Label>Plataforma</Label>
                    <Select value={stepPlatform} onValueChange={setStepPlatform}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="phone">Telefone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Mensagem</Label>
                    <Select value={stepMsgType} onValueChange={setStepMsgType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="initial_outreach">Primeiro Contato</SelectItem>
                        <SelectItem value="follow_up">Follow-up</SelectItem>
                        <SelectItem value="meeting_request">Agendar Reunião</SelectItem>
                        <SelectItem value="proposal">Proposta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Template da Mensagem</Label>
                    <Textarea
                      value={stepTemplate}
                      onChange={e => setStepTemplate(e.target.value)}
                      placeholder="Olá {nome}, vi que a {empresa} está..."
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">Use {'{nome}'}, {'{empresa}'}, {'{cargo}'} como variáveis</p>
                  </div>
                </>
              )}

              {stepType === 'wait' && (
                <div className="space-y-2">
                  <Label>Dias de Espera</Label>
                  <Input type="number" min={1} max={30} value={stepWaitDays} onChange={e => setStepWaitDays(parseInt(e.target.value) || 1)} />
                </div>
              )}

              {stepType === 'condition' && (
                <div className="space-y-2">
                  <Label>Condição</Label>
                  <Textarea value={stepTemplate} onChange={e => setStepTemplate(e.target.value)} placeholder="Ex: Se respondeu → parar sequência" rows={2} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddStepOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddStep}>Adicionar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function AssignLeadsDialog({ open, onOpenChange, leads, selectedIds, onSave }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leads: any[];
  selectedIds: string[];
  onSave: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(selectedIds);

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Atribuir Leads à Campanha</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {leads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum lead disponível</p>
          ) : (
            leads.map(lead => (
              <div key={lead.id} className="flex items-center gap-3 rounded-lg border p-2.5 hover:bg-muted/50 cursor-pointer" onClick={() => toggle(lead.id)}>
                <Checkbox checked={selected.includes(lead.id)} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.company} · {LEAD_STATUS_LABELS[lead.status]}</p>
                </div>
              </div>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSave(selected)}>{selected.length} leads selecionados</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
