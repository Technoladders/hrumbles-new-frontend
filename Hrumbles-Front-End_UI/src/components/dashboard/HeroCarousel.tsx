import React, { useState, useEffect, useCallback } from 'react';
import { Card } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Loader2 } from 'lucide-react';
import Autoplay from "embla-carousel-autoplay";
import { type EmblaCarouselType } from 'embla-carousel-react';

export interface CarouselSlide {
  content: React.ReactNode;
  gradient: string;
}

const DotButton = ({ selected, onClick }: { selected: boolean; onClick: () => void }) => (
  <button
    className={`rounded-full transition-all duration-300 ${
      selected
        ? 'w-6 h-2 bg-white shadow-sm'
        : 'w-2 h-2 bg-white/40 hover:bg-white/60'
    }`}
    type="button"
    onClick={onClick}
  />
);

export const HeroCarousel = ({
  slides,
  isLoading,
}: {
  slides: CarouselSlide[];
  isLoading: boolean;
}) => {
  const [emblaApi, setEmblaApi] = useState<EmblaCarouselType | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  if (isLoading) {
    return (
      <Card className="shadow-md border-none flex items-center justify-center h-[200px] bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </Card>
    );
  }

  if (!slides || slides.length === 0) {
    return (
      <Card className="shadow-md border-none flex items-center justify-center h-[200px] bg-gradient-to-br from-slate-100 to-slate-200">
        <p className="text-gray-500 font-medium text-sm">No highlights to display.</p>
      </Card>
    );
  }

  return (
    <Card className="shadow-md border-none p-0 overflow-hidden relative">
      <Carousel
        className="w-full"
        plugins={[Autoplay({ delay: 6000, stopOnInteraction: true })]}
        setApi={setEmblaApi}
      >
        <CarouselContent>
          {slides.map((slide, index) => (
            <CarouselItem key={index} className="p-0">
              <div className={`w-full ${slide.gradient} relative overflow-hidden`}>
                {/* Subtle decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/4" />
                <div className="absolute top-1/2 right-1/4 w-32 h-32 rounded-full bg-white/[0.03]" />
                
                <div className="relative z-10 h-[200px] p-5 flex flex-col">
                  {slide.content}
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Dot indicators */}
      {scrollSnaps.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center items-center gap-1.5">
          {scrollSnaps.map((_, index) => (
            <DotButton
              key={index}
              selected={index === selectedIndex}
              onClick={() => scrollTo(index)}
            />
          ))}
        </div>
      )}
    </Card>
  );
};