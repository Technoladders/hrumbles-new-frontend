import { Tabs, TabList, Tab, TabPanels, TabPanel, useColorModeValue } from "@chakra-ui/react";

const CustomTabs = ({ tabs }) => {
  const bg = useColorModeValue("base.bglight", "base.bgdark");

  return (
    <Tabs>
      <TabList bg={bg} borderRadius="md">
        {tabs.map((tab, index) => (
          <Tab key={index}>{tab.label}</Tab>
        ))}
      </TabList>
      <TabPanels>
        {tabs.map((tab, index) => (
          <TabPanel key={index}>{tab.content}</TabPanel>
        ))}
      </TabPanels>
    </Tabs>
  );
};

export default CustomTabs;
