import React, { useState, useEffect } from 'react';
import TechnoladdersLogo from '../../assets/technoladders Logo.png';
import { Button } from '@/components/careerPage/ui/button';
import { X, Menu } from 'lucide-react';
import '../../careerpage.css'

const Header: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'py-3 glass shadow-sm' : 'py-5 bg-transparent'
      }`}
    >
      <div className=" flex items-center justify-between">
        <div className="flex items-center gap-2 transition-transform duration-300 hover:scale-105">
          <img
            src={TechnoladdersLogo}
            alt="Technoladders Logo"
            width="230"
            height="180"
            className="object-contain"
          />
          {/* Optional: Add text like the original if desired */}
          {/* <span className="font-semibold text-lg tracking-tight">Technoladders</span> */}
        </div>

        {/* Mobile Menu Button - keeping the button for UI consistency */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>

        {/* Mobile Navigation - empty but keeping for UI consistency */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 top-[60px] glass z-40 md:hidden animate-fade-in">
            <nav className="flex flex-col items-center gap-6 p-8">
              {/* Navigation items removed as requested */}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;