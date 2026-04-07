import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ClientProfile {
  id: string;
  user_id: string;
  name: string;
  segment: string;
  target_audience: string;
  service_description: string;
  industry: string;
  website: string;
  logo_url: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function useClientProfiles() {
  const queryClient = useQueryClient();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['client-profiles'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('client_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ClientProfile[];
    },
  });

  const createProfile = useMutation({
    mutationFn: async (profile: Partial<ClientProfile>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { id, user_id, created_at, updated_at, ...rest } = profile as any;
      const { data, error } = await (supabase as any)
        .from('client_profiles')
        .insert({ ...rest, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-profiles'] });
      toast({ title: 'Perfil de cliente criado!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao criar perfil', description: err.message, variant: 'destructive' });
    },
  });

  const updateProfile = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ClientProfile> & { id: string }) => {
      const { user_id, created_at, updated_at, ...rest } = updates as any;
      const { data, error } = await (supabase as any)
        .from('client_profiles')
        .update(rest)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-profiles'] });
      toast({ title: 'Perfil atualizado!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' });
    },
  });

  const deleteProfile = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('client_profiles')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-profiles'] });
      toast({ title: 'Perfil removido' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' });
    },
  });

  const activeProfiles = profiles.filter(p => p.active);

  return { profiles, activeProfiles, isLoading, createProfile, updateProfile, deleteProfile };
}
