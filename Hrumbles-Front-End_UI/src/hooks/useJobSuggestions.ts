
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

export const useJobSuggestions = () => {
  const queryClient = useQueryClient();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  const { data: locations = [], isLoading: isLoadingLocations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('locations')
          .select('name')
          .order('name');

        if (error) {
          console.error("Error loading locations:", error);
          throw error;
        }
        
        // Ensure we always return an array of strings
        return Array.isArray(data) ? data.map(location => location.name || "") : [];
      } catch (error) {
        console.error("Failed to load locations:", error);
        return [];
      }
    },
  });

  const addLocationMutation = useMutation({
    mutationFn: async (newLocation: string) => {
      try {
        if (!newLocation || newLocation.trim() === '') {
          throw new Error("Location name cannot be empty");
        }
        const trimmedLocation = newLocation.trim();
        const { data, error } = await supabase.rpc('manage_location', { p_location_name: trimmedLocation });
        if (error) {
          console.error("Error adding location:", error);
          throw error;
        }
        return trimmedLocation;
      } catch (error) {
        console.error("Error in add location:", error);
        throw error;
      }
    },
    onSuccess: (locationName) => {
      if (locationName) {
        queryClient.invalidateQueries({ queryKey: ['locations'] });
        setSelectedLocation(locationName);
        toast.success(`Added location: ${locationName}`);
      }
    },
    onError: (error) => {
      console.error("Error adding location:", error);
      toast.error('Failed to add new location');
    }
  });

  const handleLocationSelection = (inputValue: string) => {
    if (!inputValue) return;
    
    if (locations.includes(inputValue)) {
      setSelectedLocation(inputValue);
    } else {
      addLocationMutation.mutateAsync(inputValue).catch(error => {
        console.error("Failed to add location:", error);
      });
    }
  };

  return {
    locations,
    selectedLocation,
    handleLocationSelection,
    addLocation: addLocationMutation.mutateAsync,
    isAddingLocation: addLocationMutation.isPending,
    isLoadingLocations,
  };
};
