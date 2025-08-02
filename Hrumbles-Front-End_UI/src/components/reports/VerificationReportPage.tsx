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
        <Tabs defaultValue="uan-by-mobile-pan">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="uan-by-mobile-pan">UAN by Mobile/PAN</TabsTrigger>
            <TabsTrigger value="basic-uan">Basic UAN (Full History)</TabsTrigger>
          </TabsList>
          <TabsContent value="uan-by-mobile-pan" className="mt-4">
            <UanByMobileOrPanReport />
          </TabsContent>
          <TabsContent value="basic-uan" className="mt-4">
            <BasicUanReport />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default VerificationReportPage;
// 