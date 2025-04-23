import React from 'react';
import { createClient } from '@/../supabase/server';
import { redirect } from 'next/navigation';
import ProfileForm from '@/components/profile/ProfileForm';
import { Agent } from '@/types/schema';

export default async function ProfilePage() {
  const supabase = await createClient();

  // Check authentication and get user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return redirect('/sign-in');
  }

  // Get the user's agent data
  const { data: agentData, error: agentError } = await supabase
    .from('agents')
    .select('*') // Select all agent fields
    .eq('user_id', user.id)
    .single();

  // Even if authenticated, if there's no corresponding agent record, redirect
  // Or show an error. Redirecting to sign-in might be confusing, maybe dashboard?
  // Let's redirect to sign-in for now, assuming agent record is mandatory.
  if (agentError || !agentData) {
     console.error("Profile Page: Failed to fetch agent data for user " + user.id, agentError);
    return redirect('/sign-in'); // Or handle this error more gracefully
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-2xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Profile Settings</h1>
      </div>
      {/* Pass the fetched agent data to the form */}
      <ProfileForm agent={agentData as Agent} />
    </div>
  );
} 