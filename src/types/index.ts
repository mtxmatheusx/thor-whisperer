export interface Lead {
  id: string;
  user_id: string;
  name: string;
  company: string;
  position: string;
  email?: string;
  linkedin?: string;
  phone?: string;
  status: LeadStatus;
  source: LeadSource;
  score: number;
  industry: string;
  company_size: string;
  location: string;
  last_contact?: string;
  next_follow_up?: string;
  notes: string;
  tags: string[];
  value: number;
  thor_analysis?: ThorAnalysis;
  created_at: string;
  updated_at: string;
}

export type LeadStatus = 'new' | 'contacted' | 'responded' | 'qualified' | 'meeting' | 'proposal' | 'closed' | 'lost';
export type LeadSource = 'linkedin' | 'instagram' | 'referral' | 'import';

export interface ThorAnalysis {
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  approach: string;
  painPoints: string[];
  opportunities: string[];
  personalizedMessage: string;
  recommendedTiming: string;
  companyInsights: {
    revenue?: string;
    employees?: number;
    recentNews?: string[];
    challenges?: string[];
  };
  decisionMakerInfo: {
    tenure?: string;
    background?: string;
    interests?: string[];
    connectionPoints?: string[];
  };
  speakingOpportunities: {
    events?: string[];
    topics?: string[];
    budget?: string;
    timing?: string;
  };
}

export interface Interaction {
  id: string;
  user_id: string;
  lead_id: string;
  type: InteractionType;
  platform: Platform;
  content?: string;
  metadata?: Record<string, unknown>;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
}

export type InteractionType = 'message_sent' | 'message_received' | 'connection_request' | 'connection_accepted' | 'meeting_scheduled' | 'proposal_sent' | 'call_completed' | 'note_added';
export type Platform = 'linkedin' | 'instagram' | 'email' | 'phone' | 'meeting';

export interface DashboardMetrics {
  totalLeads: number;
  activeLeads: number;
  responseRate: number;
  meetingsScheduled: number;
  proposalsSent: number;
  closedDeals: number;
  totalRevenue: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Novo',
  contacted: 'Contatado',
  responded: 'Respondeu',
  qualified: 'Qualificado',
  meeting: 'Reunião',
  proposal: 'Proposta',
  closed: 'Fechado',
  lost: 'Perdido',
};

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  responded: 'bg-green-100 text-green-800',
  qualified: 'bg-purple-100 text-purple-800',
  meeting: 'bg-indigo-100 text-indigo-800',
  proposal: 'bg-orange-100 text-orange-800',
  closed: 'bg-emerald-100 text-emerald-800',
  lost: 'bg-red-100 text-red-800',
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  referral: 'Indicação',
  import: 'Importação',
};

// === Phase 2: Campaigns ===

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

export interface CampaignStep {
  id: string;
  order: number;
  type: 'message' | 'wait' | 'condition';
  platform?: Platform;
  messageType?: 'initial_outreach' | 'follow_up' | 'meeting_request' | 'proposal';
  template?: string;
  waitDays?: number;
  condition?: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  steps: CampaignStep[];
  targetLeadIds: string[];
  stats: {
    sent: number;
    opened: number;
    replied: number;
    meetings: number;
  };
  created_at: string;
  updated_at: string;
}

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Rascunho',
  active: 'Ativa',
  paused: 'Pausada',
  completed: 'Concluída',
  archived: 'Arquivada',
};

export const CAMPAIGN_STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-emerald-100 text-emerald-800',
  paused: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800',
  archived: 'bg-red-100 text-red-800',
};
