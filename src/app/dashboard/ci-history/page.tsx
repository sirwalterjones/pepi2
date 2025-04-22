import React from 'react';
import { createClient } from '@/../supabase/server';
import { redirect } from 'next/navigation';
import AgentCiHistory from '@/components/ci-payments/AgentCiHistory';

export default async function CiHistoryPage() {
  const supabase = await createClient();
  
  // Check authentication and get user
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return redirect('/sign-in');
  }

  // Get user's role
  const { data: agentData } = await supabase
    .from('agents')
    .select('role, id')
    .eq('user_id', user.id)
    .single();

  if (!agentData) {
    return redirect('/sign-in');
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">CI Payment History</h1>
      </div>
      <AgentCiHistory agentId={agentData.id} isAdmin={agentData.role === 'admin'} />
    </div>
  );
} 