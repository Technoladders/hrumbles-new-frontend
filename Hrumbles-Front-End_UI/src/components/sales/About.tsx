
import React from "react";

const About = () => {
  return (
    <section id="about" className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">About This Template</h2>
            <div className="h-1 w-20 bg-primary mx-auto"></div>
          </div>

          <div className="prose max-w-none">
            <p className="text-lg mb-6">
              This blank project template provides you with a clean, modern starting point for your web application. 
              Built with React, TypeScript, and Tailwind CSS, it includes all the essentials without any 
              unnecessary bloat.
            </p>

            <p className="text-lg mb-6">
              The template includes a responsive navigation, hero section, features section, and more - all 
              designed to be easily customizable to match your project's needs. Simply replace the placeholder 
              content with your own, adjust the styling, and you're ready to go!
            </p>

            <p className="text-lg">
              Whether you're building a personal portfolio, business website, or web application, this blank 
              template gives you a solid foundation to build upon.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
