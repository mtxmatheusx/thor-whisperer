import { useState, useCallback } from 'react';
import { ThorAnalysis, Lead } from '@/types';
import { supabase } from '@/integrations/supabase/client';

export function useThorAI() {
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeProspect = useCallback(async (prospect: {
    name: string;
    company: string;
    position: string;
    linkedin?: string;
    industry?: string;
  }): Promise<ThorAnalysis> => {
    setAnalyzing(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('thor-ai', {
        body: { action: 'analyze-prospect', data: prospect },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      return data as ThorAnalysis;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro na análise';
      setError(msg);
      throw err;
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const generateMessage = useCallback(async (context: {
    lead: Partial<Lead>;
    analysis?: ThorAnalysis;
    messageType: 'initial_outreach' | 'follow_up' | 'meeting_request' | 'proposal';
    customInstructions?: string;
  }): Promise<{ message: string; confidence: number }> => {
    setGenerating(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('thor-ai', {
        body: { action: 'generate-message', data: context },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      return data as { message: string; confidence: number };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao gerar mensagem';
      setError(msg);
      throw err;
    } finally {
      setGenerating(false);
    }
  }, []);

  const researchCompany = useCallback(async (companyName: string) => {
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('thor-ai', {
        body: { action: 'analyze-prospect', data: { name: '', company: companyName, position: '' } },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      return {
        overview: data.approach || '',
        challenges: data.companyInsights?.challenges || [],
        opportunities: data.opportunities || [],
        recentNews: data.companyInsights?.recentNews || [],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro na pesquisa';
      setError(msg);
      throw err;
    }
  }, []);

  const extractProspects = useCallback(async (filters: {
    query?: string;
    industry?: string;
    position?: string;
    company?: string;
    location?: string;
    company_size?: string;
    event_type?: string;
  }) => {
    setAnalyzing(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('thor-ai', {
        body: { action: 'extract-prospects', data: filters },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      return data as {
        prospects: Array<{
          name: string;
          position: string;
          company: string;
          industry: string;
          company_size: string;
          location: string;
          email_guess: string | null;
          linkedin_guess: string | null;
          phone_guess: string | null;
          score: number;
          reasoning: string;
          suggested_approach: string;
          pain_points: string[];
          events_potential: string[];
        }>;
        search_summary: string;
        total_found: number;
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro na extração';
      setError(msg);
      throw err;
    } finally {
      setAnalyzing(false);
    }
  }, []);

  return { analyzing, generating, error, analyzeProspect, generateMessage, researchCompany, extractProspects };
}
