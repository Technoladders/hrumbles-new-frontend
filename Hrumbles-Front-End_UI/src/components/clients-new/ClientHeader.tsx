// src/components/clients-new/ClientHeader.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { MoreVertical, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ClientHeaderProps {
  clientName: string;
}

const ClientHeader: React.FC<ClientHeaderProps> = ({ clientName }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clients")} className="h-9 w-9">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          {clientName}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline">Edit</Button>
        <Button className="bg-green-600 hover:bg-green-700 text-white">
          New Transaction
        </Button>
        <Button variant="outline" size="icon">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ClientHeader;