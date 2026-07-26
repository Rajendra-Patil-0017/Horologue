import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ScrollFrameCanvas } from './ScrollFrameCanvas';

const Hero: React.FC = () => {
  const { scrollY } = useScroll();
  const sectionRef = useRef<HTMLElement>(null);
  
  // Parallax effects
  const yText = useTransform(scrollY, [0, 1000], [0, 400]);
  const opacityText = useTransform(scrollY, [0, 400], [1, 0]);
  const scaleBg = useTransform(scrollY, [0, 1000], [1, 1.2]);

  return (
    <section ref={sectionRef} style={{ position: 'relative', height: '120vh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Abstract WebGL-like background */}
      <motion.div 
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, #1a1a1a 0%, #0a0a0a 100%)',
          scale: scaleBg,
          zIndex: -1
        }}
      >
        <div style={{ position: 'absolute', inset: 0, opacity: 0.9 }}>
          <ScrollFrameCanvas containerRef={sectionRef} />
        </div>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(10,10,10,0.2) 0%, rgba(10,10,10,1) 100%)'
        }} />
      </motion.div>

      <motion.div 
        style={{ y: yText, opacity: opacityText, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}
      >
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="technical-text"
        >
          Calibre 01 · Hand-Wound
        </motion.p>
        
        <motion.h1 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ fontSize: '7vw', lineHeight: 1, color: 'var(--color-white)', whiteSpace: 'nowrap' }}
        >
          TIME <span style={{ color: 'var(--color-gold)', fontStyle: 'italic' }}>REFINED.</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          style={{ fontSize: '1.25rem', color: 'var(--color-slate)', maxWidth: '500px', fontWeight: 300 }}
        >
          A Legacy of Mechanical Perfection. Forged in obsidian, finished in brushed gold.
        </motion.p>
        
        <motion.button 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="ingot-btn"
          style={{ marginTop: '2rem' }}
          onClick={() => {
            const el = document.getElementById('collection');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          Explore Collection
        </motion.button>
      </motion.div>
    </section>
  );
};

export default Hero;
