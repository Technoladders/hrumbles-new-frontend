import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CompanyDetail as CompanyDetailType } from '@/types/company';
import { MapPin } from 'lucide-react';

interface LocationsTabProps {
  company: CompanyDetailType;
}

const LocationsTab: React.FC<LocationsTabProps> = ({ company }) => {
    // Prioritize headquarters from company_data, then fall back
    const hqAddress = company.company_data?.headquarters?.address || company.address || company.location;
    const mainLocation = hqAddress ? {
        name: "Headquarters",
        address: hqAddress,
        phone: company.company_data?.headquarters?.phone,
    } : null;
    
    // Other locations only exist in company_data
    const otherLocations = company.company_data?.other_locations?.map((loc: any, index: number) => ({
        name: `${loc.city}, ${loc.country}`,
        address: `${loc.address ? `${loc.address}, ` : ''}${loc.city}, ${loc.state ? `${loc.state}, ` : ''}${loc.country}`,
        phone: loc.phone
    })) || [];

    const allLocations = [mainLocation, ...otherLocations].filter(Boolean);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
      {allLocations.map((location, index) => (
         <Card key={index}>
            <CardHeader>
                <CardTitle className="flex items-center text-base">
                    <MapPin className="h-5 w-5 mr-2 text-purple-600" />
                    {location.name}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-gray-700">{location.address}</p>
                {location.phone && <p className="text-xs text-gray-500 mt-2">Phone: {location.phone}</p>}
            </CardContent>
         </Card>
      ))}
       {allLocations.length === 0 && (
            <Card className="col-span-full">
                <CardContent className="pt-6">
                     <p className="text-center text-gray-500">No location data available.</p>
                </CardContent>
            </Card>
       )}
    </div>
  );
};

export default LocationsTab;