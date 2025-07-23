import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
    Box, 
    VStack, 
    Text, 
    Button, 
    Flex, 
    Icon, 
    Spinner,
    useDisclosure // Import useDisclosure for modal state management
} from "@chakra-ui/react";
import { setSelectedWorkspace, setSelectedFile, setViewUnfiled } from '../../Redux/workspaceSlice';
import { useWorkspaces } from '../../hooks/sales/useWorkspaces';
import { useWorkspaceFiles } from '../../hooks/sales/useWorkspaceFiles';
import { PlusCircle, Inbox } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { AddWorkspaceItemDialog } from './AddWorkspaceItemDialog'; // Import the dialog component

// Hook to get the count of unfiled contacts remains the same
const useUnfiledContactsCount = () => {
    const organization_id = useSelector((state: any) => state.auth.organization_id);
    return useQuery({
        queryKey: ['unfiledContactsCount', organization_id],
        queryFn: async () => {
            const { count, error } = await supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('organization_id', organization_id).is('file_id', null);
            if (error) return 0;
            return count;
        },
        enabled: !!organization_id,
    });
};

export const WorkspaceSidebar = () => {
    const dispatch = useDispatch();
    const { selectedWorkspaceId, selectedFileId, viewingMode } = useSelector((state: any) => state.workspace);
    
    // --- STATE AND HOOKS ---
    const { data: unfiledCount = 0 } = useUnfiledContactsCount();
    const { data: workspaces = [], isLoading: isLoadingWorkspaces } = useWorkspaces();
    const { data: files = [], isLoading: isLoadingFiles } = useWorkspaceFiles(selectedWorkspaceId);
    
    // --- DIALOG STATE MANAGEMENT ---
    const { isOpen: isAddDialogOpen, onOpen: onOpenAddDialog, onClose: onCloseAddDialog } = useDisclosure();
    const [dialogItemType, setDialogItemType] = useState<'workspace' | 'file'>('workspace');

    // --- HANDLER FUNCTIONS ---
    const openAddWorkspaceDialog = () => {
        setDialogItemType('workspace');
        onOpenAddDialog();
    };

    const openAddFileDialog = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevents the workspace selection from changing
        setDialogItemType('file');
        onOpenAddDialog();
    };

    const handleSelectWorkspace = (id: string) => {
        dispatch(setSelectedWorkspace(id));
    };

    const handleSelectFile = (id: string) => {
        dispatch(setSelectedFile(id));
    };

    const handleViewUnfiled = () => {
        dispatch(setViewUnfiled());
    };

    return (
        <>
            <Flex
                direction="column"
                bg="white"
                borderRight="1px solid"
                borderColor="gray.200"
                height="100vh"
                width="240px"
                p={3}
                position="fixed"
                top={0}
            >
                <Flex align="center" justify="space-between" mb={4} px={2}>
                    <Text fontSize="lg" fontWeight="semibold" color="gray.700">Workspaces</Text>
                    {/* This button now opens the dialog to add a workspace */}
                    <Button variant="ghost" size="sm" onClick={openAddWorkspaceDialog}>
                        <Icon as={PlusCircle} boxSize={5} color="gray.500" />
                    </Button>
                </Flex>

                {/* Unfiled Contacts Button */}
                {unfiledCount > 0 && (
                    <Box w="full" mb={2}>
                        <Button
                            justifyContent="space-between"
                            variant={viewingMode === 'unfiled' ? "solid" : "ghost"}
                            colorScheme={viewingMode === 'unfiled' ? "blue" : "gray"}
                            w="full"
                            leftIcon={<Icon as={Inbox} boxSize={5} />}
                            onClick={handleViewUnfiled}
                        >
                            Unfiled
                            <Text as="span" bg="blue.500" color="white" fontSize="xs" fontWeight="bold" px={2} borderRadius="full">
                                {unfiledCount}
                            </Text>
                        </Button>
                    </Box>
                )}
                
                <VStack
                    spacing={1}
                    align="stretch"
                    flex="1"
                    overflowY="auto"
                    css={{ "&::-webkit-scrollbar": { display: "none" }, "scrollbar-width": "none" }}
                >
                    {isLoadingWorkspaces && <Flex justify="center" p={4}><Spinner size="md" /></Flex>}
                    
                    {workspaces.map(ws => (
                        <Box key={ws.id} w="full">
                            <Button
                                justifyContent="start"
                                variant={selectedWorkspaceId === ws.id ? "solid" : "ghost"}
                                colorScheme={selectedWorkspaceId === ws.id ? "purple" : "gray"}
                                w="full"
                                textAlign="left"
                                onClick={() => handleSelectWorkspace(ws.id)}
                                fontWeight={selectedWorkspaceId === ws.id ? "bold" : "medium"}
                            >
                                {ws.name}
                            </Button>
                            {selectedWorkspaceId === ws.id && (
                                <VStack pl={4} mt={1} spacing={1} align="start">
                                    {isLoadingFiles && <Text fontSize="xs" color="gray.500" pl={3} py={1}>Loading...</Text>}
                                    {files.map(file => (
                                        <Button
                                            key={file.id}
                                            justifyContent="start"
                                            variant={selectedFileId === file.id ? "subtle" : "ghost"}
                                            colorScheme={selectedFileId === file.id ? "purple" : "gray"}
                                            size="sm"
                                            w="full"
                                            onClick={() => handleSelectFile(file.id)}
                                            fontWeight="normal"
                                        >
                                            {file.name}
                                        </Button>
                                    ))}
                                    {/* This button now opens the dialog to add a file */}
                                    <Button 
                                        variant="link" 
                                        size="sm" 
                                        leftIcon={<Icon as={PlusCircle} boxSize={3}/>} 
                                        colorScheme="gray" 
                                        fontWeight="normal" 
                                        onClick={openAddFileDialog}
                                    >
                                        Add File
                                    </Button>
                                </VStack>
                            )}
                        </Box>
                    ))}
                </VStack>
            </Flex>

            {/* The Dialog is rendered here, but remains hidden until opened */}
            <AddWorkspaceItemDialog
                isOpen={isAddDialogOpen}
                onClose={onCloseAddDialog}
                itemType={dialogItemType}
                workspaceId={selectedWorkspaceId}
            />
        </>
    );
};