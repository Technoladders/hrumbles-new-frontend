import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
    Button,
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
    FormControl, FormLabel, Input, useToast, Select, Spinner, VStack
} from '@chakra-ui/react';
import { useManageWorkspaces } from '@/hooks/sales/useManageWorkspaces';
import { useWorkspaces, Workspace } from '@/hooks/sales/useWorkspaces';

interface AddWorkspaceItemDialogProps {
    isOpen: boolean;
    onClose: () => void;
    itemType: 'workspace' | 'file';
    isEditing?: boolean;
    currentItem?: { id: string; name: string } | null;
    workspaceIdForNewFile?: string | null;
}

export const AddWorkspaceItemDialog: React.FC<AddWorkspaceItemDialogProps> = ({ isOpen, onClose, itemType, isEditing = false, currentItem = null, workspaceIdForNewFile }) => {
    const [name, setName] = useState('');
    const [fileType, setFileType] = useState<'people' | 'companies'>('people');
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
    
    const { addWorkspace, addFile, updateWorkspace, updateFile } = useManageWorkspaces();
    const { data: workspaces = [], isLoading: isLoadingWorkspaces } = useWorkspaces();

    const organization_id = useSelector((state: any) => state.auth.organization_id);
    const currentUser = useSelector((state: any) => state.auth.user);
    const toast = useToast();

    useEffect(() => {
        if (isEditing && currentItem) {
            setName(currentItem.name);
        } else {
            setName('');
            setFileType('people');
            setSelectedWorkspaceId(workspaceIdForNewFile || workspaces[0]?.id || '');
        }
    }, [isEditing, currentItem, isOpen, workspaces, workspaceIdForNewFile]);

    const handleSubmit = () => {
        if (!name.trim()) {
            toast({ title: 'Name is required', status: 'error', duration: 3000, isClosable: true });
            return;
        }

        if (itemType === 'file' && !isEditing && !selectedWorkspaceId) {
            toast({ title: 'A folder (workspace) must be selected', status: 'error', duration: 3000, isClosable: true });
            return;
        }

        if (isEditing && currentItem) {
            if (itemType === 'workspace') {
                updateWorkspace.mutate({ id: currentItem.id, name });
            } else {
                updateFile.mutate({ id: currentItem.id, name, workspace_id: '' });
            }
        } else {
            if (itemType === 'workspace') {
                addWorkspace.mutate({ name, organization_id, created_by: currentUser.id });
            } else if (selectedWorkspaceId) {
                addFile.mutate({ name, type: fileType, organization_id, workspace_id: selectedWorkspaceId, created_by: currentUser.id });
            }
        }
        
        onClose();
    };

    const modalTitle = isEditing ? `Edit ${currentItem?.name}` : `Create a new ${itemType}`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{modalTitle}</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4}>
                        {itemType === 'file' && !isEditing && (
                            <FormControl>
                                <FormLabel fontSize="sm">Folder</FormLabel>
                                {isLoadingWorkspaces ? <Spinner/> : (
                                    <Select 
                                        value={selectedWorkspaceId} 
                                        onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                                    >
                                        <option value="" disabled>Select a folder</option>
                                        {workspaces.map((ws: Workspace) => (
                                            <option key={ws.id} value={ws.id}>{ws.name}</option>
                                        ))}
                                    </Select>
                                )}
                            </FormControl>
                        )}
                        <FormControl>
                            <FormLabel fontSize="sm">Name</FormLabel>
                            <Input
                                placeholder={`Enter ${itemType} name...`}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </FormControl>
                        {itemType === 'file' && !isEditing && (
                            <FormControl>
                                <FormLabel fontSize="sm">This is a list of...</FormLabel>
                                <Select 
                                    value={fileType} 
                                    onChange={(e) => setFileType(e.target.value as any)}
                                >
                                    <option value="people">People</option>
                                    <option value="companies">Companies</option>
                                </Select>
                            </FormControl>
                        )}
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button colorScheme="purple" ml={3} onClick={handleSubmit}>
                        {isEditing ? 'Save Changes' : 'Create'}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};