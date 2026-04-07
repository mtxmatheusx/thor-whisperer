import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface BusinessProspect {
  id: string;
  user_id: string;
  client_profile_id?: string;
  business_name: string;
  owner_name?: string;
  segment: string;
  city: string;
  state: string;
  email?: string;
  phone?: string;
  instagram?: string;
  linkedin?: string;
  website?: string;
  google_maps_url?: string;
  rating?: number;
  review_count?: number;
  address?: string;
  status: 'new' | 'contacted' | 'responded' | 'meeting' | 'client' | 'lost';
  notes: string;
  source: string;
  confidence: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessSearchResult {
  business_name: string;
  segment: string;
  city: string;
  state: string;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  linkedin: string | null;
  website: string | null;
  rating: number | null;
  review_count: number | null;
  source: string;
  confidence: string;
}

export function useBusinessProspects(clientProfileId?: string) {
  const queryClient = useQueryClient();

  const { data: prospects = [], isLoading } = useQuery({
    queryKey: ['business-prospects', clientProfileId],
    queryFn: async () => {
      let query = (supabase as any)
        .from('business_prospects')
        .select('*')
        .order('created_at', { ascending: false });
      if (clientProfileId) {
        query = query.eq('client_profile_id', clientProfileId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as BusinessProspect[];
    },
  });

  const deleteProspect = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('business_prospects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-prospects'] });
      toast({ title: 'Prospect removido' });
    },
  });

  const updateProspect = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BusinessProspect> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('business_prospects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-prospects'] });
    },
  });

  return { prospects, isLoading, deleteProspect, updateProspect };
}

export function useBusinessSearch() {
  const queryClient = useQueryClient();
  const [results, setResults] = useState<BusinessSearchResult[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const search = useMutation({
    mutationFn: async ({ segment, city, state, limit }: {
      segment: string; city?: string; state?: string; limit?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke('search-businesses', {
        body: { segment, city, state, limit },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setResults(data.businesses || []);
      setSelectedIds(new Set());
      const withContact = (data.businesses || []).filter(
        (b: BusinessSearchResult) => b.email || b.phone
      ).length;
      toast({
        title: `${data.total} empresas encontradas`,
        description: `${withContact} com dados de contato`,
      });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro na busca', description: err.message, variant: 'destructive' });
    },
  });

  const toggleSelect = (idx: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(results.map((_, i) => i)));
  const deselectAll = () => setSelectedIds(new Set());

  const importSelected = useMutation({
    mutationFn: async (clientProfileId?: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const toImport = results.filter((_, i) => selectedIds.has(i));
      if (toImport.length === 0) throw new Error('Nenhuma empresa selecionada');

      const rows = toImport.map(b => ({
        user_id: user.id,
        client_profile_id: clientProfileId || null,
        business_name: b.business_name,
        segment: b.segment,
        city: b.city,
        state: b.state,
        email: b.email,
        phone: b.phone,
        instagram: b.instagram,
        linkedin: b.linkedin,
        website: b.website,
        rating: b.rating,
        review_count: b.review_count,
        source: b.source,
        confidence: b.confidence,
        status: 'new',
      }));

      const { data, error } = await (supabase as any)
        .from('business_prospects')
        .insert(rows)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['business-prospects'] });
      toast({ title: `${data?.length || 0} empresa(s) importada(s)` });
      setResults(prev => prev.filter((_, i) => !selectedIds.has(i)));
      setSelectedIds(new Set());
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao importar', description: err.message, variant: 'destructive' });
    },
  });

  return {
    results, selectedIds, search, toggleSelect, selectAll, deselectAll,
    importSelected, isSearching: search.isPending, isImporting: importSelected.isPending,
    clearResults: () => { setResults([]); setSelectedIds(new Set()); },
  };
}
