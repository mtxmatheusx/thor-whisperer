import { useState, useCallback } from 'react';
import { ThorAnalysis, Lead } from '@/types';

const THOR_ENDPOINT = import.meta.env.VITE_THOR_AI_ENDPOINT || 'http://187.77.232.76:8000';

async function thorRequest<T>(endpoint: string, data: unknown): Promise<T> {
  const res = await fetch(`${THOR_ENDPOINT}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Thor AI Error: ${res.status}`);
  return res.json();
}

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
      return await thorRequest<ThorAnalysis>('/api/thor/analyze-prospect', prospect);
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
      return await thorRequest('/api/thor/generate-message', context);
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
      return await thorRequest<{
        overview: string;
        challenges: string[];
        opportunities: string[];
        recentNews: string[];
      }>('/api/thor/research-company', { company: companyName });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro na pesquisa';
      setError(msg);
      throw err;
    }
  }, []);

  return { analyzing, generating, error, analyzeProspect, generateMessage, researchCompany };
}
