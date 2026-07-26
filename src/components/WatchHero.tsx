import React, { useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Float, Sparkles, ContactShadows } from '@react-three/drei';
import WatchModel from './WatchModel';
import { watchStages } from './watchStages';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const WatchHero: React.FC = () => {
  const progressRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // 1. Top Progress Bar Animation
    gsap.to(progressRef.current, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: '#hero-scroll-container',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.1
      }
    });

    // 2. Master UX Timeline tied to the exact 13 stages of the WatchModel
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#hero-scroll-container',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
      }
    });

    // Match the timing of WatchModel (0 -> 13)
    watchStages.forEach((_, i) => {
       const time = i + 1;
       
       // Fade in current text and image
       tl.to(`.stage-text-${i}`, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, time - 0.2);
       tl.to(`.stage-img-${i}`, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, time - 0.2);
       
       // Update the 01/13 Counter dynamically
       tl.call(() => {
         if (counterRef.current) {
           counterRef.current.innerText = `${String(i + 1).padStart(2, '0')} / 13`;
         }
       }, [], time - 0.2);

       // Fade out when scrolling to next stage (unless it's the last one)
       if (i < 12) {
         tl.to(`.stage-text-${i}`, { opacity: 0, y: -20, duration: 0.3, ease: 'power2.in' }, time + 0.7);
         tl.to(`.stage-img-${i}`, { opacity: 0, y: -20, duration: 0.3, ease: 'power2.in' }, time + 0.7);
       }
    });

    // Initial state: ensure first text is visible at scroll 0
    gsap.set('.stage-text-0', { opacity: 1, y: 0 });
    gsap.set('.stage-img-0', { opacity: 1, y: 0 });

  }, { dependencies: [] });

  return (
    <section id="hero-scroll-container" style={{ position: 'relative', height: '1400vh', background: 'var(--color-obsidian)' }}>
      
      {/* Sticky container that holds the Canvas and DOM UI */}
      <div style={{ position: 'sticky', top: 0, height: '100vh', width: '100%', overflow: 'hidden' }}>
        
        {/* Progress Bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', zIndex: 20 }}>
           <div ref={progressRef} style={{ width: '100%', height: '100%', background: 'var(--color-gold)', transformOrigin: 'left', transform: 'scaleX(0)' }} />
        </div>

        {/* Step Counter */}
        <div style={{ position: 'absolute', top: '2rem', right: '2rem', zIndex: 20, fontFamily: 'var(--font-technical)', color: 'var(--color-gold)', fontSize: '1rem', letterSpacing: '0.2em' }}>
           <span ref={counterRef}>01 / 13</span>
        </div>

        {/* Cinematic WebGL Background Elements */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, #1a1a1a 0%, #050505 100%)', zIndex: 0 }} />

        {/* DOM UX Text Overlay - Left Aligned */}
        <div style={{ position: 'absolute', top: '45%', left: '10%', transform: 'translateY(-50%)', zIndex: 10, pointerEvents: 'none' }}>
          {watchStages.map((stage, i) => (
             <div key={`text-${stage.id}`} className={`stage-text-${i}`} style={{ position: 'absolute', top: 0, left: 0, opacity: 0, transform: 'translateY(20px)', width: '350px' }}>
                <p style={{ fontFamily: 'var(--font-technical)', color: 'var(--color-gold)', fontSize: '0.875rem', letterSpacing: '0.2em', margin: '0 0 0.5rem 0' }}>
                  {stage.badge}
                </p>
                <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-white)', fontSize: '2.5rem', lineHeight: 1.1, margin: '0 0 1rem 0', textTransform: 'uppercase' }}>
                  {stage.title}
                </h2>
                
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                  <p style={{ fontFamily: 'var(--font-technical)', color: 'var(--color-silver)', fontSize: '0.9rem', letterSpacing: '0.1em', margin: 0 }}>
                    {stage.specs}
                  </p>
                </div>
             </div>
          ))}
        </div>

        {/* DOM UX Image Overlay - Right Aligned */}
        <div style={{ position: 'absolute', top: '45%', right: '10%', transform: 'translateY(-50%)', zIndex: 10, pointerEvents: 'none' }}>
          {watchStages.map((stage, i) => (
             <div key={`img-${stage.id}`} className={`stage-img-${i}`} style={{ position: 'absolute', top: 0, right: 0, opacity: 0, transform: 'translateY(20px)', width: '350px' }}>
                <div style={{ width: '100%', height: '250px', overflow: 'hidden', borderRadius: '8px', border: '1px solid rgba(212, 175, 55, 0.3)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                  <img src={stage.image} alt={stage.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
             </div>
          ))}
        </div>

        {/* WebGL Canvas */}
        <Canvas camera={{ position: [0, 0, 10], fov: 45 }} style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
          <pointLight position={[-10, -10, -10]} intensity={1} color="#d4af37" />
          
          <Float speed={2} rotationIntensity={0.1} floatIntensity={0.3}>
            <Suspense fallback={null}>
              <WatchModel />
            </Suspense>
          </Float>

          <Sparkles count={100} scale={10} size={2} speed={0.4} opacity={0.2} color="#d4af37" />
          <ContactShadows position={[0, -4, 0]} opacity={0.4} scale={20} blur={2} far={10} />
          
          <Environment preset="studio" />
        </Canvas>
      </div>
    </section>
  );
};

export default WatchHero;
