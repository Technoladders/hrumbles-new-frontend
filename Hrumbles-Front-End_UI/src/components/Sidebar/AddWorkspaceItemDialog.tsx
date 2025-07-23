import React, { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  FormControl, FormLabel, Input, Button, useToast
} from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import { useManageWorkspaces } from '../../hooks/sales/useManageWorkspaces';

interface AddWorkspaceItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: 'workspace' | 'file';
  workspaceId?: string | null; // Required only when creating a file
}

export const AddWorkspaceItemDialog: React.FC<AddWorkspaceItemDialogProps> = ({ isOpen, onClose, itemType, workspaceId }) => {
  const [name, setName] = useState('');
  const { user, organization_id } = useSelector((state: any) => state.auth);
  const { addWorkspace, addFile } = useManageWorkspaces();
  const toast = useToast();

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({ title: 'Name is required', status: 'error' });
      return;
    }
    if (!organization_id || !user?.id) {
        toast({ title: 'Authentication Error', description: 'Cannot perform this action.', status: 'error' });
        return;
    }

    if (itemType === 'workspace') {
      addWorkspace.mutate(
        { name, organization_id, created_by: user.id },
        { onSuccess: () => { setName(''); onClose(); } }
      );
    } else if (itemType === 'file' && workspaceId) {
      addFile.mutate(
        { name, organization_id, workspace_id: workspaceId, created_by: user.id },
        { onSuccess: () => { setName(''); onClose(); } }
      );
    }
  };

  const isLoading = addWorkspace.isPending || addFile.isPending;
  const title = itemType === 'workspace' ? 'Add New Workspace' : 'Add New File';
  const label = itemType === 'workspace' ? 'Workspace Name' : 'File Name';

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl isRequired>
            <FormLabel>{label}</FormLabel>
            <Input 
              placeholder={itemType === 'workspace' ? 'e.g., "Q3 Prospects"' : 'e.g., "Tech Leads"'}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button colorScheme="purple" onClick={handleSubmit} isLoading={isLoading}>
            Create
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};