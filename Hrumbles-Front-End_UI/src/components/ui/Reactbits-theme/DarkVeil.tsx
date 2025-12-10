import { useRef, useEffect } from 'react';
import { Renderer, Program, Mesh, Triangle, Vec2 } from 'ogl';

// A smooth, flowing noise shader (Aurora style)
const vertex = `
attribute vec2 position;
void main() {
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `
#ifdef GL_ES
precision highp float;
#endif

uniform float uTime;
uniform vec2 uResolution;

// Simple noise function
float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(fract(sin(dot(i, vec3(1.0, 57.0, 113.0))) * 43758.5453),
                       fract(sin(dot(i + vec3(1.0, 0.0, 0.0), vec3(1.0, 57.0, 113.0))) * 43758.5453), f.x),
                   mix(fract(sin(dot(i + vec3(0.0, 1.0, 0.0), vec3(1.0, 57.0, 113.0))) * 43758.5453),
                       fract(sin(dot(i + vec3(1.0, 1.0, 0.0), vec3(1.0, 57.0, 113.0))) * 43758.5453), f.x), f.y),
               mix(mix(fract(sin(dot(i + vec3(0.0, 0.0, 1.0), vec3(1.0, 57.0, 113.0))) * 43758.5453),
                       fract(sin(dot(i + vec3(1.0, 0.0, 1.0), vec3(1.0, 57.0, 113.0))) * 43758.5453), f.x),
                   mix(fract(sin(dot(i + vec3(0.0, 1.0, 1.0), vec3(1.0, 57.0, 113.0))) * 43758.5453),
                       fract(sin(dot(i + vec3(1.0, 1.0, 1.0), vec3(1.0, 57.0, 113.0))) * 43758.5453), f.x), f.y), f.z);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / uResolution.xy;
    
    // Create moving coordinates for noise
    float time = uTime * 0.5;
    vec3 p = vec3(uv * 3.0, time);
    
    // Generate noise layers
    float n1 = noise(p);
    float n2 = noise(p + vec3(5.0, 2.0, 1.0));
    
    // Mix colors based on noise
    // Color Palette: Deep Black/Blue -> Purple -> Bright Violet
    vec3 color1 = vec3(0.0, 0.0, 0.05); // Deep dark background
    vec3 color2 = vec3(0.2, 0.0, 0.4);  // Dark Purple
    vec3 color3 = vec3(0.46, 0.19, 0.91); // #7731E8 (Brand Purple)
    
    float mix1 = smoothstep(0.2, 0.8, n1);
    float mix2 = smoothstep(0.3, 0.9, n2 * n1);
    
    vec3 finalColor = mix(color1, color2, mix1);
    finalColor = mix(finalColor, color3, mix2);
    
    // Add subtle vignette
    float vignette = 1.0 - length(uv - 0.5) * 0.5;
    finalColor *= vignette;

    fragColor = vec4(finalColor, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

export default function DarkVeil() {
  const ref = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const parent = canvas.parentElement;

    const renderer = new Renderer({
      dpr: Math.min(window.devicePixelRatio, 2),
      canvas,
      alpha: false // Opaque background for performance
    });

    const gl = renderer.gl;
    const geometry = new Triangle(gl);

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new Vec2() }
      }
    });

    const mesh = new Mesh(gl, { geometry, program });

    const resize = () => {
      if (!parent) return;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      renderer.setSize(w, h);
      program.uniforms.uResolution.value.set(w, h);
    };

    window.addEventListener('resize', resize);
    resize();

    let animateId: number;
    const update = (t: number) => {
      animateId = requestAnimationFrame(update);
      program.uniforms.uTime.value = t * 0.001;
      renderer.render({ scene: mesh });
    };
    animateId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animateId);
      window.removeEventListener('resize', resize);
      // Optional: Clean up GL context if needed
    };
  }, []);
  
  return <canvas ref={ref} className="w-full h-full block" />;
}