import { UseFormReturn } from "react-hook-form";
import * as z from "zod";
import { motion } from "framer-motion"; // Import framer-motion
import { Fingerprint, FileText, Loader2 } from "lucide-react"; // Import icons
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

// --- Animation Variants for Framer Motion ---

// Defines the animation for the main section card
const sectionVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.5,
      when: "beforeChildren",
      staggerChildren: 0.1 
    } 
  },
};

// Defines the animation for individual form fields
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

// Defines the 3D hover effect for input fields
const fieldHoverEffect = {
  hover: { 
    scale: 1.03,
    boxShadow: "0px 10px 30px -5px rgba(123, 97, 255, 0.2)",
    transition: { type: "spring", stiffness: 400, damping: 15 }
  }
};


// Form validation schema (remains as per your original code)
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
  isSaving: boolean; // Prop for loading state
}

const ProofIdTab = ({ form, onSave, onCancel, isSaving }: ProofIdTabProps) => {
  return (
    <Form {...form}>
      <motion.form 
        onSubmit={form.handleSubmit(onSave)} 
        className="space-y-4 py-4"
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
          <motion.h3 variants={itemVariants} className="text-xl font-bold mb-6 text-gray-800">
            Proof of ID & Employment
          </motion.h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div variants={itemVariants}>
              <FormField
                control={form.control}
                name="uan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UAN (Universal Account Number)</FormLabel>
                    <FormControl>
                      <motion.div variants={fieldHoverEffect} whileHover="hover" className="relative">
                        <Fingerprint className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input placeholder="Enter UAN" {...field} value={field.value ?? ""} className="pl-10"/>
                      </motion.div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <FormField
                control={form.control}
                name="pan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PAN (Permanent Account Number)</FormLabel>
                    <FormControl>
                      <motion.div variants={fieldHoverEffect} whileHover="hover" className="relative">
                        <Fingerprint className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input placeholder="Enter PAN" {...field} value={field.value ?? ""} className="pl-10"/>
                      </motion.div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <FormField
                control={form.control}
                name="pf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PF (Provident Fund) Number</FormLabel>
                    <FormControl>
                      <motion.div variants={fieldHoverEffect} whileHover="hover" className="relative">
                        <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input placeholder="Enter PF Number" {...field} value={field.value ?? ""} className="pl-10"/>
                      </motion.div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <FormField
                control={form.control}
                name="esicNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ESIC (Employee's State Insurance) Number</FormLabel>
                    <FormControl>
                      <motion.div variants={fieldHoverEffect} whileHover="hover" className="relative">
                        <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input placeholder="Enter ESIC Number" {...field} value={field.value ?? ""} className="pl-10"/>
                      </motion.div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>
          </div>
        </motion.div>

        <div className="flex justify-end space-x-4 pt-4">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button type="submit" disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/50 min-w-[120px]">
              {isSaving ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin h-4 w-4" />
                  <span>Saving...</span>
                </div>
              ) : "Save Candidate"}
            </Button>
          </motion.div>
        </div>
      </motion.form>
    </Form>
  );
};

export default ProofIdTab;