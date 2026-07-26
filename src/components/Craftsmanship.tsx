import React from 'react';
import { motion } from 'framer-motion';

const Craftsmanship: React.FC = () => {
  return (
    <section id="craft" style={{ padding: '10rem 4rem', background: 'var(--color-obsidian)', position: 'relative' }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8rem', alignItems: 'center' }}>
        
        {/* Left Side: Text */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-20%" }}
            transition={{ duration: 1 }}
          >
            <span className="technical-text" style={{ color: 'var(--color-gold)' }}>Phase 01</span>
            <h2 style={{ fontSize: '4rem', lineHeight: 1.1, marginTop: '1rem', color: 'var(--color-white)' }}>
              PRECISION <br/>
              <span style={{ color: 'var(--color-charcoal)', WebkitTextStroke: '1px var(--color-platinum)' }}>ENGINEERING</span>
            </h2>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-20%" }}
            transition={{ duration: 1, delay: 0.2 }}
            style={{ fontSize: '1.125rem', color: 'var(--color-slate)', lineHeight: 1.8 }}
          >
            The Calibre 01 is an in-house masterpiece comprising 324 individual components. 
            Each bridge is hand-beveled, every screw mirror-polished. It operates at 28,800 
            vibrations per hour, ensuring unparalleled chronometric performance.
          </motion.p>

          {/* Specs List */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-20%" }}
            transition={{ duration: 1, delay: 0.4 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '2rem' }}
          >
            {[
              { label: 'Movement', value: 'Manual-winding Calibre 01' },
              { label: 'Power Reserve', value: '72 Hours' },
              { label: 'Jewels', value: '45 Rubies' },
              { label: 'Frequency', value: '4 Hz (28,800 vph)' }
            ].map((spec, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ fontFamily: 'var(--font-body)', color: 'var(--color-white)' }}>{spec.label}</span>
                <span className="technical-text">{spec.value}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right Side: Visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ position: 'relative', aspectRatio: '4/5', background: 'var(--color-charcoal)', border: '1px solid var(--color-border)' }}
        >
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            <img 
              src="https://images.unsplash.com/photo-1594897030264-ab7d87efc473?q=80&w=1000&auto=format&fit=crop" 
              alt="Watch Movement Gears" 
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8, filter: 'grayscale(100%) contrast(1.2)' }}
            />
            {/* Subtle overlay gradient */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(45deg, rgba(10,10,10,0.8) 0%, transparent 100%)' }} />
          </div>
          <div style={{ position: 'absolute', bottom: '2rem', right: '2rem' }}>
            <span className="technical-text">FIG. 1 / CALIBRE 01</span>
          </div>
        </motion.div>

      </div>
    </section>
  );
};

export default Craftsmanship;
