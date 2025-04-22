"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { createCiPaymentAction, getAgentsForSelectAction, CiPaymentFormData } from '@/app/actions'; // Assuming path
import { Agent } from '@/types/schema'; // Assuming path
import { useToast } from '@/components/ui/use-toast'; // Import useToast

// Zod schema mirroring the one in actions.ts, potentially reused or imported
const ciPaymentFormSchema = z.object({
    date: z.date({ required_error: "Date is required." }),
    paying_agent_id: z.string().uuid().optional(), // Handled based on role
    amount_paid: z.coerce.number().positive({ message: "Amount must be positive" }),
    case_number: z.string().trim().optional(),
    paying_agent_printed_name: z.string().min(1, { message: "Paying agent's printed name is required" }),
    witness_printed_name: z.string().trim().optional(),
    pepi_receipt_number: z.string().trim().optional(),
    // Signatures will be handled separately via refs
    // book_id is passed as prop
});

type CiPaymentFormProps = {
    userId: string;
    userRole: 'admin' | 'agent';
    activeBookId: string;
    onFormSubmitSuccess?: () => void; // Optional callback for closing modal/sheet
    agentData?: Agent | null; // Pass logged-in agent's data if available
};

export default function CiPaymentForm({
    userId,
    userRole,
    activeBookId,
    onFormSubmitSuccess,
    agentData
}: CiPaymentFormProps) {
    const { toast } = useToast(); // Initialize useToast
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [availableAgents, setAvailableAgents] = useState<{ user_id: string; name: string }[]>([]);

    // Signature Pad Refs
    const ciSigRef = useRef<SignatureCanvas>(null);
    const agentSigRef = useRef<SignatureCanvas>(null);
    const witnessSigRef = useRef<SignatureCanvas>(null);

    const { register, handleSubmit, control, formState: { errors }, setValue, reset } = useForm<z.infer<typeof ciPaymentFormSchema>>({
        resolver: zodResolver(ciPaymentFormSchema),
        defaultValues: {
            paying_agent_printed_name: agentData?.name || '', // Pre-fill if agent data is available
            case_number: '',
            witness_printed_name: '',
            pepi_receipt_number: '',
        },
    });

    // Fetch agents if user is admin
    useEffect(() => {
        if (userRole === 'admin') {
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
                 setValue('paying_agent_printed_name', agentData.name);
            }
        }
    }, [userRole, userId, setValue, agentData]);

    const clearSignature = (ref: React.RefObject<SignatureCanvas>) => {
        ref.current?.clear();
    };

    const isSignatureEmpty = (ref: React.RefObject<SignatureCanvas>): boolean => {
         return ref.current?.isEmpty() ?? true;
    }

    const getSignatureData = (ref: React.RefObject<SignatureCanvas>): string | undefined => {
        try {
            // Add more checks: ensure ref.current exists and expected methods are functions
            if (!ref.current || typeof ref.current.isEmpty !== 'function' || ref.current.isEmpty()) {
                return undefined;
            }
            if (typeof ref.current.getTrimmedCanvas !== 'function') {
                 console.error("getTrimmedCanvas method not found on signature ref", ref);
                 toast({
                     variant: "destructive",
                     title: "Signature Component Error",
                     description: "Internal error reading signature. Please try again.",
                 });
                 return undefined; // Indicate failure
            }

            const canvas = ref.current.getTrimmedCanvas();
            
            // Verify it returned a canvas
            if (!(canvas instanceof HTMLCanvasElement)) {
                 console.error("getTrimmedCanvas did not return a valid canvas", canvas);
                 toast({
                     variant: "destructive",
                     title: "Signature Read Error",
                     description: "Could not get signature image data. Please try again.",
                 });
                 return undefined; // Indicate failure
            }
            
            return canvas.toDataURL('image/png');

        } catch (error) {
            console.error("Error getting signature data:", error);
            toast({ 
                 variant: "destructive",
                 title: "Signature Error",
                 description: "Could not read signature data. Please try clearing and signing again.",
             });
            // Re-throwing might be too disruptive, return undefined to indicate failure
            // throw error; 
            return undefined;
        }
    };

    const onSubmit = async (data: z.infer<typeof ciPaymentFormSchema>) => {
        setIsLoading(true);
        setError(null);

        let ciSignatureData: string | undefined;
        let agentSignatureData: string | undefined;
        let witnessSignatureData: string | undefined;

        // Wrap signature retrieval in try...catch
        try {
            ciSignatureData = getSignatureData(ciSigRef);
            agentSignatureData = getSignatureData(agentSigRef);
            witnessSignatureData = getSignatureData(witnessSigRef);
            
            // Add check here: If any required signature failed to read (returned undefined), stop.
            if (agentSignatureData === undefined || ciSignatureData === undefined) {
                // Specific error toasts are shown within getSignatureData
                setError("Failed to read required signature data. Please clear and sign again.");
                setIsLoading(false);
                return;
            }

        } catch (sigError) { 
             // This catch might not be needed if getSignatureData handles errors and returns undefined
             console.error("Unexpected error during signature processing:", sigError);
             setError("An unexpected error occurred while processing signatures."); 
             setIsLoading(false);
             return; 
        }

        // Basic signature validation (required signatures)
        if (!agentSignatureData) { // Check if data is present (might be redundant after above check)
             setError("Paying Agent signature is required.");
             setIsLoading(false);
             return;
        }
         if (!ciSignatureData) { // Check if data is present
             setError("CI signature is required.");
             setIsLoading(false);
             return;
        }
        // Witness signature might be optional based on requirements


        const formData: CiPaymentFormData = {
            ...data,
            date: format(data.date, 'yyyy-MM-dd'), // Format date for DB
            paying_agent_id: userRole === 'admin' ? data.paying_agent_id || userId : userId, // Set agent ID based on role/selection
            book_id: activeBookId,
            ci_signature: ciSignatureData,
            paying_agent_signature: agentSignatureData,
            witness_signature: witnessSignatureData,
        };

        try {
            const result = await createCiPaymentAction(formData);
            if (result.success) {
                toast({
                    title: "Success",
                    description: "CI Payment submitted successfully.",
                });
                reset(); // Reset form fields
                ciSigRef.current?.clear();
                agentSigRef.current?.clear();
                witnessSigRef.current?.clear();
                onFormSubmitSuccess?.(); // Call callback if provided
            } else {
                setError(result.error || 'An unknown error occurred.');
                toast({
                    variant: "destructive",
                    title: "Submission Failed",
                    description: result.error || 'An unknown error occurred.',
                });
            }
        } catch (err) {
            console.error("Submission error:", err);
            const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
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

    const signaturePadOptions = {
         penColor: 'black',
         backgroundColor: 'rgb(248 250 252)', // slate-50 or similar
         minWidth: 1,
         maxWidth: 2,
    };

    return (
        // Add a wrapper div for scrolling
        <div className="max-h-[80vh] overflow-y-auto pr-2"> 
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-1 border rounded-md shadow-sm">
                <h2 className="text-xl font-semibold mb-4">CI Payment Form</h2>

                {/* Row 1: Date, Paying Agent (Admin only) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {/* Date Picker */}
                     <div className="space-y-2">
                         <Label htmlFor="date">Date</Label>
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
                                                 !field.value && "text-muted-foreground"
                                             )}
                                         >
                                             <CalendarIcon className="mr-2 h-4 w-4" />
                                             {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                         </Button>
                                     </PopoverTrigger>
                                     <PopoverContent className="w-auto p-0">
                                         <Calendar
                                             mode="single"
                                             selected={field.value}
                                             onSelect={field.onChange}
                                             initialFocus
                                         />
                                     </PopoverContent>
                                 </Popover>
                             )}
                         />
                         {errors.date && <p className="text-sm text-red-600">{errors.date.message}</p>}
                     </div>

                     {/* Paying Agent Select (Admin Only) */}
                     {userRole === 'admin' && (
                         <div className="space-y-2">
                             <Label htmlFor="paying_agent_id">Paying Agent (Admin)</Label>
                             <Controller
                                 name="paying_agent_id"
                                 control={control}
                                 render={({ field }) => (
                                     <Select 
                                        onValueChange={field.onChange} 
                                        value={field.value || ""}
                                    > 
                                         <SelectTrigger>
                                             <SelectValue placeholder="Select paying agent..." />
                                         </SelectTrigger>
                                         <SelectContent>
                                             <SelectItem value={userId}>Myself ({agentData?.name || 'Admin'})</SelectItem>
                                             {availableAgents.map((agent) => (
                                                 <SelectItem key={agent.user_id} value={agent.user_id}>
                                                     {agent.name}
                                                 </SelectItem>
                                             ))}
                                         </SelectContent>
                                     </Select>
                                 )}
                             />
                             {/* No direct error message here as it's optional for admin selection */}
                         </div>
                     )}
                </div>


                {/* Row 2: Amount, Case # */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount_paid">Amount Paid</Label>
                        <Input id="amount_paid" type="number" step="0.01" {...register('amount_paid')} />
                        {errors.amount_paid && <p className="text-sm text-red-600">{errors.amount_paid.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="case_number">Case # (Optional)</Label>
                        <Input id="case_number" {...register('case_number')} />
                        {errors.case_number && <p className="text-sm text-red-600">{errors.case_number.message}</p>}
                    </div>
                </div>

                {/* Row 3: Printed Names */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                         <Label htmlFor="paying_agent_printed_name">Paying Agent's Printed Name</Label>
                         <Input
                             id="paying_agent_printed_name"
                             {...register('paying_agent_printed_name')}
                             readOnly={userRole !== 'admin'} // Agent name should be read-only
                         />
                         {errors.paying_agent_printed_name && <p className="text-sm text-red-600">{errors.paying_agent_printed_name.message}</p>}
                     </div>
                      <div className="space-y-2">
                         <Label htmlFor="witness_printed_name">Witness Printed Name (Optional)</Label>
                         <Input id="witness_printed_name" {...register('witness_printed_name')} />
                         {errors.witness_printed_name && <p className="text-sm text-red-600">{errors.witness_printed_name.message}</p>}
                     </div>
                 </div>

                 {/* Row 4: PEPI Rec # */}
                  <div className="space-y-2">
                         <Label htmlFor="pepi_receipt_number">PEPI Rec # (Optional)</Label>
                         <Input id="pepi_receipt_number" {...register('pepi_receipt_number')} />
                         {errors.pepi_receipt_number && <p className="text-sm text-red-600">{errors.pepi_receipt_number.message}</p>}
                  </div>


                {/* Signatures Section */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Signatures</h3>
                     <p className="text-sm text-muted-foreground">Please provide the required signatures below.</p>

                    {/* CI Signature */}
                    <div className="space-y-2">
                        <Label htmlFor="ci_signature">CI Signature</Label>
                        <div className="border rounded-md bg-slate-50">
                            <SignatureCanvas ref={ciSigRef} canvasProps={{ id: 'ci_signature', className: 'w-full h-32' }} {...signaturePadOptions} />
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => clearSignature(ciSigRef)}>Clear CI Signature</Button>
                    </div>

                    {/* Paying Agent Signature */}
                    <div className="space-y-2">
                        <Label htmlFor="agent_signature">Paying Agent Signature</Label>
                         <div className="border rounded-md bg-slate-50">
                             <SignatureCanvas ref={agentSigRef} canvasProps={{ id: 'agent_signature', className: 'w-full h-32' }} {...signaturePadOptions} />
                         </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => clearSignature(agentSigRef)}>Clear Agent Signature</Button>
                    </div>

                    {/* Witness Signature */}
                    <div className="space-y-2">
                        <Label htmlFor="witness_signature">Witness Signature (Optional)</Label>
                         <div className="border rounded-md bg-slate-50">
                             <SignatureCanvas ref={witnessSigRef} canvasProps={{ id: 'witness_signature', className: 'w-full h-32' }} {...signaturePadOptions} />
                         </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => clearSignature(witnessSigRef)}>Clear Witness Signature</Button>
                    </div>
                </div>

                {/* Error Message */}
                {error && <p className="text-sm text-red-600">{error}</p>}

                {/* Submit Button */}
                <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? 'Submitting...' : 'Submit CI Payment'}
                </Button>
            </form>
        </div>
    );
} 