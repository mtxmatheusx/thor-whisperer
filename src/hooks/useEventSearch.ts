import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProspectEvent } from '@/types';
import { toast } from '@/hooks/use-toast';

export interface SearchResult {
  name: string;
  description: string;
  platform: 'sympla' | 'eventbrite';
  platform_id: string;
  platform_url: string;
  event_date: string | null;
  event_end_date: string | null;
  location_city: string;
  location_state: string;
  location_venue: string;
  is_online: boolean;
  estimated_audience: number | null;
  ticket_price_range: string;
  category: string;
  themes: string[];
  qualification_score: number;
  fingerprint: string;
  organizer_name: string | null;
  organizer_url: string | null;
}

interface SearchResponse {
  events: SearchResult[];
  total: number;
  platforms_searched: string[];
  keywords: string[];
}

export function useEventSearch() {
  const queryClient = useQueryClient();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const search = useMutation({
    mutationFn: async ({
      keywords,
      platforms,
      location,
    }: {
      keywords: string[];
      platforms?: string[];
      location?: string;
    }): Promise<SearchResponse> => {
      const { data, error } = await supabase.functions.invoke('search-events', {
        body: { keywords, platforms, location },
      });
      if (error) throw error;
      return data as SearchResponse;
    },
    onSuccess: (data) => {
      setResults(data.events);
      setSelectedIds(new Set());
      toast({
        title: `${data.total} eventos encontrados`,
        description: `Plataformas: ${data.platforms_searched.join(', ')}`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Erro na busca',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const toggleSelect = (fingerprint: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(fingerprint)) next.delete(fingerprint);
      else next.add(fingerprint);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(results.map((r) => r.fingerprint)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const importSelected = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const toImport = results.filter((r) => selectedIds.has(r.fingerprint));
      if (toImport.length === 0) throw new Error('Nenhum evento selecionado');

      const rows = toImport.map((ev) => ({
        user_id: user.id,
        name: ev.name,
        description: ev.description || null,
        platform: ev.platform,
        platform_id: ev.platform_id || null,
        platform_url: ev.platform_url || null,
        event_date: ev.event_date,
        event_end_date: ev.event_end_date,
        location_city: ev.location_city || null,
        location_state: ev.location_state || null,
        location_venue: ev.location_venue || null,
        is_online: ev.is_online,
        estimated_audience: ev.estimated_audience,
        ticket_price_range: ev.ticket_price_range || null,
        category: ev.category || null,
        themes: ev.themes,
        pipeline_status: 'discovered',
        qualification_score: ev.qualification_score,
        fingerprint: ev.fingerprint,
      }));

      const { data, error } = await (supabase as any)
        .from('events')
        .upsert(rows, { onConflict: 'fingerprint,user_id', ignoreDuplicates: true })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      const count = data?.length || 0;
      toast({ title: `${count} evento(s) importado(s) para o pipeline!` });
      // Remove imported from results
      setResults((prev) => prev.filter((r) => !selectedIds.has(r.fingerprint)));
      setSelectedIds(new Set());
    },
    onError: (err: Error) => {
      toast({
        title: 'Erro ao importar',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const clearResults = () => {
    setResults([]);
    setSelectedIds(new Set());
  };

  return {
    results,
    selectedIds,
    search,
    toggleSelect,
    selectAll,
    deselectAll,
    importSelected,
    clearResults,
    isSearching: search.isPending,
    isImporting: importSelected.isPending,
  };
}
