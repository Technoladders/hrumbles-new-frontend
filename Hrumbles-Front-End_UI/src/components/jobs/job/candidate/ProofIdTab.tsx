import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CandidateFormData } from "./AddCandidateDrawer";

// Form validation schema
const proofIdSchema = z.object({
  uan: z.string().optional(),
  pan: z.string().optional(),
  pf: z.string().optional(),
  esicNumber: z.string().optional(),
});

interface ProofIdTabProps {
  form: UseFormReturn<CandidateFormData>;
  onSave: (data: CandidateFormData) => void;
  onCancel: () => void;
  isSaving: boolean; // Added prop for loading state
}

const ProofIdTab = ({ form, onSave, onCancel, isSaving}: ProofIdTabProps) => {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="uan"
            render={({ field }) => (
              <FormItem>
                <FormLabel>UAN</FormLabel>
                <FormControl>
                  <Input placeholder="Enter UAN" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pan"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PAN</FormLabel>
                <FormControl>
                  <Input placeholder="Enter PAN" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="pf"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PF Number</FormLabel>
                <FormControl>
                  <Input placeholder="Enter PF Number" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="esicNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ESIC Number</FormLabel>
                <FormControl>
                  <Input placeholder="Enter ESIC Number" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end space-x-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ProofIdTab;