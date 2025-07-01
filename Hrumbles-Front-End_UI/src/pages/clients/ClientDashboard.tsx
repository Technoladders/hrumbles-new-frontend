import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client'; // Adjust path to your Supabase client

// Define Client interface based on hr_clients JSON
interface BillingAddress {
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

interface Client {
  id: string;
  display_name: string;
  service_type: string[];
  internal_contact: string;
  billing_address: BillingAddress;
  status: string;
}

const ClientDashboard: React.FC = () => {
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [activeTab, setActiveTab] = useState<'All' | 'Permanent' | 'Contractual' | 'Both'>('All');

  // Fetch clients using TanStack Query
  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_clients')
        .select('id, display_name, service_type, internal_contact, billing_address, status');

      if (error) throw error;
      return data || [];
    },
  });

  // Filter clients based on active tab
  useEffect(() => {
    if (clients) {
      if (activeTab === 'All') {
        setFilteredClients(clients);
      } else if (activeTab === 'Permanent') {
        setFilteredClients(clients.filter((client) => client.service_type.includes('permanent')));
      } else if (activeTab === 'Contractual') {
        setFilteredClients(clients.filter((client) => client.service_type.includes('contractual')));
      } else if (activeTab === 'Both') {
        setFilteredClients(
          clients.filter(
            (client) =>
              client.service_type.includes('permanent') && client.service_type.includes('contractual')
          )
        );
      }
    }
  }, [activeTab, clients]);

  // Calculate card statistics
  const totalClients = clients?.length || 0;
  const permanentClients =
    clients?.filter((client) => client.service_type.includes('permanent')).length || 0;
  const contractualClients =
    clients?.filter((client) => client.service_type.includes('contractual')).length || 0;
  const activeClients = clients?.filter((client) => client.status === 'active').length || 0;

  // Tab options
  const tabs = ['All', 'Permanent', 'Contractual', 'Both'];

  // Helper to format address
  const formatAddress = (address: BillingAddress): string => {
    const parts = [
      address.street,
      address.city,
      address.state,
      address.country,
      address.zipCode,
    ].filter((part) => part && part.trim() !== '');
    return parts.join(', ');
  };

  return (
    <div className="container mx-auto p-6 bg-gray-100 min-h-screen">
      {/* Dashboard Header */}
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Client Dashboard</h1>

      {/* Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
          <h2 className="text-lg font-semibold text-gray-700">Total Clients</h2>
          <p className="text-3xl font-bold text-blue-600">{totalClients}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
          <h2 className="text-lg font-semibold text-gray-700">Permanent Clients</h2>
          <p className="text-3xl font-bold text-green-600">{permanentClients}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
          <h2 className="text-lg font-semibold text-gray-700">Contractual Clients</h2>
          <p className="text-3xl font-bold text-orange-600">{contractualClients}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
          <h2 className="text-lg font-semibold text-gray-700">Active Clients</h2>
          <p className="text-3xl font-bold text-purple-600">{activeClients}</p>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="mb-6">
        <div className="flex space-x-4 border-b">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`py-2 px-4 text-sm font-medium ${
                activeTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
              onClick={() => setActiveTab(tab as typeof activeTab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center text-gray-600">Loading clients...</div>
        ) : !clients || filteredClients.length === 0 ? (
          <div className="p-6 text-center text-gray-600">No clients found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Internal Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {client.id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {client.display_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {client.service_type.join(', ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {client.internal_contact || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatAddress(client.billing_address) || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientDashboard;