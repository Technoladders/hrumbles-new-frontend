import React, { useMemo } from 'react';
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { HeroCarousel, CarouselSlide } from './HeroCarousel';
import { GreetingSlide, EventsSlide, CelebrationsSlide } from './DashboardCarouselSlides';

interface DashboardHeroCarouselProps {
  organizationId: string;
  employeeId?: string; // Optional: for employee-specific data
  user: any;
}

export const DashboardHeroCarousel: React.FC<DashboardHeroCarouselProps> = ({ organizationId, employeeId, user }) => {
  // The hook now receives the optional employeeId
  const { data: dashboardData, isLoading: dashboardDataLoading } = useDashboardData(organizationId, employeeId);

  const heroSlides: CarouselSlide[] = useMemo(() => {
    if (!dashboardData) return [];

     const { events, celebrations } = dashboardData;
    
    // --- START: Conditional Logic ---
    const hasEvents = events && events.length > 0;
    const hasCelebrations = celebrations && (
      celebrations.birthdays.length > 0 ||
      celebrations.anniversaries.length > 0 ||
      celebrations.newJoiners.length > 0
    );
  // If there are no events AND no celebrations, only show the greeting.
    if (!hasEvents && !hasCelebrations) {
      return [
        {
          content: <GreetingSlide user={user} />,
          gradient: 'bg-gradient-to-br from-purple-600 to-indigo-700',
        }
      ];
    }
    
    // Otherwise, build the full list of slides.
    const slides = [
      {
        content: <GreetingSlide user={user} />,
        gradient: 'bg-gradient-to-br from-purple-600 to-indigo-700',
      }
    ];

    if (hasEvents) {
      slides.push({
        content: <EventsSlide events={events} />,
        gradient: 'bg-gradient-to-br from-sky-500 to-blue-600',
      });
    }

    if (hasCelebrations) {
      slides.push({
        content: <CelebrationsSlide celebrations={celebrations} />,
        gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      });
    }
    
    return slides;
  }, [dashboardData]);

  return (
    <HeroCarousel 
      slides={heroSlides} 
      isLoading={dashboardDataLoading}
    />
  );
};