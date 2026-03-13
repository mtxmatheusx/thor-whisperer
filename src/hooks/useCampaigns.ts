import { useState, useCallback } from 'react';
import { Campaign, CampaignStep, CampaignStatus } from '@/types';
import { toast } from '@/hooks/use-toast';

// Local state campaigns (can be connected to backend later)
const generateId = () => crypto.randomUUID();

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);

  const createCampaign = useCallback((name: string, description?: string) => {
    const campaign: Campaign = {
      id: generateId(),
      name,
      description,
      status: 'draft',
      steps: [],
      targetLeadIds: [],
      stats: { sent: 0, opened: 0, replied: 0, meetings: 0 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setCampaigns(prev => [campaign, ...prev]);
    toast({ title: 'Campanha criada!' });
    return campaign;
  }, []);

  const updateCampaign = useCallback((id: string, updates: Partial<Campaign>) => {
    setCampaigns(prev =>
      prev.map(c => c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c)
    );
  }, []);

  const deleteCampaign = useCallback((id: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
    toast({ title: 'Campanha removida!' });
  }, []);

  const addStep = useCallback((campaignId: string, step: Omit<CampaignStep, 'id' | 'order'>) => {
    setCampaigns(prev =>
      prev.map(c => {
        if (c.id !== campaignId) return c;
        const newStep: CampaignStep = {
          ...step,
          id: generateId(),
          order: c.steps.length + 1,
        };
        return { ...c, steps: [...c.steps, newStep], updated_at: new Date().toISOString() };
      })
    );
  }, []);

  const removeStep = useCallback((campaignId: string, stepId: string) => {
    setCampaigns(prev =>
      prev.map(c => {
        if (c.id !== campaignId) return c;
        const steps = c.steps.filter(s => s.id !== stepId).map((s, i) => ({ ...s, order: i + 1 }));
        return { ...c, steps, updated_at: new Date().toISOString() };
      })
    );
  }, []);

  const setStatus = useCallback((id: string, status: CampaignStatus) => {
    updateCampaign(id, { status });
    toast({ title: `Campanha ${status === 'active' ? 'ativada' : status === 'paused' ? 'pausada' : 'atualizada'}!` });
  }, [updateCampaign]);

  const assignLeads = useCallback((campaignId: string, leadIds: string[]) => {
    updateCampaign(campaignId, { targetLeadIds: leadIds });
    toast({ title: `${leadIds.length} leads atribuídos à campanha` });
  }, [updateCampaign]);

  return { campaigns, loading, createCampaign, updateCampaign, deleteCampaign, addStep, removeStep, setStatus, assignLeads };
}
