import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UanByMobileOrPanReport from './verifications/UanByMobileOrPanReport';
import BasicUanReport from './verifications/BasicUanReport';

const VerificationReportPage: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Verification Reports</CardTitle>
        <p className="text-sm text-muted-foreground">
          Review logs and results from various background verification checks.
        </p>
      </CardHeader>
      <CardContent>
<div className="flex-shrink-0 order-1">
  <Tabs defaultValue="uan-by-mobile-pan">
    <TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner space-x-0.5">
      <TabsTrigger
        value="uan-by-mobile-pan"
        className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
          data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
      >
        UAN by Mobile/PAN
      </TabsTrigger>
      <TabsTrigger
        value="basic-uan"
        className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
          data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
      >
        Basic UAN (Full History)
      </TabsTrigger>
    </TabsList>
    <TabsContent value="uan-by-mobile-pan" className="mt-4">
      <UanByMobileOrPanReport />
    </TabsContent>
    <TabsContent value="basic-uan" className="mt-4">
      <BasicUanReport />
    </TabsContent>
  </Tabs>
</div>
      </CardContent>
    </Card>
  );
};

export default VerificationReportPage;
// 