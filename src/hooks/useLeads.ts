import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Lead, ThorAnalysis } from '@/types';
import { toast } from '@/hooks/use-toast';

export function useLeads() {
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        thor_analysis: row.thor_analysis as unknown as ThorAnalysis | undefined,
      })) as Lead[];
    },
  });

  const createLead = useMutation({
    mutationFn: async (lead: Partial<Lead>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { thor_analysis, ...rest } = lead;
      const { data, error } = await supabase
        .from('leads')
        .insert({ ...rest, user_id: user.id, thor_analysis: thor_analysis as unknown as Record<string, unknown> })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({ title: 'Lead criado com sucesso!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao criar lead', description: err.message, variant: 'destructive' });
    },
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lead> & { id: string }) => {
      const { thor_analysis, ...rest } = updates;
      const payload: Record<string, unknown> = { ...rest };
      if (thor_analysis !== undefined) {
        payload.thor_analysis = thor_analysis as unknown as Record<string, unknown>;
      }
      const { data, error } = await supabase
        .from('leads')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({ title: 'Lead atualizado!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao atualizar lead', description: err.message, variant: 'destructive' });
    },
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({ title: 'Lead removido!' });
    },
  });

  return { leads, isLoading, error, createLead, updateLead, deleteLead };
}
