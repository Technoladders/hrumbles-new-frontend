import React, { useState, useEffect } from 'react';
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
      <div className="flex items-center justify-between px-4">
        {/* Logo removed - you can add company name here if needed */}
        <div className="flex items-center gap-2">
          {/* Optional: Add dynamic company name */}
          {/* <span className="font-semibold text-lg tracking-tight">Company Name</span> */}
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 top-[60px] glass z-40 md:hidden animate-fade-in">
            <nav className="flex flex-col items-center gap-6 p-8">
              {/* Navigation items can be added here if needed */}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;