import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text, useTexture } from '@react-three/drei';

gsap.registerPlugin(ScrollTrigger);

const WatchModel: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  
  const strapBottomRef = useRef<THREE.Mesh>(null);
  const strapTopRef = useRef<THREE.Mesh>(null);
  const caseRef = useRef<THREE.Group>(null);
  const crownRef = useRef<THREE.Group>(null);
  const casebackRef = useRef<THREE.Group>(null);
  const gasketRef = useRef<THREE.Mesh>(null);
  const bezelRef = useRef<THREE.Group>(null);
  const crystalRef = useRef<THREE.Mesh>(null);
  const dialRef = useRef<THREE.Mesh>(null);
  const movementRef = useRef<THREE.Group>(null);
  const rotorRef = useRef<THREE.Mesh>(null);
  const handsRef = useRef<THREE.Group>(null);
  const dateRef = useRef<THREE.Group>(null);

  const escapeWheelRef = useRef<THREE.Mesh>(null);

  // Load high-res textures to make the geometry photorealistic
  const dialTexture = useTexture('https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=1000&auto=format&fit=crop');
  const movementTexture = useTexture('https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?q=80&w=1000&auto=format&fit=crop');
  
  dialTexture.wrapS = THREE.RepeatWrapping;
  dialTexture.wrapT = THREE.RepeatWrapping;

  useFrame((state) => {
    if (escapeWheelRef.current) {
      // 28,800 vph = 8 ticks per second
      escapeWheelRef.current.rotation.z = Math.floor(state.clock.elapsedTime * 8) * (Math.PI / 16);
    }
  });

  useGSAP(() => {
    const allRefs = [
      strapBottomRef, strapTopRef, caseRef, crownRef, casebackRef, 
      gasketRef, bezelRef, crystalRef, dialRef, movementRef, 
      rotorRef, handsRef, dateRef
    ];

    const setOpacity = (targetRef: any, alpha: number) => {
      if (!targetRef.current) return;
      targetRef.current.traverse((child: any) => {
        if (child.isMesh && child.material) {
          child.material.transparent = true;
          gsap.to(child.material, { opacity: alpha, duration: 0.4, ease: 'power2.out' });
        }
      });
    };

    const highlightStage = (index: number) => {
      allRefs.forEach((ref, i) => {
        setOpacity(ref, i === index ? 1 : 0.22);
      });
    };

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#hero-scroll-container',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
      }
    });

    // 0. Base initial explosion
    tl.to(casebackRef.current!.position, { z: -1.0 }, 0)
      .to(rotorRef.current!.position, { z: -0.8 }, 0)
      .to(movementRef.current!.position, { z: -0.4 }, 0)
      .to(dialRef.current!.position, { z: 0.4 }, 0)
      .to(dateRef.current!.position, { z: 0.45 }, 0)
      .to(handsRef.current!.position, { z: 0.5 }, 0)
      .to(bezelRef.current!.position, { z: 0.8 }, 0)
      .to(crystalRef.current!.position, { z: 1.2 }, 0)
      .to(strapTopRef.current!.position, { y: 2.5 }, 0)
      .to(strapBottomRef.current!.position, { y: -2.5 }, 0);

    const stages = [
      { rotY: 0, rotX: Math.PI / 4 },           // 0: bottom strap
      { rotY: 0, rotX: -Math.PI / 4 },          // 1: top strap
      { rotY: 0, rotX: 0 },                     // 2: case
      { rotY: -Math.PI / 4, rotX: 0 },          // 3: crown
      { rotY: Math.PI, rotX: 0 },               // 4: caseback
      { rotY: Math.PI / 4, rotX: Math.PI / 6 }, // 5: gasket
      { rotY: 0, rotX: Math.PI / 8 },           // 6: bezel
      { rotY: 0, rotX: Math.PI / 2 },           // 7: crystal profile
      { rotY: 0, rotX: 0 },                     // 8: dial
      { rotY: Math.PI / 6, rotX: Math.PI / 8 }, // 9: movement
      { rotY: Math.PI, rotX: 0 },               // 10: rotor
      { rotY: 0, rotX: 0 },                     // 11: hands
      { rotY: -Math.PI / 8, rotX: 0 },          // 12: date
    ];

    stages.forEach((stage, i) => {
      const time = (i + 1);
      
      tl.to(groupRef.current!.rotation, {
        y: stage.rotY,
        x: stage.rotX,
        duration: 1,
        ease: 'power2.inOut'
      }, time);

      tl.call(() => highlightStage(i), [], time);

      // Micro-animations
      if (i === 6) { // Bezel click 120 times
        tl.to(bezelRef.current!.rotation, { z: -Math.PI / 3, duration: 1, ease: `steps(40)` }, time);
      }
      if (i === 10) { // Rotor sweep
        tl.to(rotorRef.current!.rotation, { z: Math.PI * 1.5, duration: 1, ease: 'power1.inOut' }, time);
      }
      if (i === 11) { // Hands bloom 
        tl.to(handsRef.current!.position, { z: 0.6, duration: 0.5, yoyo: true, repeat: 1 }, time);
      }
    });

    // Initial highlight
    highlightStage(0);

  }, { dependencies: [] });

  return (
    <group ref={groupRef} rotation={[Math.PI / 2, 0, 0]}>
      {/* 0. Bottom Strap */}
      <mesh ref={strapBottomRef} position={[0, -2, -0.2]}>
        <planeGeometry args={[1.6, 3, 16, 16]} />
        <meshStandardMaterial color="#111" roughness={0.9} />
      </mesh>

      {/* 1. Top Strap */}
      <mesh ref={strapTopRef} position={[0, 2, -0.2]}>
        <planeGeometry args={[1.6, 3, 16, 16]} />
        <meshStandardMaterial color="#111" roughness={0.9} />
      </mesh>

      {/* 2. Gold Case with 4 Lugs */}
      <group ref={caseRef} position={[0, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[2.5, 2.5, 0.4, 64]} />
          <meshStandardMaterial color="#d4af37" metalness={1} roughness={0.2} />
        </mesh>
        {/* Lugs */}
        <mesh position={[-1.2, 2.4, 0]} rotation={[0, 0, Math.PI / 8]}>
          <boxGeometry args={[0.4, 1, 0.4]} />
          <meshStandardMaterial color="#d4af37" metalness={1} roughness={0.2} />
        </mesh>
        <mesh position={[1.2, 2.4, 0]} rotation={[0, 0, -Math.PI / 8]}>
          <boxGeometry args={[0.4, 1, 0.4]} />
          <meshStandardMaterial color="#d4af37" metalness={1} roughness={0.2} />
        </mesh>
        <mesh position={[-1.2, -2.4, 0]} rotation={[0, 0, -Math.PI / 8]}>
          <boxGeometry args={[0.4, 1, 0.4]} />
          <meshStandardMaterial color="#d4af37" metalness={1} roughness={0.2} />
        </mesh>
        <mesh position={[1.2, -2.4, 0]} rotation={[0, 0, Math.PI / 8]}>
          <boxGeometry args={[0.4, 1, 0.4]} />
          <meshStandardMaterial color="#d4af37" metalness={1} roughness={0.2} />
        </mesh>
      </group>

      {/* 3. Crown */}
      <group ref={crownRef} position={[2.6, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.3, 0.3, 0.4, 32]} />
          <meshStandardMaterial color="#d4af37" metalness={1} roughness={0.3} wireframe />
        </mesh>
      </group>

      {/* 4. Caseback */}
      <group ref={casebackRef} position={[0, 0, -0.2]}>
        <mesh>
          <ringGeometry args={[1.8, 2.4, 64]} />
          <meshStandardMaterial color="#aaa" metalness={0.8} roughness={0.2} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0,0,-0.01]}>
           <cylinderGeometry args={[1.8, 1.8, 0.02, 64]} />
           <meshPhysicalMaterial color="#fff" transmission={0.9} transparent opacity={1} roughness={0} />
        </mesh>
      </group>

      {/* 5. Gasket */}
      <mesh ref={gasketRef} position={[0, 0, 0.15]}>
        <torusGeometry args={[2.3, 0.05, 16, 64]} />
        <meshStandardMaterial color="#e74c3c" roughness={0.8} />
      </mesh>

      {/* 6. Bezel */}
      <group ref={bezelRef} position={[0, 0, 0.2]}>
        <mesh>
          <torusGeometry args={[2.4, 0.2, 16, 64]} />
          <meshStandardMaterial color="#111" metalness={0.5} roughness={0.4} />
        </mesh>
        {/* Pips */}
        {Array.from({ length: 12 }).map((_, i) => (
          <mesh key={i} position={[Math.cos((i * Math.PI) / 6) * 2.4, Math.sin((i * Math.PI) / 6) * 2.4, 0.2]}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial color="#fff" />
          </mesh>
        ))}
      </group>

      {/* 7. Crystal */}
      <mesh ref={crystalRef} position={[0, 0, 0.3]}>
        <cylinderGeometry args={[2.3, 2.3, 0.3, 64]} />
        <meshPhysicalMaterial color="#ffffff" transmission={0.95} transparent opacity={1} roughness={0} />
      </mesh>

      {/* 8. Dial */}
      <mesh ref={dialRef} position={[0, 0, 0.05]}>
        <cylinderGeometry args={[2.2, 2.2, 0.05, 64]} />
        <meshStandardMaterial map={dialTexture} color="#ffffff" metalness={0.2} roughness={0.8} />
      </mesh>

      {/* 9. Movement */}
      <group ref={movementRef} position={[0, 0, -0.1]}>
        <mesh>
          <cylinderGeometry args={[2.1, 2.1, 0.15, 64]} />
          <meshStandardMaterial map={movementTexture} color="#ffffff" metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh ref={escapeWheelRef} position={[1, 1, 0.1]}>
          <torusGeometry args={[0.3, 0.02, 16, 15]} />
          <meshStandardMaterial color="#d4af37" metalness={1} roughness={0.2} />
        </mesh>
        <mesh position={[-1, -0.5, 0.1]}>
          <cylinderGeometry args={[0.6, 0.6, 0.05, 32]} />
          <meshStandardMaterial color="#aaa" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* 10. Rotor */}
      <mesh ref={rotorRef} position={[0, 0, -0.15]}>
        {/* Half cylinder for the rotor */}
        <cylinderGeometry args={[2.0, 2.0, 0.05, 64, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#d4af37" metalness={1} roughness={0.3} />
      </mesh>

      {/* 11. Hands */}
      <group ref={handsRef} position={[0, 0, 0.1]}>
        <mesh position={[0, 0.6, 0.01]}>
          <boxGeometry args={[0.08, 1.2, 0.02]} />
          <meshStandardMaterial color="#d4af37" emissive="#555" />
        </mesh>
        <mesh position={[0, 0.8, 0.02]} rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[0.06, 1.6, 0.02]} />
          <meshStandardMaterial color="#d4af37" emissive="#555" />
        </mesh>
        <mesh position={[0, 0.9, 0.03]} rotation={[0, 0, Math.PI / 3]}>
          <boxGeometry args={[0.02, 1.8, 0.02]} />
          <meshStandardMaterial color="#e74c3c" />
        </mesh>
      </group>

      {/* 12. Date */}
      <group ref={dateRef} position={[1.5, 0, 0.06]}>
        <mesh>
          <boxGeometry args={[0.4, 0.3, 0.01]} />
          <meshStandardMaterial color="#fff" />
        </mesh>
        <Text position={[0, 0, 0.01]} fontSize={0.2} color="#000" font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2">
          28
        </Text>
      </group>

    </group>
  );
};

export default WatchModel;
