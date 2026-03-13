import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LEAD_STATUS_LABELS, LeadStatus } from '@/types';
import { toast } from '@/hooks/use-toast';

export function useLeadNotifications() {
  const prevStatuses = useRef<Record<string, string>>({});

  useEffect(() => {
    const channel = supabase
      .channel('lead-status-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'leads' },
        (payload) => {
          const oldStatus = prevStatuses.current[payload.new.id as string];
          const newStatus = payload.new.status as LeadStatus;
          const name = payload.new.name as string;

          if (oldStatus && oldStatus !== newStatus) {
            const fromLabel = LEAD_STATUS_LABELS[oldStatus as LeadStatus] || oldStatus;
            const toLabel = LEAD_STATUS_LABELS[newStatus] || newStatus;
            toast({
              title: `🔔 ${name}`,
              description: `Status: ${fromLabel} → ${toLabel}`,
            });
          }
          prevStatuses.current[payload.new.id as string] = newStatus;
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads' },
        (payload) => {
          prevStatuses.current[payload.new.id as string] = payload.new.status as string;
        }
      )
      .subscribe();

    // Initialize cache
    supabase.from('leads').select('id, status').then(({ data }) => {
      data?.forEach((l) => {
        prevStatuses.current[l.id] = l.status;
      });
    });

    return () => { supabase.removeChannel(channel); };
  }, []);
}
