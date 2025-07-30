import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaces, Workspace } from '../../hooks/sales/useWorkspaces';
import { useWorkspaceFiles, WorkspaceFile } from '../../hooks/sales/useWorkspaceFiles';
import { useListRecordCounts } from '../../hooks/sales/useListRecordCounts';
import { useManageWorkspaces } from '../../hooks/sales/useManageWorkspaces';
import moment from 'moment';
import {
  Box, Heading, Button, Table, Thead, Tbody, Tr, Th, Td, Spinner, Flex, Text, IconButton, useDisclosure,
  InputGroup, InputLeftElement, Input, Collapse, Tag, Checkbox, Spacer, Menu, MenuButton, MenuList, MenuItem,
  AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay,
} from '@chakra-ui/react';
import { AddIcon, SearchIcon, TriangleDownIcon, TriangleUpIcon, EditIcon, DeleteIcon } from '@chakra-ui/icons';
import { AddWorkspaceItemDialog } from '../../components/sales/ContactPage/AddWorkspaceItemDialog';

// --- Reusable Component for a Single Folder (Workspace) ---
const WorkspaceSection = ({ workspace, files, recordCounts, onEdit, onDelete, onAddFile }: { 
    workspace: Workspace, 
    files: WorkspaceFile[], 
    recordCounts: Record<string, number>,
    onEdit: () => void, 
    onDelete: () => void,
    onAddFile: () => void
}) => {
    const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: false });
    const navigate = useNavigate();
    
    const handleFileNavigation = (file: WorkspaceFile) => {
        const path = file.type === 'people' ? `/contacts/file/${file.id}` : `/companies/file/${file.id}`;
        navigate(path);
    };

    return (
        <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" mb={4}>
            <Flex align="center" p={3} borderBottomWidth={isOpen ? "1px" : "0px"} borderColor="gray.200">
                <IconButton
                    aria-label="Toggle Folder Content"
                    icon={isOpen ? <TriangleDownIcon /> : <TriangleUpIcon />}
                    onClick={onToggle}
                    variant="ghost" color="gray.600" size="sm" mr={3}
                />
                <Heading size="sm" color="gray.700" cursor="pointer" onClick={onToggle}>{workspace.name}</Heading>
                <Tag size="sm" bg="gray.100" color="gray.600" ml={3} borderRadius="full" px={2}>{files.length}</Tag>
                <Spacer />
                <IconButton aria-label="Add List to this Folder" icon={<AddIcon />} onClick={onAddFile} variant="ghost" color="gray.500" size="xs" />
                <IconButton aria-label="Edit Folder Name" icon={<EditIcon />} onClick={onEdit} variant="ghost" color="gray.500" size="xs" />
                <IconButton aria-label="Delete Folder" icon={<DeleteIcon />} onClick={onDelete} variant="ghost" color="gray.500" size="xs" _hover={{ color: 'red.500' }}/>
            </Flex>
            <Collapse in={isOpen} animateOpacity>
                <Box p={4} overflowX="auto">
                    {files.length > 0 ? (
                        <Table variant="simple" size="sm">
                            <Thead>
                                <Tr>
                                    <Th width="40%"><Checkbox mr={4} isDisabled />List Name</Th>
                                    <Th># of Records</Th>
                                    <Th>Type</Th>
                                    <Th>Created By</Th>
                                    <Th>Last Modified</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {files.map((file: WorkspaceFile) => (
                                    <Tr key={file.id} _hover={{ bg: "gray.50" }} cursor="pointer" onClick={() => handleFileNavigation(file)}>
                                        <Td color="purple.600" fontWeight="medium"><Checkbox mr={4} isDisabled />{file.name}</Td>
                                        <Td>{recordCounts[file.id] ?? <Spinner size="xs"/>}</Td>
                                        <Td border="none"><Tag size="sm" bg={file.type === 'people' ? 'blue.500' : 'green.500'} color="white" variant="solid">{file.type.charAt(0).toUpperCase() + file.type.slice(1)}</Tag></Td>
                                        <Td>{file.created_by_employee ? `${file.created_by_employee.first_name}` : 'System'}</Td>
                                        <Td>{moment(file.created_at).fromNow()}</Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                    ) : (
                       <Text fontSize="sm" color="gray.500" py={2} textAlign="center">No lists in this folder.</Text>
                    )}
                </Box>
            </Collapse>
        </Box>
    );
};

// --- Component for Top-Level Sections (People/Companies) ---
const TypeSection = ({ title, type, workspaces, filesByWorkspaceId, recordCounts, handleOpenModal, handleOpenAlert }: any) => {
    const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true });
    
    const totalLists = workspaces.reduce((acc: number, ws: Workspace) => {
        const filesForWs = filesByWorkspaceId.get(ws.id) || [];
        return acc + filesForWs.length;
    }, 0);

    return (
        <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="lg" mb={6}>
            <Flex align="center" p={4} cursor="pointer" onClick={onToggle}>
                <Heading size="md" color="gray.800">{title}</Heading>
                <Tag size="md" bg="gray.100" color="gray.600" ml={3} borderRadius="full" px={3}>{totalLists}</Tag>
                <Spacer />
                <IconButton aria-label="Toggle section" icon={isOpen ? <TriangleUpIcon /> : <TriangleDownIcon />} variant="ghost" color="gray.600" size="sm" />
            </Flex>
            <Collapse in={isOpen} animateOpacity>
                <Box p={4} pt={0}>
                    {workspaces.length > 0 ? (
                        workspaces.map((ws: Workspace) => (
                            <WorkspaceSection 
                                key={ws.id}
                                workspace={ws}
                                files={filesByWorkspaceId.get(ws.id) || []}
                                recordCounts={recordCounts}
                                onEdit={() => handleOpenModal('workspace', true, ws)}
                                onDelete={() => handleOpenAlert(ws, 'workspace')}
                                onAddFile={() => handleOpenModal('file', false, null, ws.id)}
                            />
                        ))
                    ) : (
                         <Flex direction="column" align="center" justify="center" p={10}>
                            <Box bg="purple.100" borderRadius="full" p={3} mb={4}><SearchIcon boxSize="24px" color="purple.600" /></Box>
                            <Text mt={4} color="gray.800" fontWeight="bold">No {title.toLowerCase()} lists found</Text>
                            <Text fontSize="sm" color="gray.500">Create a new folder or list to get started.</Text>
                        </Flex>
                    )}
                </Box>
            </Collapse>
        </Box>
    );
};

