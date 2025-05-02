"use client";

import React, { useState } from "react";
import { Agent } from "@/types/schema";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { updateUserProfileAction } from "@/app/actions"; // Assume this action exists
import { Loader2 } from "lucide-react";

// Define the schema for the profile form
const profileSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address").optional(), // Email might not be directly editable
  badge_number: z.string().min(1, "Badge number is required"),
  // Add password fields if password change is allowed
  // currentPassword: z.string().optional(),
  // newPassword: z.string().optional(),
  // confirmNewPassword: z.string().optional(),
});
//   .refine(data => {
//     // If new password is provided, current password and confirmation must also be provided
//     if (data.newPassword) {
//       return !!data.currentPassword && !!data.confirmNewPassword;
//     }
//     return true;
//   }, { message: "Current password and confirmation are required to set a new password", path: ['currentPassword'] })
//   .refine(data => data.newPassword === data.confirmNewPassword, {
//     message: "New passwords do not match",
//     path: ["confirmNewPassword"],
//   });

type ProfileFormData = z.infer<typeof profileSchema>;

type ProfileFormProps = {
  agent: Agent;
};

export default function ProfileForm({ agent }: ProfileFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: agent.name || "",
      email: agent.email || "", // Usually comes from auth user, might be display-only
      badge_number: agent.badge_number || "",
    },
  });

  const onSubmit: SubmitHandler<ProfileFormData> = async (data) => {
    setIsSubmitting(true);
    try {
      const result = await updateUserProfileAction({
        agentId: agent.id,
        name: data.name,
        badge_number: data.badge_number,
        // Pass password fields if implementing password change
        // currentPassword: data.currentPassword,
        // newPassword: data.newPassword,
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Profile updated successfully.",
        });
        // Optionally refresh data or redirect if needed
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to update profile.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto px-2 sm:px-0">
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle>Update Your Information</CardTitle>
          <CardDescription>
            Keep your profile details up to date.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={agent.email || ""}
              readOnly
              disabled
              className="bg-muted/50"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed here.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="badge_number">Badge Number</Label>
            <Input id="badge_number" {...register("badge_number")} />
            {errors.badge_number && (
              <p className="text-sm text-destructive">
                {errors.badge_number.message}
              </p>
            )}
          </div>

          {/* Optional: Password Change Section */}
          {/* 
                    <div className="border-t pt-4 space-y-4">
                        <h3 className="text-lg font-medium">Change Password</h3>
                        <div className="space-y-2">
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <Input id="currentPassword" type="password" {...register("currentPassword")} />
                            {errors.currentPassword && <p className="text-sm text-destructive">{errors.currentPassword.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input id="newPassword" type="password" {...register("newPassword")} />
                            {errors.newPassword && <p className="text-sm text-destructive">{errors.newPassword.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                            <Input id="confirmNewPassword" type="password" {...register("confirmNewPassword")} />
                            {errors.confirmNewPassword && <p className="text-sm text-destructive">{errors.confirmNewPassword.message}</p>}
                        </div>
                    </div>
                    */}
        </CardContent>
        <CardFooter className="px-4 sm:px-6 sticky bottom-0 bg-card border-t">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
