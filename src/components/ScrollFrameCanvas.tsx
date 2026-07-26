import React, { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Chosen pin duration mapped to the scroll sequence. Documented here for easy tuning.
const PIN_SCROLL_MULTIPLIER = 5; // 5 = 500vh of scroll distance

interface ScrollFrameCanvasProps {
  containerRef: React.RefObject<HTMLElement | null>;
}

export const ScrollFrameCanvas: React.FC<ScrollFrameCanvasProps> = ({ containerRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const targetFrameRef = useRef({ val: 0 });
  const lastDrawnFrameRef = useRef(-1);
  const [frames, setFrames] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Detect extension and load manifest.json
  useEffect(() => {
    let active = true;

    const initManifest = async () => {
      // Probe to find correct extension if we fall back
      const extensions = ['.jpg', '.png', '.jpeg', '.webp'];
      let ext = '.jpg';
      for (const e of extensions) {
        try {
          const response = await fetch(`/frames/frame0001${e}`, { method: 'HEAD' });
          if (response.ok) {
            ext = e;
            break;
          }
        } catch {
          // Ignore probe failure
        }
      }

      if (!active) return;

      try {
        const response = await fetch('/frames/manifest.json');
        if (!response.ok) {
          throw new Error(`Failed to fetch manifest: ${response.statusText}`);
        }
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          if (active) setFrames(data);
        } else {
          throw new Error('Manifest is empty or not an array');
        }
      } catch (err) {
        console.warn(
          'manifest.json is missing, empty, or invalid. Falling back to probing frame0001 through frame0201.',
          err
        );
        // Fallback: build standard 201 frame array
        const fallbackFrames: string[] = [];
        for (let i = 1; i <= 201; i++) {
          const padded = String(i).padStart(4, '0');
          fallbackFrames.push(`frame${padded}${ext}`);
        }
        if (active) setFrames(fallbackFrames);
      }
    };

    initManifest();
    return () => {
      active = false;
    };
  }, []);

  // 2. Preload first frame, then the rest in the background
  useEffect(() => {
    if (frames.length === 0) return;

    let active = true;
    const total = frames.length;
    imagesRef.current = new Array(total).fill(null);

    // Get URL helper
    const getUrl = (idx: number) => {
      const isFallback = frames[idx].startsWith('frame');
      if (isFallback) {
        return `/frames/${frames[idx]}`;
      }
      return `/frames/${frames[idx]}`;
    };

    // Load first frame immediately
    const firstImg = new Image();
    firstImg.src = getUrl(0);
    firstImg.onload = async () => {
      if (!active) return;
      try {
        if ('decode' in firstImg) {
          await firstImg.decode();
        }
      } catch {
        // Fallback if decode fails
      }
      imagesRef.current[0] = firstImg;
      setIsLoaded(true); // Signal that at least frame 0 is ready to draw

      // Background loading of remaining frames in small batches
      const batchSize = 10;
      for (let i = 1; i < total && active; i += batchSize) {
        const promises: Promise<void>[] = [];
        for (let j = i; j < Math.min(i + batchSize, total) && active; j++) {
          const img = new Image();
          img.src = getUrl(j);
          const p = new Promise<void>((resolve) => {
            img.onload = async () => {
              try {
                if ('decode' in img) {
                  await img.decode();
                }
              } catch {
                // Ignore decoding error
              }
              if (active) imagesRef.current[j] = img;
              resolve();
            };
            img.onerror = () => {
              console.error(`Failed to load frame at index ${j}: ${img.src}`);
              resolve();
            };
          });
          promises.push(p);
        }
        await Promise.all(promises);
      }
    };

    firstImg.onerror = () => {
      console.error(`Failed to load initial frame 1: ${firstImg.src}`);
    };

    return () => {
      active = false;
    };
  }, [frames]);

  // 3. Canvas rendering and resize logic
  const drawFrameRef = useRef<(index: number) => void>(() => {});
  
  useEffect(() => {
    if (!isLoaded || frames.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const getClosestLoadedFrame = (targetIndex: number): HTMLImageElement | null => {
      const images = imagesRef.current;
      const total = frames.length;
      if (images[targetIndex]) return images[targetIndex];

      let left = targetIndex - 1;
      let right = targetIndex + 1;
      while (left >= 0 || right < total) {
        if (left >= 0 && images[left]) return images[left];
        if (right < total && images[right]) return images[right];
        left--;
        right++;
      }
      return null;
    };

    const drawFrame = (frameIndex: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = getClosestLoadedFrame(frameIndex);
      if (!img) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      // Adjust backing store size if it mismatch
      const expectedWidth = Math.round(rect.width * dpr);
      const expectedHeight = Math.round(rect.height * dpr);

      if (canvas.width !== expectedWidth || canvas.height !== expectedHeight) {
        canvas.width = expectedWidth;
        canvas.height = expectedHeight;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      // Cover scaling helper
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      const r = Math.min(w / iw, h / ih);
      let nw = iw * r;
      let nh = ih * r;

      if (nw < w) {
        const scale = w / nw;
        nw *= scale;
        nh *= scale;
      }
      if (nh < h) {
        const scale = h / nh;
        nw *= scale;
        nh *= scale;
      }

      const cx = iw * 0.5;
      const cy = ih * 0.5;

      let cw = iw / (nw / w);
      let ch = ih / (nh / h);

      if (cw > iw) cw = iw;
      if (ch > ih) ch = ih;

      const sx = Math.max(0, cx - cw * 0.5);
      const sy = Math.max(0, cy - ch * 0.5);

      ctx.drawImage(img, sx, sy, cw, ch, 0, 0, w, h);
      ctx.restore();
    };

    drawFrameRef.current = drawFrame;

    // Draw initial frame
    drawFrame(0);

    // Setup resize listener
    const handleResize = () => {
      drawFrame(Math.round(targetFrameRef.current.val));
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isLoaded, frames]);

  // 4. RequestAnimationFrame draw loop
  useEffect(() => {
    if (!isLoaded || frames.length === 0) return;

    let rafId: number;
    const tick = () => {
      const targetVal = targetFrameRef.current.val;
      const rounded = Math.min(frames.length - 1, Math.max(0, Math.round(targetVal)));

      if (rounded !== lastDrawnFrameRef.current) {
        if (drawFrameRef.current) {
          drawFrameRef.current(rounded);
        }
        lastDrawnFrameRef.current = rounded;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isLoaded, frames]);

  // 5. GSAP ScrollTrigger configuration
  useGSAP(() => {
    if (!isLoaded || frames.length === 0 || !containerRef.current) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      // Force static first frame and bypass ScrollTrigger
      targetFrameRef.current.val = 0;
      return;
    }

    const total = frames.length;

    // Create ScrollTrigger & smooth scrubber tween
    const tween = gsap.to(targetFrameRef.current, {
      val: total - 1,
      ease: 'none',
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: () => `+=${window.innerHeight * PIN_SCROLL_MULTIPLIER}`,
        pin: true,
        scrub: 2, // 2 seconds smoothing for cinematic video scrub feel
        invalidateOnRefresh: true,
      },
    });

    // Synchronize Lenis if available globally
    const lenis = (window as any).lenis;
    const handleScroll = () => {
      ScrollTrigger.update();
    };

    if (lenis) {
      lenis.on('scroll', handleScroll);
    }

    return () => {
      tween.kill();
      if (tween.scrollTrigger) {
        tween.scrollTrigger.kill();
      }
      if (lenis) {
        lenis.off('scroll', handleScroll);
      }
    };
  }, { dependencies: [isLoaded, frames, containerRef] });

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      }}
    />
  );
};
