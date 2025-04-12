import React from "react";
import { ProfileHeader } from "./ProfileHeader";
import { StatsBar } from "./StatsBar";
import { PersonalInfoSection } from "./sections/PersonalInfoSection";
import { EmploymentInfoSection } from "./sections/EmploymentInfoSection";
import { EducationSection } from "./sections/EducationSection";
import { BankInfoSection } from "./sections/BankInfoSection";
import { MetricsSection } from "./sections/MetricsSection";
import { EmploymentDetailsModal } from "./modals/EmploymentDetailsModal";
import { PersonalDetailsEditModal } from "../modals/PersonalDetailsEditModal";
import { PersonalDetailsData } from "../types";

interface ProfileContentProps {
  employeeData: any;
  isEmploymentModalOpen: boolean;
  isPersonalModalOpen: boolean;
  setIsEmploymentModalOpen: (value: boolean) => void;
  setIsPersonalModalOpen: (value: boolean) => void;
  handleEdit: (section: string) => void;
  handleUpdateEmployment: (data: any) => Promise<void>;
  handleUpdatePersonal: (data: any) => Promise<void>;
  calculateYearsOfExperience: (date: string) => string;
  totalExperience: string;
}

export const ProfileContent: React.FC<ProfileContentProps> = ({
  employeeData,
  isEmploymentModalOpen,
  isPersonalModalOpen,
  setIsEmploymentModalOpen,
  setIsPersonalModalOpen,
  handleEdit,
  handleUpdateEmployment,
  handleUpdatePersonal,
  calculateYearsOfExperience,
  totalExperience
}) => {
  const personalData: PersonalDetailsData = {
    employeeId: employeeData.employeeId,
    firstName: employeeData.firstName,
    lastName: employeeData.lastName,
    email: employeeData.email,
    phone: employeeData.phone || '',
    dateOfBirth: employeeData.dateOfBirth || '',
    gender: employeeData.gender || '',
    bloodGroup: employeeData.bloodGroup || '',
    maritalStatus: employeeData.maritalStatus || '',
    presentAddress: employeeData.presentAddress || {
      addressLine1: '',
      country: '',
      state: '',
      city: '',
      zipCode: ''
    },
    permanentAddress: employeeData.permanentAddress || {
      addressLine1: '',
      country: '',
      state: '',
      city: '',
      zipCode: ''
    },
    emergencyContacts: employeeData.emergencyContacts || [],
    familyDetails: employeeData.familyDetails || [],
    documents: employeeData.documents || [],
    aadharNumber: employeeData.aadharNumber || '',
    panNumber: employeeData.panNumber || '',
    uanNumber: employeeData.uanNumber,
    esicNumber: employeeData.esicNumber,
    aadharUrl: employeeData.aadharUrl,
    panUrl: employeeData.panUrl,
    uanUrl: employeeData.uanUrl,
    esicUrl: employeeData.esicUrl
  };

  return (
    <div className="space-y-8">
      <ProfileHeader
        employeeId={employeeData.employeeId}
        firstName={employeeData.firstName}
        lastName={employeeData.lastName}
        email={employeeData.email}
      />

      <StatsBar
        joinedDate={employeeData.joinedDate}
        department={employeeData.department || "Engineering"}
        designation={employeeData.position || "Software Engineer"}
        yearsOfExperience={totalExperience}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <PersonalInfoSection
          phone={employeeData.phone}
          dateOfBirth={employeeData.dateOfBirth}
          maritalStatus={employeeData.maritalStatus}
          onEdit={() => handleEdit("personal")}
        />

        <EmploymentInfoSection
          employeeId={employeeData.employeeId}
          onEdit={() => handleEdit("employment")}
        />

        <EducationSection
          employeeId={employeeData.id}
          onEdit={() => handleEdit("education")}
        />

        <BankInfoSection
          employeeId={employeeData.id}
        />

        <MetricsSection employeeId={employeeData.id} />
      </div>

      <EmploymentDetailsModal
        isOpen={isEmploymentModalOpen}
        onClose={() => setIsEmploymentModalOpen(false)}
        employeeId={employeeData?.id || ''}
        initialData={{
          employeeId: employeeData?.employeeId || '',
          department: 'Engineering',
          position: 'Software Engineer',
          joinedDate: employeeData?.createdAt || '',
          employmentHistory: [
            {
              title: 'Senior Developer',
              date: 'Jan 2023',
              description: 'Promoted to Senior Developer role',
              type: 'promotion'
            },
            {
              title: 'Developer',
              date: 'Jan 2022',
              description: 'Joined as Developer',
              type: 'join'
            }
          ]
        }}
        onUpdate={handleUpdateEmployment}
      />

      <PersonalDetailsEditModal
        isOpen={isPersonalModalOpen}
        onClose={() => setIsPersonalModalOpen(false)}
        data={personalData}
        employeeId={employeeData.id}
        onUpdate={handleUpdatePersonal}
      />
    </div>
  );
};
