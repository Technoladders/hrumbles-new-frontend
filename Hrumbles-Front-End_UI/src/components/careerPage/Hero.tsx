
import React, { useState } from 'react';
import { Button } from '@/components/careerPage/ui/button';
import { Input } from '@/components/careerPage/ui/input';
import { Search, Briefcase, MapPin } from 'lucide-react';
import '../../careerpage.css'

interface HeroProps {
  onSearch: (searchTerm: string, location: string) => void;
}

const Hero: React.FC<HeroProps> = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [location, setLocation] = useState('');

  const handleSearch = () => {
    onSearch(searchTerm, location);
  };

  const handlePopularSearch = (term: string) => {
    setSearchTerm(term);
    onSearch(term, location);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <section className="relative overflow-hidden pt-32 pb-24 min-h-[90vh] flex flex-col justify-center">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-hrumbles-accent/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-hrumbles-accent/10 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />
      
      <div className="container relative">
        <div className="max-w-3xl mx-auto text-center">
          <div className="mb-6 inline-block">
            <span className="bg-hrumbles-accent/10 text-hrumbles-accent font-medium px-4 py-1.5 rounded-full text-sm">
              Hrumbles.ai Career Portal
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-hrumbles to-hrumbles-accent leading-tight">
            Find Your Dream Job <br /> 
            <span className="text-hrumbles">at Hrumbles.ai</span>
          </h1>
          
          <p className="text-hrumbles-muted text-lg md:text-xl mb-12 max-w-2xl mx-auto">
            Discover exciting career opportunities that match your skills and ambitions. 
            Join our team of innovators shaping the future.
          </p>
          
          <div className="flex flex-col md:flex-row gap-3 p-2 glass rounded-xl max-w-3xl mx-auto">
            <div className="flex-1 flex items-center gap-2 pl-3 md:pl-0 md:mx-3 rounded-lg">
              <Search size={20} className="text-hrumbles-muted flex-shrink-0" />
              <Input
                type="text"
                placeholder="Job title or keyword"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-hrumbles-muted/70 bg-transparent"
              />
            </div>
            
            <div className="flex-1 flex items-center gap-2 pl-3 md:pl-0 md:mx-3 rounded-lg">
              <MapPin size={20} className="text-hrumbles-muted flex-shrink-0" />
              <Input
                type="text"
                placeholder="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyPress={handleKeyPress}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-hrumbles-muted/70 bg-transparent"
              />
            </div>
            
            <Button 
              className="bg-hrumbles-accent hover:bg-hrumbles-accent/90 text-white button-hover group flex gap-2 items-center"
              onClick={handleSearch}
            >
              <span>Search Jobs</span>
              <Briefcase size={16} className="transition-transform group-hover:rotate-12" />
            </Button>
          </div>
          
          <div className="mt-8 text-sm text-hrumbles-muted flex items-center justify-center flex-wrap gap-x-8 gap-y-3">
            <span>Popular searches:</span>
            <button className="hover:text-hrumbles transition-colors" onClick={() => handlePopularSearch("AI Engineer")}>AI Engineer</button>
            <button className="hover:text-hrumbles transition-colors" onClick={() => handlePopularSearch("Data Scientist")}>Data Scientist</button>
            <button className="hover:text-hrumbles transition-colors" onClick={() => handlePopularSearch("UX Designer")}>UX Designer</button>
            <button className="hover:text-hrumbles transition-colors" onClick={() => handlePopularSearch("Product Manager")}>Product Manager</button>
          </div>
        </div>
      </div>
      
      {/* Scroll Indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce">
        <span className="text-sm text-hrumbles-muted mb-2">Scroll for jobs</span>
        <div className="w-0.5 h-6 bg-hrumbles-muted/30 rounded-full"></div>
      </div>
    </section>
  );
};

export default Hero;
