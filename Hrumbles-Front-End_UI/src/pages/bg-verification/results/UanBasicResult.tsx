// src/pages/jobs/ai/results/UanBasicResult.tsx

import { Card, CardContent } from '@/components/ui/card';

export const UanBasicResult = ({ result }: { result: any }) => {
  const uanDetails = result.msg?.uan_details;
  const employmentDetails = result.msg?.employment_details || [];

  if (!Array.isArray(uanDetails) || uanDetails.length === 0) {
    return <p className="text-gray-500">No UAN details found in the result.</p>;
  }

  // Helper to find the latest employment for a given UAN
  const findEmploymentForUan = (uan: string) => {
    return employmentDetails.find((emp: any) => emp.uan === uan);
  };

  return (
    <div className="space-y-4">
      {uanDetails.map((details: any, index: number) => {
        const employment = findEmploymentForUan(details.uan);
        return (
          <Card key={index} className="bg-green-50 border-green-200 shadow-sm">
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <h3 className="md:col-span-2 text-base font-bold text-gray-800 mb-2">UAN Record {index + 1}</h3>
              
              <div><span className="font-semibold text-gray-600">Name:</span> {details.name || 'N/A'}</div>
              <div><span className="font-semibold text-gray-600">UAN:</span> {details.uan || 'N/A'}</div>
              <div><span className="font-semibold text-gray-600">Date of Birth:</span> {details.date_of_birth || 'N/A'}</div>
              <div><span className="font-semibold text-gray-600">Gender:</span> {details.gender || 'N/A'}</div>

              {/* {employment && (
                <>
                  <hr className="md:col-span-2 my-2"/>
                  <div className="md:col-span-2"><span className="font-semibold text-gray-600">Last Known Employment with this UAN:</span> {employment.establishment_name || 'N/A'}</div>
                  <div><span className="font-semibold text-gray-600">Joined:</span> {employment.date_of_joining || 'N/A'}</div>
                  <div><span className="font-semibold text-gray-600">Exited:</span> {employment.date_of_exit || 'Present'}</div>
                </>
              )} */}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};