import { supabase } from '@/integrations/supabase/client';

export async function exportEventsToCSV() {
  const { data: events, error: evError } = await (supabase as any)
    .from('events')
    .select('*')
    .order('created_at', { ascending: false });
  if (evError) throw evError;

  const { data: contacts, error: ctError } = await (supabase as any)
    .from('event_contacts')
    .select('*')
    .order('created_at', { ascending: false });
  if (ctError) throw ctError;

  const contactsByEvent: Record<string, any[]> = {};
  for (const c of (contacts || [])) {
    if (!contactsByEvent[c.event_id]) contactsByEvent[c.event_id] = [];
    contactsByEvent[c.event_id].push(c);
  }

  const headers = [
    'Evento', 'Data', 'Cidade', 'Estado', 'Local', 'Online', 'Plataforma',
    'URL', 'Público Estimado', 'Score', 'Status', 'Temas',
    'Contato Nome', 'Contato Cargo', 'Contato Email', 'Contato Telefone',
    'Contato LinkedIn', 'Contato Instagram', 'Contato Website', 'Confiança',
  ];

  const rows: string[][] = [];

  for (const ev of (events || [])) {
    const evContacts = contactsByEvent[ev.id] || [];
    if (evContacts.length === 0) {
      rows.push([
        ev.name, ev.event_date || '', ev.location_city || '', ev.location_state || '',
        ev.location_venue || '', ev.is_online ? 'Sim' : 'Não', ev.platform,
        ev.platform_url || '', String(ev.estimated_audience || ''), String(ev.qualification_score || 0),
        ev.pipeline_status, (ev.themes || []).join('; '),
        '', '', '', '', '', '', '', '',
      ]);
    } else {
      for (const c of evContacts) {
        rows.push([
          ev.name, ev.event_date || '', ev.location_city || '', ev.location_state || '',
          ev.location_venue || '', ev.is_online ? 'Sim' : 'Não', ev.platform,
          ev.platform_url || '', String(ev.estimated_audience || ''), String(ev.qualification_score || 0),
          ev.pipeline_status, (ev.themes || []).join('; '),
          c.name || '', c.role || '', c.email || '', c.phone || '',
          c.linkedin || '', c.instagram || '', c.website || '', c.confidence || '',
        ]);
      }
    }
  }

  const escape = (v: string) => {
    if (v.includes(',') || v.includes('"') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `eventos_contatos_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  return { events: (events || []).length, contacts: (contacts || []).length };
}
