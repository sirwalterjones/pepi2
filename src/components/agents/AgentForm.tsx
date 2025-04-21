"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { createClient } from "../../../supabase/client";
import { Agent } from "@/types/schema";
import { Button } from "../ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { useToast } from "../ui/use-toast";

interface AgentFormProps {
  agent?: Agent;
  onSuccessUrl?: string;
  onCancelUrl?: string;
}

type FormValues = {
  name: string;
  badge_number: string;
  email: string;
  phone: string;
  role: "admin" | "agent";
  is_active: boolean;
  password?: string;
};

export default function AgentForm({
  agent,
  onSuccessUrl,
  onCancelUrl,
}: AgentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();
  const isEditing = !!agent;

  const defaultValues: FormValues = {
    name: agent?.name || "",
    badge_number: agent?.badge_number || "",
    email: agent?.email || "",
    phone: agent?.phone || "",
    role: agent?.role || "agent",
    is_active: agent?.is_active ?? true,
    password: "",
  };

  const form = useForm<FormValues>({
    defaultValues,
    mode: "onChange",
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      if (isEditing && agent) {
        // Update existing agent
        const { error } = await supabase
          .from("agents")
          .update({
            name: data.name,
            badge_number: data.badge_number || null,
            email: data.email || null,
            phone: data.phone || null,
            role: data.role,
            is_active: data.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", agent.id);

        if (error) throw error;

        // Update password if provided
        if (data.password && data.password.trim() !== "") {
          // Get the user_id from the agent record
          if (agent.user_id) {
            // Use regular auth API instead of admin API
            const { error: passwordError } = await supabase.auth.updateUser({
              password: data.password,
            });

            if (passwordError) {
              console.error("Error updating password:", passwordError);
              toast({
                title: "Password Update Error",
                description:
                  "Agent information was updated, but there was an error updating the password.",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Agent updated",
                description: `${data.name}'s information and password have been updated successfully.`,
              });
            }
          } else if (data.email) {
            // If no user_id but email exists, try to create a user account for this agent
            try {
              const { data: authData, error: authError } =
                await supabase.auth.signUp({
                  email: data.email,
                  password: data.password,
                  options: {
                    data: {
                      full_name: data.name,
                      role: data.role,
                    },
                    // No need for email redirect since verification is disabled
                  },
                });

              if (authError) throw authError;
              if (!authData.user)
                throw new Error("Failed to create user account");

              // Update the agent record with the new user_id
              const { error: updateError } = await supabase
                .from("agents")
                .update({
                  user_id: authData.user.id,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", agent.id);

              if (updateError) throw updateError;

              toast({
                title: "Agent updated",
                description: `${data.name}'s information was updated and a new user account was created.`,
              });
            } catch (error: any) {
              console.error("Error creating user account:", error);
              toast({
                title: "User Account Error",
                description: `Agent information was updated, but there was an error creating a user account: ${error.message}`,
                variant: "destructive",
              });
            }
          } else {
            toast({
              title: "Agent updated",
              description: `${data.name}'s information was updated, but password could not be changed (no user account found and no email provided).`,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Agent updated",
            description: `${data.name}'s information has been updated successfully.`,
          });
        }
      } else {
        // Create new agent with user account
        if (!data.email || !data.password) {
          throw new Error("Email and password are required for new agents");
        }

        // Email verification is turned off in Supabase, so no need for a warning

        // Create the user with regular auth API instead of admin API
        // With email verification turned off, we can use signUp directly
        const { data: authData, error: authError } = await supabase.auth.signUp(
          {
            email: data.email,
            password: data.password,
            options: {
              data: {
                full_name: data.name,
                role: data.role,
              },
              // No need for email redirect since verification is disabled
            },
          },
        );

        if (authError) throw authError;
        if (!authData.user) throw new Error("Failed to create user account");

        // Then create the agent record
        const { error } = await supabase.from("agents").insert({
          name: data.name,
          badge_number: data.badge_number || null,
          email: data.email,
          phone: data.phone || null,
          role: data.role,
          is_active: data.is_active,
          user_id: authData.user.id,
        });

        if (error) throw error;

        toast({
          title: "Agent added",
          description: `${data.name} has been added successfully.`,
        });
      }

      // Reset form and navigate to success URL if provided
      form.reset(defaultValues);
      if (onSuccessUrl) window.location.href = onSuccessUrl;
    } catch (error: any) {
      console.error("Error saving agent:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save agent information.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          rules={{ required: "Name is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="badge_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Badge Number</FormLabel>
              <FormControl>
                <Input placeholder="e.g. B12345" {...field} />
              </FormControl>
              <FormDescription>
                The agent's official badge or ID number.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="email"
            rules={{
              required: !isEditing ? "Email is required for new agents" : false,
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Invalid email address",
              },
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="john.doe@example.com"
                    {...field}
                    disabled={isEditing && !!agent?.user_id}
                  />
                </FormControl>
                {!isEditing ? (
                  <FormDescription>
                    Required for system access. Cannot be changed later.
                  </FormDescription>
                ) : !agent?.user_id ? (
                  <FormDescription>
                    Add an email to create a user account for this agent.
                  </FormDescription>
                ) : (
                  <FormDescription>
                    Email cannot be changed for existing user accounts.
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="(555) 123-4567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="password"
          rules={{
            required: !isEditing
              ? "Password is required for new agents"
              : false,
            minLength: {
              value: 8,
              message: "Password must be at least 8 characters",
            },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{isEditing ? "New Password" : "Password"}</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder={
                    isEditing
                      ? "Leave blank to keep current password"
                      : "Set a secure password"
                  }
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {isEditing
                  ? "Only enter a value if you want to change the agent's password."
                  : "Set an initial password for this agent to access the system."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Administrators have full access to the system.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Active Status</FormLabel>
                <FormDescription>
                  Inactive agents won't appear in selection dropdowns.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4 pt-4">
          {onCancelUrl && (
            <Button
              type="button"
              variant="outline"
              onClick={() => (window.location.href = onCancelUrl)}
              disabled={isSubmitting}
              className="flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2 h-4 w-4"
              >
                <path d="M18 6 6 18"></path>
                <path d="m6 6 12 12"></path>
              </svg>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center"
          >
            {isSubmitting ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2 h-4 w-4 animate-spin"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                </svg>
                {isEditing ? "Updating..." : "Saving..."}
              </>
            ) : (
              <>
                {isEditing ? (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-2 h-4 w-4"
                    >
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                      <polyline points="17 21 17 13 7 13 7 21"></polyline>
                      <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                    Update Agent
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-2 h-4 w-4"
                    >
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                      <polyline points="17 21 17 13 7 13 7 21"></polyline>
                      <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                    Add Agent
                  </>
                )}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
