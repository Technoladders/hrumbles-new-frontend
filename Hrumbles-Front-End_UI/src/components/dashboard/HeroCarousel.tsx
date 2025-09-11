import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export interface CarouselSlide {
    title: string;
    value: string;
    description?: string;
    icon: React.ReactNode;
    theme?: {
        gradient: string;
    };
}

interface HeroCarouselProps {
    slides: CarouselSlide[];
    isLoading: boolean;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ slides, isLoading }) => {
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        if (slides.length <= 1) return;
        const interval = setInterval(() => {
            setActiveIndex((current) => (current + 1) % slides.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [slides.length]);

    if (isLoading) {
        return (
            <Card className="lg:col-span-1 bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin"/>
            </Card>
        );
    }
    
    // --- START OF CHANGES ---

    // The main Card is now just a positioning container, with no background of its own.
 return (
        <Card className="lg:col-span-1 shadow-lg relative h-full overflow-hidden p-0">
            <div className="flex transition-transform duration-700 ease-in-out h-full" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
                {slides.map((slide, index) => (
                    // MODIFIED:
                    // 1. Changed justify-between to justify-center to vertically center the content.
                    // 2. Removed the inner wrapping div and the empty div for a cleaner structure.
                    <div 
                        key={index} 
                        className={`w-full flex-shrink-0 text-white flex flex-col justify-center p-6 ${slide.theme?.gradient || 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}
                    >
                        <CardHeader className="p-0 pb-4"><CardTitle className="text-xl">{slide.title}</CardTitle></CardHeader>
                        <CardContent className="p-0 flex items-center justify-between">
                            <div>
                                <p className="text-3xl font-bold">{slide.value}</p>
                                {slide.description && <p className="text-lg opacity-90">{slide.description}</p>}
                            </div>
                            <div className="opacity-30 relative bottom-20">{slide.icon}</div>
                        </CardContent>
                    </div>
                ))}
            </div>
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setActiveIndex(index)}
                        className={`h-2 w-2 rounded-full transition-colors ${activeIndex === index ? 'bg-white' : 'bg-white/50 hover:bg-white/75'}`}
                    />
                ))}
            </div>
        </Card>
    );

    // --- END OF CHANGES ---
};