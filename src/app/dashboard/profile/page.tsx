import React, { useState } from 'react';
// April 23, 2025 - Testing deployment flow from Cursor to Vercel
import { createClient } from '@/../supabase/client';
import { redirect } from 'next/navigation';
import ProfileForm from '@/components/profile/ProfileForm';
import { Agent } from '@/types/schema';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { resetActivePepiBookAction } from '@/app/actions';
import { useRouter } from 'next/navigation';

'use client';

export default function ProfilePage() {
  console.log("[Profile Page] Component Rendered");
  const supabase = createClient();
  const router = useRouter();

  const [agentData, setAgentData] = React.useState<Agent | null>(null);
  const [isLoadingAgent, setIsLoadingAgent] = React.useState(true);

  const [isResetAlertOpen, setIsResetAlertOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const CONFIRMATION_PHRASE = "Delete Transactions";

  React.useEffect(() => {
    const fetchAgent = async () => {
      try {
        setIsLoadingAgent(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/sign-in');
          return;
        }
        console.log("[Profile Page] Fetched User ID:", user.id);

        const { data, error } = await supabase
          .from('agents')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error || !data) {
          console.error("Profile Page: Failed to fetch agent data for user " + user.id, error);
          toast({
              title: "Error",
              description: "Could not load your profile data. Please try again.",
              variant: "destructive",
          });
        } else {
          console.log("[Profile Page] Fetched Agent Data:", data);
          setAgentData(data as Agent);
        }
        setIsLoadingAgent(false);
      } catch (error) {
         console.error("[Profile Page] Error fetching agent data:", error);
         toast({
             title: "Error Loading Profile",
             description: "Could not load your profile data. Please check the console or contact support.",
             variant: "destructive",
         });
         setIsLoadingAgent(false);
      }
    };

    fetchAgent();
  }, [supabase, router]);

  const handleResetConfirm = async () => {
    if (confirmationText !== CONFIRMATION_PHRASE) {
      toast({
        title: "Incorrect Confirmation",
        description: `Please type "${CONFIRMATION_PHRASE}" to confirm.`,
        variant: "default",
      });
      return;
    }

    setIsResetting(true);
    const result = await resetActivePepiBookAction();

    if (result.success) {
      toast({
        title: "Success",
        description: "Active PEPI Book reset successfully.",
      });
      setIsResetAlertOpen(false);
      setConfirmationText('');
      router.refresh();
    } else {
      toast({
        title: "Error Resetting Book",
        description: result.error || "An unknown error occurred.",
        variant: "destructive",
      });
    }
    setIsResetting(false);
  };

  if (isLoadingAgent) {
      return <div className="container mx-auto py-6 text-center">Loading profile...</div>;
  }

  if (!agentData) {
      return <div className="container mx-auto py-6 text-center text-red-500">Failed to load profile data. Please contact support.</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-2xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Profile Settings</h1>
      </div>
      <ProfileForm agent={agentData} />

      {agentData.role === 'admin' && (
        <div className="mt-8 pt-6 border-t border-destructive/20">
           <h2 className="text-lg font-semibold text-destructive mb-2">Admin Actions</h2>
           <p className="text-sm text-muted-foreground mb-4">
             Danger zone: These actions are irreversible. Proceed with caution.
           </p>

          <AlertDialog open={isResetAlertOpen} onOpenChange={setIsResetAlertOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isResetting}>
                {isResetting ? "Resetting..." : "Reset Active PEPI Book"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all
                  transactions, CI payments, and fund requests associated with the
                  <span className="font-semibold"> currently active PEPI book</span>.
                  To confirm, please type{" "}
                  <strong className="text-foreground">{CONFIRMATION_PHRASE}</strong>{" "}
                  in the box below.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4">
                <Input
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder={CONFIRMATION_PHRASE}
                  disabled={isResetting}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleResetConfirm}
                  disabled={confirmationText !== CONFIRMATION_PHRASE || isResetting}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  {isResetting ? "Processing..." : "Confirm Reset"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
           <p className="text-xs text-muted-foreground mt-2">
             This will clear the transaction history for the currently active book only.
           </p>
        </div>
      )}
    </div>
  );
} 