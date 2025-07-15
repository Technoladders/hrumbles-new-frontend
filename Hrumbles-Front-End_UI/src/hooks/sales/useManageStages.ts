// src/hooks/sales/useManageStages.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";

export const useManageStages = () => {
    const queryClient = useQueryClient();

    const onSettled = () => {
        queryClient.invalidateQueries({ queryKey: ['contactStages'] });
    };

    const addStage = useMutation({
        mutationFn: async (newStage: { name: string; color: string; organization_id: string }) => {
            const { error } = await supabase.from('contact_stages').insert(newStage);
            if (error) throw error;
        },
        onSettled,
    });

    const updateStage = useMutation({
        mutationFn: async (stage: { id: number; name: string; color: string }) => {
            const { error } = await supabase.from('contact_stages').update({ name: stage.name, color: stage.color }).eq('id', stage.id);
            if (error) throw error;
        },
        onSettled,
    });
    
    const deleteStage = useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase.from('contact_stages').delete().eq('id', id);
            if (error) throw error;
        },
        onSettled,
    });

    const updateStageOrder = useMutation({
        mutationFn: async (stages: { id: number, display_order: number }[]) => {
             const { error } = await supabase.from('contact_stages').upsert(stages, { onConflict: 'id' });
             if (error) throw error;
        },
        onSettled
    });

    return { addStage, updateStage, deleteStage, updateStageOrder };
};