// --- Main Page Component ---
const ListsPage: React.FC = () => {
    const { data: workspaces = [], isLoading: isLoadingWorkspaces } = useWorkspaces();
    const { data: files = [], isLoading: isLoadingFiles } = useWorkspaceFiles();
    const { data: recordCounts = {} } = useListRecordCounts(files);
    const { deleteWorkspace } = useManageWorkspaces();
    
    const { isOpen: isModalOpen, onOpen: onOpenModal, onClose: onCloseModal } = useDisclosure();
    const { isOpen: isAlertOpen, onOpen: onOpenAlert, onClose: onCloseAlert } = useDisclosure();
    
    const [modalConfig, setModalConfig] = useState<{ type: 'workspace' | 'file', isEditing: boolean, currentItem?: any, workspaceIdForNewFile?: string | null }>({ type: 'workspace', isEditing: false });
    const [itemToDelete, setItemToDelete] = useState<{ id: string, name: string, type: 'workspace' | 'file' } | null>(null);
    const cancelRef = React.useRef<HTMLButtonElement>(null);

    const { peopleWorkspaces, companiesWorkspaces, peopleFilesByWorkspaceId, companiesFilesByWorkspaceId } = useMemo(() => {
        const filesByWs = new Map<string, WorkspaceFile[]>();
        files.forEach(file => {
            const list = filesByWs.get(file.workspace_id) || [];
            list.push(file);
            filesByWs.set(file.workspace_id, list);
        });

        const peopleWsIds = new Set<string>();
        const companiesWsIds = new Set<string>();

        filesByWs.forEach((fileList, wsId) => {
            if (fileList.some(f => f.type === 'people')) peopleWsIds.add(wsId);
            if (fileList.some(f => f.type === 'companies')) companiesWsIds.add(wsId);
        });
        
        const pWorkspaces = workspaces.filter(ws => peopleWsIds.has(ws.id));
        const cWorkspaces = workspaces.filter(ws => companiesWsIds.has(ws.id));
        
        const pFilesByWs = new Map<string, WorkspaceFile[]>();
        filesByWs.forEach((fileList, wsId) => {
            pFilesByWs.set(wsId, fileList.filter(f => f.type === 'people'));
        });

        const cFilesByWs = new Map<string, WorkspaceFile[]>();
        filesByWs.forEach((fileList, wsId) => {
            cFilesByWs.set(wsId, fileList.filter(f => f.type === 'companies'));
        });

        return {
            peopleWorkspaces: pWorkspaces,
            companiesWorkspaces: cWorkspaces,
            peopleFilesByWorkspaceId: pFilesByWs,
            companiesFilesByWorkspaceId: cFilesByWs
        };
    }, [files, workspaces]);

    const handleOpenModal = (type: 'workspace' | 'file', isEditing = false, currentItem: any = null, workspaceIdForNewFile: string | null = null) => {
        setModalConfig({ type, isEditing, currentItem, workspaceIdForNewFile });
        onOpenModal();
    };

    const handleOpenAlert = (item: Workspace, type: 'workspace' | 'file') => {
        setItemToDelete({ id: item.id, name: item.name, type });
        onOpenAlert();
    };

    const confirmDelete = () => {
        if (itemToDelete?.type === 'workspace') {
            deleteWorkspace.mutate(itemToDelete.id);
        }
        onCloseAlert();
    };
    
    return (
        <Box p={{ base: 4, md: 8 }} bg="gray.50" minH="100vh">
            <Flex justify="space-between" align="center" mb={6}>
                <Heading as="h1" size="lg" color="gray.800">My lists</Heading>
                <Menu>
                    <MenuButton as={Button} leftIcon={<AddIcon />} colorScheme="purple">
                        Create
                    </MenuButton>
                    <MenuList>
                        <MenuItem onClick={() => handleOpenModal('workspace')}>Create a Workspace</MenuItem>
                        <MenuItem onClick={() => handleOpenModal('file')}>Create a list</MenuItem>
                    </MenuList>
                </Menu>
            </Flex>

            {/* <Flex mb={6} gap={4}>
                <Button variant="outline">Show Filters</Button>
                <InputGroup>
                    <InputLeftElement pointerEvents="none"><SearchIcon color="gray.400" /></InputLeftElement>
                    <Input placeholder="Search lists or folders" bg="white" />
                </InputGroup>
            </Flex> */}

            {isLoadingWorkspaces || isLoadingFiles ? (
                <Flex justify="center" p={10}><Spinner color="purple.500" /></Flex>
            ) : (
                <>
                    <TypeSection 
                        title="People"
                        type="people"
                        workspaces={peopleWorkspaces} 
                        filesByWorkspaceId={peopleFilesByWorkspaceId} 
                        recordCounts={recordCounts}
                        handleOpenModal={handleOpenModal}
                        handleOpenAlert={handleOpenAlert}
                    />
                    <TypeSection 
                        title="Companies"
                        type="companies"
                        workspaces={companiesWorkspaces} 
                        filesByWorkspaceId={companiesFilesByWorkspaceId}
                        recordCounts={recordCounts}
                        handleOpenModal={handleOpenModal}
                        handleOpenAlert={handleOpenAlert}
                    />
                </>
            )}

            <AddWorkspaceItemDialog
                isOpen={isModalOpen}
                onClose={onCloseModal}
                itemType={modalConfig.type}
                isEditing={modalConfig.isEditing}
                currentItem={modalConfig.currentItem}
                workspaceIdForNewFile={modalConfig.workspaceIdForNewFile}
            />

            <AlertDialog isOpen={isAlertOpen} leastDestructiveRef={cancelRef} onClose={onCloseAlert} isCentered>
                <AlertDialogOverlay><AlertDialogContent>
                    <AlertDialogHeader fontSize="lg" fontWeight="bold">Delete {itemToDelete?.type}</AlertDialogHeader>
                    <AlertDialogBody>
                        Are you sure you want to delete "{itemToDelete?.name}"? All lists inside this folder will also be permanently removed. This action cannot be undone.
                    </AlertDialogBody>
                    <AlertDialogFooter>
                        <Button ref={cancelRef} onClick={onCloseAlert}>Cancel</Button>
                        <Button colorScheme="red" onClick={confirmDelete} ml={3}>Delete</Button>
                    </AlertDialogFooter>
                </AlertDialogContent></AlertDialogOverlay>
            </AlertDialog>
        </Box>
    );
};

export default ListsPage;