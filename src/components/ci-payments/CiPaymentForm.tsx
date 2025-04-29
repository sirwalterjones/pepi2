"use client";

import React, { useState, useRef, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import {
  createCiPaymentAction,
  getAgentsForSelectAction,
  updateCiPaymentAction,
  CiPaymentFormData,
} from "@/app/actions"; // Add updateCiPaymentAction
import { Agent, CiPayment } from "@/types/schema"; // Add CiPayment import
import { useToast } from "@/components/ui/use-toast"; // Import useToast

// Zod schema mirroring the one in actions.ts, potentially reused or imported
const ciPaymentFormSchema = z.object({
  date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Date is required." }),
  paying_agent_id: z.string().uuid().optional(), // Handled based on role
  amount_paid: z.coerce
    .number()
    .positive({ message: "Amount must be positive" }),
  paid_to: z.string().trim().optional(), // Added Paid To field
  case_number: z.string().trim().optional(),
  paying_agent_printed_name: z
    .string()
    .min(1, { message: "Paying agent's printed name is required" }),
  witness_printed_name: z.string().trim().optional(),
  pepi_receipt_number: z.string().trim().optional(),
  // Signatures will be handled separately via refs
  // book_id is passed as prop
});

type CiPaymentFormProps = {
  userId: string;
  userRole: "admin" | "agent";
  activeBookId: string;
  initialData?: CiPayment | null; // Existing prop for editing
  onFormSubmitSuccess?: () => void; // Optional callback for closing modal/sheet
  agentData?: Agent | null; // Pass logged-in agent's data if available
};

export default function CiPaymentForm({
  userId,
  userRole,
  activeBookId,
  initialData, // Use this prop
  onFormSubmitSuccess,
  agentData,
}: CiPaymentFormProps) {
  const { toast } = useToast(); // Initialize useToast
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableAgents, setAvailableAgents] = useState<
    { user_id: string; name: string }[]
  >([]);
  const isEditing = !!initialData; // Determine if we are in edit mode

  // Signature Pad Refs
  const ciSigRef = useRef<SignatureCanvas>(null);
  const agentSigRef = useRef<SignatureCanvas>(null);
  const witnessSigRef = useRef<SignatureCanvas>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    reset,
    watch,
  } = useForm<z.infer<typeof ciPaymentFormSchema>>({
    resolver: zodResolver(ciPaymentFormSchema),
    // Set default values based on initialData if editing
    defaultValues: {
      date: initialData?.date ? initialData.date : undefined,
      amount_paid: initialData?.amount_paid || undefined,
      paid_to: initialData?.paid_to || "",
      case_number: initialData?.case_number || "",
      paying_agent_printed_name:
        initialData?.paying_agent_printed_name || agentData?.name || "",
      witness_printed_name: initialData?.witness_printed_name || "",
      pepi_receipt_number: initialData?.pepi_receipt_number || "",
      paying_agent_id: initialData?.paying_agent_id || undefined, // Pre-fill if editing
    },
  });

  // Effect to reset form when initialData changes (e.g., modal opens with new data)
  useEffect(() => {
    if (initialData) {
      reset({
        date: initialData.date ? initialData.date : undefined,
        amount_paid: initialData.amount_paid || undefined,
        paid_to: initialData.paid_to || "",
        case_number: initialData.case_number || "",
        paying_agent_printed_name:
          initialData.paying_agent_printed_name || agentData?.name || "",
        witness_printed_name: initialData.witness_printed_name || "",
        pepi_receipt_number: initialData.pepi_receipt_number || "",
        paying_agent_id: initialData.paying_agent_id || undefined,
      });
      // TODO: Pre-load signatures if possible/desired? This is tricky.
      ciSigRef.current?.clear(); // Clear pads when editing
      agentSigRef.current?.clear();
      witnessSigRef.current?.clear();
    } else {
      reset(); // Reset to defaults if creating new
    }
  }, [initialData, reset, agentData]);

  // Fetch agents if user is admin
  useEffect(() => {
    if (userRole === "admin") {
      const fetchAgents = async () => {
        const result = await getAgentsForSelectAction();
        if (result.success && result.data) {
          setAvailableAgents(result.data);
          // Optionally set default selected agent for admin? Or leave blank?
          // setValue('paying_agent_id', userId); // Example: default to self
        } else {
          setError("Failed to load agents list.");
        }
      };
      fetchAgents();
    } else {
      // If agent, pre-fill printed name if not already done by defaultValues
      if (!agentData?.name) {
        // Fetch agent name if needed (alternative to passing agentData prop)
        // This might be redundant if agentData is reliably passed
      } else if (agentData?.name) {
        setValue("paying_agent_printed_name", agentData.name);
      }
    }
  }, [userRole, userId, setValue, agentData]);

  const clearSignature = (ref: React.RefObject<SignatureCanvas>) => {
    ref.current?.clear();
  };

  const isSignatureEmpty = (ref: React.RefObject<SignatureCanvas>): boolean => {
    return ref.current?.isEmpty() ?? true;
  };

  const getSignatureData = (
    ref: React.RefObject<SignatureCanvas>,
  ): string | undefined => {
    try {
      // Check if ref and ref.current are valid
      if (!ref || !ref.current) {
        console.error("Signature ref is not available.");
        return undefined;
      }

      // Check isEmpty method exists and if the canvas is empty
      if (typeof ref.current.isEmpty !== "function" || ref.current.isEmpty()) {
        return undefined; // Empty signature is valid (returns undefined), no error needed
      }

      // Use getCanvas() instead of getTrimmedCanvas()
      if (typeof ref.current.getCanvas !== "function") {
        console.error("getCanvas method not found on signature ref", ref);
        toast({
          variant: "destructive",
          title: "Signature Component Error",
          description:
            "Internal error accessing signature canvas. Please try again.",
        });
        return undefined; // Indicate failure
      }

      const canvas = ref.current.getCanvas();

      // Verify it returned a canvas
      if (!(canvas instanceof HTMLCanvasElement)) {
        console.error(
          "getCanvas did not return a valid canvas element",
          canvas,
        );
        toast({
          variant: "destructive",
          title: "Signature Read Error",
          description:
            "Could not get signature canvas element. Please try again.",
        });
        return undefined; // Indicate failure
      }

      // Check if toDataURL exists
      if (typeof canvas.toDataURL !== "function") {
        console.error("toDataURL method not found on the canvas element");
        toast({
          variant: "destructive",
          title: "Signature Export Error",
          description: "Could not export signature data. Please try again.",
        });
        return undefined;
      }

      // Get the data URL directly from the canvas
      return canvas.toDataURL("image/png");
    } catch (error) {
      console.error("Error getting signature data:", error); // This should catch unexpected errors
      toast({
        variant: "destructive",
        title: "Signature Error",
        description:
          "Could not read signature data. Please try clearing and signing again.",
      });
      return undefined;
    }
  };

  const onSubmit = async (data: z.infer<typeof ciPaymentFormSchema>) => {
    setIsLoading(true);
    setError(null);

    // Signatures need to be re-captured for edits unless pre-loading is implemented
    let ciSignatureData = getSignatureData(ciSigRef);
    let agentSignatureData = getSignatureData(agentSigRef);
    let witnessSignatureData = getSignatureData(witnessSigRef);

    // Validation for required signatures (might differ for edit vs create?)
    // For edit, maybe allow submitting without changing optional signatures?
    // Keep basic required check for now.
    if (!agentSignatureData) {
      // If editing, use existing signature if not re-signed?
      if (isEditing && initialData?.paying_agent_signature) {
        agentSignatureData = initialData.paying_agent_signature;
      } else {
        setError("Paying Agent signature is required.");
        setIsLoading(false);
        return;
      }
    }
    if (!ciSignatureData) {
      if (isEditing && initialData?.ci_signature) {
        ciSignatureData = initialData.ci_signature;
      } else {
        setError("CI signature is required.");
        setIsLoading(false);
        return;
      }
    }
    // Handle optional witness signature
    if (!witnessSignatureData && isEditing && initialData?.witness_signature) {
      witnessSignatureData = initialData.witness_signature; // Use existing if not re-signed
    }

    const formData: Partial<CiPaymentFormData> = {
      ...data,
      date: data.date,
      paid_to: data.paid_to || undefined,
      paying_agent_id: undefined, // Remove initially
      book_id: activeBookId,
      // Pass the determined signatures
      ci_signature: ciSignatureData,
      paying_agent_signature: agentSignatureData,
      witness_signature: witnessSignatureData,
    };

    if (userRole === "admin") {
      formData.paying_agent_id = data.paying_agent_id || userId;
    }

    try {
      let result;
      if (isEditing && initialData) {
        // Call update action
        console.log("Calling update action with:", {
          paymentId: initialData.id,
          formData,
        });
        result = await updateCiPaymentAction(
          initialData.id,
          formData as CiPaymentFormData,
        );
      } else {
        // Call create action
        console.log("Calling create action with:", formData);
        result = await createCiPaymentAction(formData as CiPaymentFormData);
      }

      if (result.success) {
        toast({
          title: "Success",
          description: `CI Payment ${isEditing ? "updated" : "submitted"} successfully.`,
        });
        reset();
        ciSigRef.current?.clear();
        agentSigRef.current?.clear();
        witnessSigRef.current?.clear();
        onFormSubmitSuccess?.();
      } else {
        setError(result.error || "An unknown error occurred.");
        toast({
          variant: "destructive",
          title: "Submission Failed",
          description: result.error || "An unknown error occurred.",
        });
      }
    } catch (err: any) {
      console.error("Submission error:", err);
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
      toast({
        variant: "destructive",
        title: "Submission Error",
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Add a wrapper div for scrolling if needed, adjust max height as necessary
    <div className="max-h-[85vh] overflow-y-auto pr-2 custom-scrollbar">
      {/* Reverted to a simpler grid layout */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-4">
        {/* Top Row: Date and Admin Agent Select */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {/* Date Picker */}
          <div className="space-y-2">
            <Label htmlFor="date">
              Date <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={field.value ? parseISO(field.value) : undefined}
                      onSelect={(date) =>
                        field.onChange(date ? date.toISOString() : "")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date.message}</p>
            )}
          </div>

          {/* Paying Agent Select (Admin Only) */}
          {userRole === "admin" && (
            <div className="space-y-2">
              <Label htmlFor="paying_agent_id">Paying Agent (Admin)</Label>
              <Controller
                name="paying_agent_id"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Find the selected agent's name and update the printed name field
                      const selectedAgent = availableAgents.find(
                        (agent) => agent.user_id === value,
                      );
                      setValue(
                        "paying_agent_printed_name",
                        selectedAgent ? selectedAgent.name : "",
                      );
                    }}
                    value={field.value || ""}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select paying agent..." />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Option for admin to select themselves */}
                      {agentData && (
                        <SelectItem value={userId}>
                          {agentData.name} (Myself)
                        </SelectItem>
                      )}
                      {/* List other agents */}
                      {availableAgents
                        .filter((agent) => agent.user_id !== userId)
                        .map((agent) => (
                          <SelectItem key={agent.user_id} value={agent.user_id}>
                            {agent.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {/* No direct error message here as it's optional/handled by admin */}
            </div>
          )}
        </div>

        {/* Main Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Amount Paid */}
          <div className="space-y-2">
            <Label htmlFor="amount_paid">
              Amount Paid <span className="text-red-500">*</span>
            </Label>
            <Input
              id="amount_paid"
              type="number"
              step="0.01"
              {...register("amount_paid")}
              placeholder="e.g., 100.00"
            />
            {errors.amount_paid && (
              <p className="text-sm text-destructive">
                {errors.amount_paid.message}
              </p>
            )}
          </div>

          {/* Paid To */}
          <div className="space-y-2">
            <Label htmlFor="paid_to">Paid To</Label>
            <Input
              id="paid_to"
              {...register("paid_to")}
              placeholder="Name of person/entity paid"
            />
            {/* No error shown for optional field unless specific validation added */}
          </div>

          {/* Case Number */}
          <div className="space-y-2">
            <Label htmlFor="case_number">Case #</Label>
            <Input
              id="case_number"
              {...register("case_number")}
              placeholder="Enter case number"
            />
            {errors.case_number && (
              <p className="text-sm text-destructive">
                {errors.case_number.message}
              </p>
            )}
          </div>

          {/* PEPI Rec # */}
          <div className="space-y-2">
            <Label htmlFor="pepi_receipt_number">PEPI Rec #</Label>
            <Input
              id="pepi_receipt_number"
              {...register("pepi_receipt_number")}
              placeholder="Associated PEPI receipt number"
            />
            {errors.pepi_receipt_number && (
              <p className="text-sm text-destructive">
                {errors.pepi_receipt_number.message}
              </p>
            )}
          </div>

          {/* Paying Agent Printed Name */}
          <div className="space-y-2">
            <Label htmlFor="paying_agent_printed_name">
              Paying Agent Printed Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="paying_agent_printed_name"
              {...register("paying_agent_printed_name")}
              readOnly={userRole !== "admin"} // Agent name read-only unless admin changes selection
              placeholder={userRole === "admin" ? "Select agent above" : ""}
            />
            {errors.paying_agent_printed_name && (
              <p className="text-sm text-destructive">
                {errors.paying_agent_printed_name?.message}
              </p>
            )}
          </div>

          {/* Witness Printed Name */}
          <div className="space-y-2">
            <Label htmlFor="witness_printed_name">Witness Printed Name</Label>
            <Input
              id="witness_printed_name"
              {...register("witness_printed_name")}
            />
            {errors.witness_printed_name && (
              <p className="text-sm text-destructive">
                {errors.witness_printed_name?.message}
              </p>
            )}
          </div>
        </div>

        {/* Signatures Section */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-medium mb-2">Signatures</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* CI Signature */}
            <div className="space-y-2">
              <Label htmlFor="ci_signature" className="block text-center">
                CI Signature <span className="text-red-500">*</span>
              </Label>
              <div className="border rounded-md bg-slate-50">
                <SignatureCanvas
                  ref={ciSigRef}
                  canvasProps={{ id: "ci_signature", className: "w-full h-32" }}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => clearSignature(ciSigRef)}
                className="w-full"
              >
                Clear CI Sig
              </Button>
            </div>

            {/* Paying Agent Signature */}
            <div className="space-y-2">
              <Label htmlFor="agent_signature" className="block text-center">
                Paying Agent Signature <span className="text-red-500">*</span>
              </Label>
              <div className="border rounded-md bg-slate-50">
                <SignatureCanvas
                  ref={agentSigRef}
                  canvasProps={{
                    id: "agent_signature",
                    className: "w-full h-32",
                  }}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => clearSignature(agentSigRef)}
                className="w-full"
              >
                Clear Agent Sig
              </Button>
            </div>

            {/* Witness Signature */}
            <div className="space-y-2">
              <Label htmlFor="witness_signature" className="block text-center">
                Witness Signature
              </Label>
              <div className="border rounded-md bg-slate-50">
                <SignatureCanvas
                  ref={witnessSigRef}
                  canvasProps={{
                    id: "witness_signature",
                    className: "w-full h-32",
                  }}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => clearSignature(witnessSigRef)}
                className="w-full"
              >
                Clear Witness Sig
              </Button>
            </div>
          </div>
          {/* Combined Error Check for Signatures */}
          {error &&
            (error.includes("signature is required") ||
              error.includes("Failed to read required signature data")) && (
              <p className="text-sm text-destructive text-center pt-2">
                {error}
              </p>
            )}
        </div>

        {/* General Error Message */}
        {error &&
          !(
            error.includes("signature is required") ||
            error.includes("Failed to read required signature data")
          ) && <p className="text-sm text-destructive pt-2">Error: {error}</p>}

        {/* Document Upload */}
        <div className="space-y-2 pt-4 border-t">
          <Label htmlFor="document">Supporting Document (Optional)</Label>
          <Input
            id="document"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setValue("document", e.target.files[0]);
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            Upload supporting documentation (PDF, JPG, PNG)
          </p>
          {initialData?.document_url && (
            <div className="mt-2">
              <p className="text-sm">Current document: </p>
              <a
                href={initialData.document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                <Upload className="h-4 w-4" /> View Document
              </a>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading
              ? "Submitting..."
              : isEditing
                ? "Update CI Payment"
                : "Submit CI Payment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
