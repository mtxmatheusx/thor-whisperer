import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface DeepScrapeContact {
  name: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  instagram: string | null;
  website: string | null;
  confidence: 'high' | 'medium' | 'low';
}

export function useDeepScrape() {
  const [scrapingUrls, setScrapingUrls] = useState<Set<string>>(new Set());

  const deepScrape = useMutation({
    mutationFn: async ({ url, eventName }: { url: string; eventName: string }): Promise<DeepScrapeContact[]> => {
      const { data, error } = await supabase.functions.invoke('deep-scrape-event', {
        body: { url, event_name: eventName },
      });
      if (error) throw error;
      return data.contacts || [];
    },
    onError: (err: Error) => {
      toast({
        title: 'Erro no scraping',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const scrapeEvent = async (url: string, eventName: string) => {
    setScrapingUrls(prev => new Set(prev).add(url));
    try {
      const contacts = await deepScrape.mutateAsync({ url, eventName });
      toast({
        title: `${contacts.length} contato(s) encontrado(s)`,
        description: contacts.length > 0
          ? `Contatos extraídos da página do evento`
          : 'Nenhum contato encontrado nesta página',
      });
      return contacts;
    } finally {
      setScrapingUrls(prev => {
        const next = new Set(prev);
        next.delete(url);
        return next;
      });
    }
  };

  return {
    scrapeEvent,
    isScrapingUrl: (url: string) => scrapingUrls.has(url),
  };
}
