
import React from "react";
import Navbar from "@/components/sales/Navbar";
import Hero from "@/components/sales/Hero";
import Features from "@/components/sales/Features";
import About from "@/components/sales/About";
import Footer from "@/components/sales/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Building2 } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <div className="container mx-auto py-10 text-center">
          <h2 className="text-2xl font-bold mb-6">Explore Our Data</h2>
          <Button asChild size="lg" className="gap-2">
            <Link to="/companies">
              <Building2 className="h-5 w-5" />
              View Companies
            </Link>
          </Button>
        </div>
        <Features />
        <About />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
