
import React from "react";
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="relative pt-20 pb-16">
      <div className="gradient-bg absolute top-0 left-0 right-0 bottom-0 opacity-70 -z-10"></div>
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center hero-text">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Welcome to Your Blank Project
          </h1>
          <p className="text-lg md:text-xl text-gray-700 mb-8">
            A clean, modern foundation to build your next amazing web application.
            Start customizing and make it your own.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="px-6">
              Get Started
            </Button>
            <Button variant="outline" size="lg" className="px-6">
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
