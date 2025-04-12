
import { useEffect, useRef } from 'react';

export const useAnimateInView = (options = {}) => {
  const ref = useRef<HTMLElement>(null);
  
  useEffect(() => {
    const currentRef = ref.current;
    
    if (!currentRef) return;
    
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-up');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      ...options
    });
    
    observer.observe(currentRef);
    
    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [options]);
  
  return ref;
};

export const useStaggeredAnimation = (selector: string, delay = 0.05) => {
  useEffect(() => {
    const elements = document.querySelectorAll(selector);
    
    elements.forEach((el, i) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.opacity = '0';
      htmlEl.style.transform = 'translateY(10px)';
      htmlEl.style.transition = `opacity 0.5s ease, transform 0.5s ease`;
      htmlEl.style.transitionDelay = `${i * delay}s`;
      
      setTimeout(() => {
        htmlEl.style.opacity = '1';
        htmlEl.style.transform = 'translateY(0)';
      }, 100);
    });
    
    return () => {
      elements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.opacity = '';
        htmlEl.style.transform = '';
        htmlEl.style.transition = '';
        htmlEl.style.transitionDelay = '';
      });
    };
  }, [selector, delay]);
};
