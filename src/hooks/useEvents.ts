import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProspectEvent, EventContact, EventPipelineStatus } from '@/types';
import { toast } from '@/hooks/use-toast';

export function useEvents() {
  const queryClient = useQueryClient();

  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ProspectEvent[];
    },
  });

  const createEvent = useMutation({
    mutationFn: async (event: Partial<ProspectEvent>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { id, user_id, created_at, updated_at, ...rest } = event as any;
      const { data, error } = await (supabase as any)
        .from('events')
        .insert({ ...rest, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({ title: 'Evento adicionado!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao criar evento', description: err.message, variant: 'destructive' });
    },
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProspectEvent> & { id: string }) => {
      const { user_id, created_at, updated_at, ...rest } = updates as any;
      const { data, error } = await (supabase as any)
        .from('events')
        .update(rest)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao atualizar evento', description: err.message, variant: 'destructive' });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('events')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({ title: 'Evento removido' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao remover evento', description: err.message, variant: 'destructive' });
    },
  });

  const updatePipelineStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: EventPipelineStatus }) => {
      const { data, error } = await (supabase as any)
        .from('events')
        .update({ pipeline_status: status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const convertToLead = useMutation({
    mutationFn: async ({ eventId, contact }: { eventId: string; contact: EventContact }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const event = events.find(e => e.id === eventId);
      if (!event) throw new Error('Event not found');

      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({
          user_id: user.id,
          name: contact.name || 'Organizador',
          company: event.name,
          position: contact.role || 'Organizador',
          email: contact.email,
          phone: contact.phone,
          linkedin: contact.linkedin,
          status: 'new',
          source: 'event',
          score: event.qualification_score,
          industry: 'Eventos',
          location: [event.location_city, event.location_state].filter(Boolean).join(', '),
          notes: `Convertido do evento: ${event.name}\nPlataforma: ${event.platform}\nURL: ${event.platform_url || 'N/A'}`,
          tags: event.themes,
          value: 10000,
        } as any)
        .select()
        .single();
      if (leadError) throw leadError;

      await (supabase as any)
        .from('events')
        .update({ converted_lead_id: lead.id, pipeline_status: 'booked' })
        .eq('id', eventId);

      return lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({ title: 'Evento convertido em Lead!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro na conversão', description: err.message, variant: 'destructive' });
    },
  });

  return {
    events,
    isLoading,
    error,
    createEvent,
    updateEvent,
    deleteEvent,
    updatePipelineStatus,
    convertToLead,
  };
}

export function useEventContacts(eventId?: string) {
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['event-contacts', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('event_contacts')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as EventContact[];
    },
  });

  const addContact = useMutation({
    mutationFn: async (contact: Partial<EventContact>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { id, created_at, ...rest } = contact as any;
      const { data, error } = await (supabase as any)
        .from('event_contacts')
        .insert({ ...rest, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-contacts', eventId] });
      toast({ title: 'Contato adicionado!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao adicionar contato', description: err.message, variant: 'destructive' });
    },
  });

  return { contacts, isLoading, addContact };
}
