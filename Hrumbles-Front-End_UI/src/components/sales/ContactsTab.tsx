import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CandidateDetail } from '@/types/company';
import { Mail, Phone, Linkedin } from 'lucide-react';

interface ContactsTabProps {
  contacts: CandidateDetail[];
  isLoading: boolean;
}

const ContactsTab: React.FC<ContactsTabProps> = ({ contacts, isLoading }) => {
  if (isLoading) {
    return <p>Loading contacts...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Point of Contacts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>LinkedIn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.length > 0 ? contacts.map(contact => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell>{contact.designation || 'N/A'}</TableCell>
                  <TableCell>{contact.email || 'N/A'}</TableCell>
                  <TableCell>{contact.phone_number || 'N/A'}</TableCell>
                  <TableCell>
                    {contact.linkedin ? <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline"><Linkedin size={16} /></a> : 'N/A'}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">No contacts found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContactsTab;