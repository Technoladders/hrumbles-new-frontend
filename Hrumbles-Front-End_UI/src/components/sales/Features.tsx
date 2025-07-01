
import React from "react";
import { Check, Code, Layout, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    title: "Responsive Design",
    description: "Fully responsive layout that looks great on any device, from mobile to desktop.",
    icon: Layout,
  },
  {
    title: "Modern Stack",
    description: "Built with React, TypeScript, and Tailwind CSS for a modern development experience.",
    icon: Code,
  },
  {
    title: "Easy to Customize",
    description: "Simple, clean code structure that's easy to understand and modify for your needs.",
    icon: Settings,
  },
  {
    title: "Ready to Go",
    description: "Start building your application right away with this solid foundation.",
    icon: Check,
  },
];

const Features = () => {
  return (
    <section id="features" className="py-16 md:py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Features</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Everything you need to get started with your next web application project.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
