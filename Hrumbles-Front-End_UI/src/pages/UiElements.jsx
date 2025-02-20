import { useState } from "react";
import { Box, useColorModeValue, VStack,Heading } from "@chakra-ui/react";
import { Button, Card, Modal, CustomDrawer, InputField, Tabs, Text, Table } from "../components/ui/index";

function DashboardPage() {
  const bgColor = useColorModeValue("base.bglight", "base.bgdark");
  const textColor = useColorModeValue("black", "white");

  // State for modal and drawer
  const [isModalOpen, setModalOpen] = useState(false);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const columns = ["Name", "Email", "Role", "Status"];
  const data = [
    { 
      Name: "Alice", Email: "alice@example.com", Role: "Admin", Status: "Active",
      children: [
        { Name: "Alice Jr.", Email: "alicejr@example.com", Role: "Moderator", Status: "Active" }
      ]
    },
    { Name: "Bob", Email: "bob@example.com", Role: "User", Status: "Inactive" },
    { 
      Name: "Charlie", Email: "charlie@example.com", Role: "Editor", Status: "Active",
      children: [
        { Name: "Charlie Jr.", Email: "charliejr@example.com", Role: "Contributor", Status: "Pending" }
      ]
    },
  ];



  return (
    <Box p={6} bg={bgColor} minH="100vh">

<Box p={6}>
      <Text variant="h1">This is Heading 1</Text>
      <Text variant="h2">This is Heading 2</Text>
      <Text variant="h3">This is Heading 3</Text>
      <Text variant="h4">This is Heading 4</Text>
      <Text variant="h5">This is Heading 5</Text>
      <Text variant="h6">This is Heading 6</Text>
      <Text variant="subtitle">This is a Subtitle</Text>
      <Text variant="body">
        This is body text for paragraphs, using a standard font size.
      </Text><Text variant="bodyLg">
        This is body text for paragraphs, using a standard font size.
      </Text><Text variant="bodySm">
        This is body text for paragraphs, using a standard font size.
      </Text><Text variant="bodyXs">
        This is body text for paragraphs, using a standard font size.
      </Text>
      <Text variant="small">
        This is a small-sized text, useful for captions or footnotes.
      </Text>
      <Text variant="caption">Caption Text</Text>
    </Box>
      
      {/* Buttons to open Modal & Drawer */}
      <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
      <Button onClick={() => setDrawerOpen(true)} ml={4}>Open Drawer</Button>

      {/* UI Components */}
     
      <InputField />
      {/* <Tabs /> */}

      {/* Modal with state control */}
      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)}> 
        Modal Content 
      </Modal>

      {/* Drawer with state control */}
      <CustomDrawer isOpen={isDrawerOpen} onClose={() => setDrawerOpen(false)} />

      <VStack spacing={4} p={6}>
      <InputField label="Outlined Input" variant="outline" placeholder="Enter text..." />
      <InputField label="Filled Input" variant="filled" placeholder="Enter text..." />
      <InputField label="Flushed Input" variant="flushed" placeholder="Enter text..." />
      <InputField label="Underlined Input" variant="underlined" placeholder="Enter text..." />
    </VStack>

    <VStack spacing={4} p={6}>
      <Button variant="solid">Solid Button</Button>
      <Button variant="outline">Outline Button</Button>
      <Button variant="ghost">Ghost Button</Button>
      <Button variant="link">Link Button</Button>
      <Button variant="icon">🔍</Button>
    </VStack>
    <VStack spacing={4} p={6}>
      <Button size="xs" variant="solid">Solid Button</Button>
      <Button size="sm" variant="solid">Solid Button</Button>
      <Button size="md" variant="solid">Solid Button</Button>
      <Button size="lg" variant="solid">Solid Button</Button>
      <Button size="xl" variant="solid">Solid Button</Button>
    </VStack>


    <VStack spacing={4} p={6}>
    <Card 
  title="Projects Completed" 
  count="120" 
  progress={70} 
  buttonText="Add Project" 
  variant="default" 
/>

<Card 
  title="Revenue Generated" 
  count="$25,000" 
  progress={85} 
  buttonText="View Reports" 
  variant="primary" 
/>

<Card 
  title="Tasks Completed" 
  count="340" 
  progress={50} 
  buttonText="Assign Task" 
  variant="outlined" 
/>

<Card 
  title="New Clients" 
  count="15" 
  progress={30} 
  buttonText="Add Client" 
  variant="secondary" 
/>

    </VStack>


    <VStack spacing={4} p={6}>
      <Button size="sm" onClick={() => setIsOpen(true)}>Open Modal</Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSave={() => {
          console.log("Saved!");
          setIsOpen(false);
        }}
        title="Example Modal"
        variant="default"
      >
        <Text>This is an example modal.</Text>
      </Modal>
    </VStack>


    {/* <VStack spacing={4} p={6}>
      <Button onClick={() => setIsOpen(true)}>Open Drawer</Button>
      <CustomDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSave={() => {
          console.log("Saved!");
          setIsOpen(false);
        }}
        title="Example Drawer"
        variant="default"
      >
        <Text>This is an example drawer.</Text>
      </CustomDrawer>
    </VStack> */}

<VStack spacing={6}>
        <Box>
          <Heading size="md" mb={2}>Simple Table</Heading>
          <Table columns={columns} data={data} variant="simple" />
        </Box>
        <Box>
          <Heading size="md" mb={2}>Striped Table</Heading>
          <Table columns={columns} data={data} variant="striped" />
        </Box>
        <Box>
          <Heading size="md" mb={2}>Bordered Table</Heading>
          <Table columns={columns} data={data} variant="bordered" />
        </Box>
        <Box>
          <Heading size="md" mb={2}>Nested Table</Heading>
          <Table columns={columns} data={data} variant="nested" />
        </Box>
      </VStack>

    </Box>





  );
}

export default DashboardPage;
