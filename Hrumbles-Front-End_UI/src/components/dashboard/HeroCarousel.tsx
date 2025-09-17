// src/components/dashboard/HeroCarousel.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Card } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Loader2 } from 'lucide-react';
import Autoplay from "embla-carousel-autoplay";
import { type EmblaCarouselType } from 'embla-carousel-react';

export interface CarouselSlide {
  content: React.ReactNode;
  gradient: string;
}

const DotButton = ({ selected, onClick }) => (
  <button
    className={`h-2 w-2 rounded-full transition-all duration-300 ${selected ? 'w-4 bg-white' : 'bg-white/50'}`}
    type="button"
    onClick={onClick}
  />
);

export const HeroCarousel = ({ slides, isLoading }) => {
  const [emblaApi, setEmblaApi] = useState<EmblaCarouselType | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect) };
  }, [emblaApi, onSelect]);

  if (isLoading) {
    return (
      <Card className="shadow-lg border-none flex items-center justify-center h-[230px] lg:col-span-1">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500"/>
      </Card>
    );
  }

  if (!slides || slides.length === 0) {
    return (
      <Card className="shadow-lg border-none flex items-center justify-center h-[230px] lg:col-span-1 bg-gradient-to-br from-gray-500 to-gray-600">
        <p className="text-white font-semibold">No highlights to display.</p>
      </Card>
    );
  }

  return (
     <Card className="shadow-lg border-none p-0 overflow-hidden min-h-[230px] lg:col-span-1 relative flex flex-col">
            <Carousel 
                className="w-full flex-grow" // Add flex-grow to fill the available space
                plugins={[Autoplay({ delay: 5000, stopOnInteraction: true })]}
                setApi={setEmblaApi}
            >
                <CarouselContent className="h-full">
                    {slides.map((slide, index) => (
                        <CarouselItem key={index} className="h-full p-0">
                            <div className={`h-full w-full ${slide.gradient}`}>
                                <div className="h-[280px] p-4 flex flex-col"> {/* Add flex and flex-col */}
                                    {slide.content}
                                </div>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>
      <div className="absolute bottom-3 left-0 right-0 flex justify-center items-center gap-2">
        {scrollSnaps.map((_, index) => (
          <DotButton
            key={index}
            selected={index === selectedIndex}
            onClick={() => scrollTo(index)}
          />
        ))}
      </div>
    </Card>
  );
};