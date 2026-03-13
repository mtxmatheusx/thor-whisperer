import { useState, DragEvent } from 'react';
import { Lead, LeadStatus, LEAD_STATUS_LABELS } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { User, Building2, GripVertical } from 'lucide-react';

const KANBAN_COLUMNS: { status: LeadStatus; color: string; bgColor: string }[] = [
  { status: 'new', color: 'border-t-blue-500', bgColor: 'bg-blue-500/10' },
  { status: 'contacted', color: 'border-t-yellow-500', bgColor: 'bg-yellow-500/10' },
  { status: 'responded', color: 'border-t-green-500', bgColor: 'bg-green-500/10' },
  { status: 'qualified', color: 'border-t-purple-500', bgColor: 'bg-purple-500/10' },
  { status: 'meeting', color: 'border-t-indigo-500', bgColor: 'bg-indigo-500/10' },
  { status: 'proposal', color: 'border-t-orange-500', bgColor: 'bg-orange-500/10' },
  { status: 'closed', color: 'border-t-emerald-500', bgColor: 'bg-emerald-500/10' },
  { status: 'lost', color: 'border-t-red-500', bgColor: 'bg-red-500/10' },
];

interface KanbanBoardProps {
  leads: Lead[];
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  onLeadClick?: (lead: Lead) => void;
}

export function KanbanBoard({ leads, onStatusChange, onLeadClick }: KanbanBoardProps) {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<LeadStatus | null>(null);

  const handleDragStart = (e: DragEvent, leadId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', leadId);
    setDraggedLeadId(leadId);
  };

  const handleDragOver = (e: DragEvent, status: LeadStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: DragEvent, newStatus: LeadStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    if (leadId) {
      const lead = leads.find(l => l.id === leadId);
      if (lead && lead.status !== newStatus) {
        onStatusChange(leadId, newStatus);
      }
    }
    setDraggedLeadId(null);
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedLeadId(null);
    setDragOverColumn(null);
  };

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-3 pb-4 min-w-max">
        {KANBAN_COLUMNS.map(({ status, color, bgColor }) => {
          const columnLeads = leads.filter(l => l.status === status);
          const isOver = dragOverColumn === status;

          return (
            <div
              key={status}
              className={`w-[260px] flex flex-col rounded-xl border-t-4 ${color} bg-card transition-all duration-200 ${
                isOver ? 'ring-2 ring-primary/50 scale-[1.01]' : ''
              }`}
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, status)}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b">
                <span className="text-sm font-semibold">{LEAD_STATUS_LABELS[status]}</span>
                <Badge variant="secondary" className="text-xs h-5 px-1.5">
                  {columnLeads.length}
                </Badge>
              </div>

              {/* Cards area */}
              <div className={`flex-1 p-2 space-y-2 min-h-[120px] transition-colors ${
                isOver ? bgColor : ''
              }`}>
                {columnLeads.map((lead) => (
                  <Card
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onLeadClick?.(lead)}
                    className={`p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-150 group ${
                      draggedLeadId === lead.id ? 'opacity-40 scale-95' : 'opacity-100'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-4 w-4 mt-0.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{lead.name}</p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">{lead.company}</span>
                        </div>
                        {lead.position && (
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                            <User className="h-3 w-3 shrink-0" />
                            <span className="truncate">{lead.position}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            <div className="h-1.5 w-10 rounded-full bg-muted">
                              <div
                                className="h-1.5 rounded-full bg-primary"
                                style={{ width: `${lead.score}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground">{lead.score}</span>
                          </div>
                          {lead.value ? (
                            <span className="text-[10px] font-medium text-emerald-600">
                              R$ {lead.value.toLocaleString('pt-BR')}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}

                {columnLeads.length === 0 && (
                  <div className={`flex items-center justify-center h-20 rounded-lg border border-dashed text-xs text-muted-foreground ${
                    isOver ? 'border-primary/50 text-primary' : ''
                  }`}>
                    {isOver ? 'Soltar aqui' : 'Vazio'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
