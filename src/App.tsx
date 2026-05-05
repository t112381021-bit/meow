/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Grid, Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'motion/react';
import { 
  Zap, 
  Layers, 
  Box,
  Circle,
  Weight
} from 'lucide-react';

// --- Constants & Types ---

type CrossSection = 'Hollow Circle' | 'Solid Rectangle';

interface Material {
  name: string;
  eModulus: number; // Pa (N/m^2)
  yieldStrength: number; // Pa
  color: string;
  finish: number; // rough to smooth 0-1
}

const MATERIALS: Material[] = [
  { name: 'Stainless Steel', eModulus: 200e9, yieldStrength: 215e6, color: '#94a3b8', finish: 1.0 },
  { name: 'Aluminum 6061', eModulus: 69e9, yieldStrength: 276e6, color: '#64748b', finish: 0.8 },
  { name: 'Carbon Fiber', eModulus: 150e9, yieldStrength: 800e6, color: '#171717', finish: 0.9 },
  { name: 'Polycarbonate', eModulus: 2.3e9, yieldStrength: 60e6, color: '#cbd5e1', finish: 0.4 },
];

// --- 3D Components ---

const BendingModel = ({ 
  params 
}: { 
  params: { 
    length: number; 
    thickness: number; 
    force: number; 
    material: Material;
    section: CrossSection;
    deflection: number;
    yieldRatio: number;
  } 
}) => {
  const meshRef = useRef<THREE.Group>(null);
  const segments = 24;
  
  useFrame(() => {
    if (!meshRef.current) return;
    
    const visualLength = params.length * 10;
    const visualDeflection = params.deflection * 10;
    
    meshRef.current.children.forEach((child, i) => {
      // Skip the machine body components (indices 0-4)
      if (i < 5) return;
      
      const t = (i - 5) / segments;
      const normalizedX = t;
      
      const offset = visualDeflection * ( (3 * Math.pow(normalizedX, 2) - Math.pow(normalizedX, 3)) / 2 );
      child.position.y = -offset;
      
      const slope = (visualDeflection / visualLength) * (3 * normalizedX - 1.5 * Math.pow(normalizedX, 2));
      child.rotation.z = -Math.atan(slope);
    });
  });

  const renderSegments = useMemo(() => {
    const items = [];
    const visualThickness = (params.section === 'Hollow Circle' ? 0.3 : 0.4) * (1 + params.thickness * 10);

    for (let i = 0; i <= segments; i++) {
      items.push(
        <mesh key={i} position={[i * (params.length * 10 / segments), 0, 0]}>
          {params.section === 'Hollow Circle' ? (
            <torusGeometry args={[visualThickness, 0.025, 12, 32]} />
          ) : (
            <boxGeometry args={[params.length * 10 / segments + 0.01, visualThickness * 2, visualThickness * 2]} />
          )}
          <meshStandardMaterial 
            color={params.material.color} 
            metalness={params.material.finish} 
            roughness={1 - params.material.finish} 
            emissive={params.yieldRatio > 1 ? "#ff0000" : "#38bdf8"}
            emissiveIntensity={params.yieldRatio > 1 ? 0.5 : 0.05}
          />
        </mesh>
      );
    }
    return items;
  }, [params.length, params.thickness, params.material, params.section, params.yieldRatio]);

  return (
    <group ref={meshRef}>
      {/* ESPRESSO MACHINE BODY */}
      <group position={[-1.2, 0, 0]} rotation={[0, 0, Math.PI/2]}>
        {/* Main Chassis */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.9, 0.9, 2.4, 32]} />
          <meshStandardMaterial color="#1a1c1e" roughness={0.7} metalness={0.2} />
        </mesh>
        {/* Grip Texture Section */}
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.92, 0.92, 0.8, 32]} />
          <meshStandardMaterial color="#0f172a" roughness={1} metalness={0} />
        </mesh>
        {/* Top/Cap */}
        <mesh position={[0, 1.25, 0]}>
          <cylinderGeometry args={[0.9, 0.7, 0.2, 32]} />
          <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.8} />
        </mesh>
        {/* Pump Button */}
        <mesh position={[0.85, 0.2, 0]} rotation={[0, 0, -Math.PI/2]}>
          <cylinderGeometry args={[0.2, 0.2, 0.15, 16]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.5} />
        </mesh>
        {/* Nozzle Base */}
        <mesh position={[0, -1.3, 0]}>
           <cylinderGeometry args={[0.6, 0.4, 0.3, 16]} />
           <meshStandardMaterial color="#475569" roughness={0.2} metalness={0.9} />
        </mesh>
      </group>
      
      {/* TEST COMPONENT (BENDING PART) */}
      {renderSegments}

      {/* IMPACT / FORCE SYMBOL */}
      <Float speed={2} rotationIntensity={0} floatIntensity={0.5}>
        <group position={[params.length * 10, -params.deflection * 10, 0]}>
          {/* Arrow Head pointing DOWN */}
          <mesh position={[0, 0.6, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.08, 0.25, 16]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
          </mesh>
          <Html position={[0, 1.2, 0]} center>
            <div className="flex flex-col items-center pointer-events-none scale-90">
              <span className={`text-[10px] font-mono font-black px-3 py-1 border transition-all whitespace-nowrap ${
                params.yieldRatio > 1 
                ? 'bg-red-600 border-red-400 text-white animate-bounce shadow-lg' 
                : 'bg-white border-slate-200 text-slate-900 shadow-xl backdrop-blur-md'
              }`}>
                {params.force.toFixed(0)}N LOAD
              </span>
              <div className={`w-0.5 h-12 mt-[-4px] ${params.yieldRatio > 1 ? 'bg-red-500' : 'bg-accent/40'}`} />
            </div>
          </Html>
        </group>
      </Float>
    </group>
  );
};

// --- Helper Functions ---

const calculateBending = (
  force: number, 
  length: number, 
  thickness: number, 
  material: Material, 
  section: CrossSection
) => {
  const outerSize = 0.05; // 50mm base
  let I = 0;
  const c = outerSize / 2; // Distance to outermost fiber
  
  if (section === 'Hollow Circle') {
    const innerD = Math.max(0.001, outerSize - (2 * thickness));
    I = (Math.PI * (Math.pow(outerSize, 4) - Math.pow(innerD, 4))) / 64;
  } else {
    // Truly Solid Rectangle (actually square in this visual)
    I = (Math.pow(outerSize, 4)) / 12;
  }

  // Prevent division by zero
  const effectiveForce = Math.max(0.1, force);
  const deflection = (effectiveForce * Math.pow(length, 3)) / (3 * material.eModulus * I);
  const maxStress = (effectiveForce * length * c) / I;
  const yieldRatio = maxStress / material.yieldStrength;
  
  // Predict force needed to bend (Yield Force)
  const yieldForce = (material.yieldStrength * I) / (length * c);

  return { deflection, yieldRatio, I, maxStress, yieldForce };
};

// --- Main App ---

export default function App() {
  const [force, setForce] = useState(150); 
  const [length, setLength] = useState(0.25); 
  const [thickness, setThickness] = useState(0.003); 
  const [materialIdx, setMaterialIdx] = useState(0);
  const [section, setSection] = useState<CrossSection>('Hollow Circle');

  const material = MATERIALS[materialIdx];
  const results = useMemo(() => 
    calculateBending(force, length, thickness, material, section),
    [force, length, thickness, material, section]
  );

  return (
    <div className="h-screen flex flex-col bg-bg text-ink overflow-hidden selection:bg-accent/30">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-8 glass z-30 border-b border-slate-200/50">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 bg-accent rounded-full shadow-[0_0_12px_var(--color-accent)]" />
          <h1 className="text-lg font-bold tracking-tight uppercase">Structural Workbench v4.0</h1>
        </div>
        <div className="flex gap-8 text-[10px] tracking-widest text-ink-dim font-mono">
          <span className="opacity-70">ID: ESP-992-X</span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            SIMULATION: ACTIVE
          </span>
          <span>LOAD: NOMINAL</span>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <aside className="w-[300px] flex flex-col glass border-y-0 border-l-0 z-20 shadow-xl">
          <div className="p-6 flex-1 overflow-y-auto space-y-8 no-scrollbar">
            {/* Materials */}
            <section>
              <h2 className="label-mono mb-6">Material Specs</h2>
              <div className="space-y-2">
                {MATERIALS.map((m, i) => (
                  <button
                    key={m.name}
                    onClick={() => setMaterialIdx(i)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      materialIdx === i 
                        ? 'bg-accent/5 border-accent text-accent shadow-sm' 
                        : 'bg-slate-50 border-slate-200 text-ink-dim hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs font-bold uppercase tracking-wide">{m.name}</div>
                    <div className="text-[10px] font-mono opacity-80 mt-1">E: {(m.eModulus / 1e9).toFixed(0)} GPa</div>
                  </button>
                ))}
              </div>
            </section>
            
            {/* ... middle sections ... */}
            <section>
              <h2 className="label-mono mb-6 text-ink/70">Geometry & Drop Specs</h2>
              <div className="space-y-8">
                <div>
                  <div className="flex justify-between items-center mb-4 text-xs font-medium">
                    <span className="text-ink-dim italic">Wall Thickness (t)</span>
                    <span className="text-accent font-bold font-mono">{(thickness * 1000).toFixed(1)}mm</span>
                  </div>
                  <input 
                    type="range" min="0.001" max="0.012" step="0.0001"
                    value={thickness} onChange={(e) => setThickness(Number(e.target.value))}
                    className="param-slider"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-4 text-xs font-medium">
                    <span className="text-ink-dim italic">Chassis Extension (L)</span>
                    <span className="text-accent font-bold font-mono">{(length * 1000).toFixed(0)}mm</span>
                  </div>
                  <input 
                    type="range" min="0.05" max="0.5" step="0.01"
                    value={length} onChange={(e) => setLength(Number(e.target.value))}
                    className="param-slider"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-4 text-xs font-medium">
                    <span className="text-ink-dim">Manual Press Force</span>
                    <span className="text-accent font-bold font-mono">{force}N</span>
                  </div>
                  <input 
                    type="range" min="1" max="2500" step="10"
                    value={force} onChange={(e) => setForce(Number(e.target.value))}
                    className="param-slider"
                  />
                </div>
                
                <div className="pt-2">
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl shadow-sm">
                    <div className="label-mono text-emerald-600 mb-2">Equivalent Drop Height</div>
                    <div className="flex items-baseline gap-2">
                       <span className="text-2xl font-bold text-emerald-600">
                         {((force * 0.01 / 0.5)**2 / (2 * 9.81)).toFixed(2)}
                       </span>
                       <span className="text-xs text-emerald-600/60 uppercase font-bold tracking-widest">Meters</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="pt-4">
              <div className="stat-card">
                <div className="label-mono mb-2">Moment of Inertia (I)</div>
                <div className="text-2xl font-bold text-accent tracking-tighter">
                  {results.I.toExponential(2)} <span className="text-[10px] uppercase opacity-60 ml-1">m⁴</span>
                </div>
              </div>
            </section>
          </div>

          <div className="p-6 border-t border-slate-200/50 bg-slate-50/50">
             <div className="flex items-center justify-between mb-3">
                <span className="label-mono">Safety Margin</span>
                <span className={`text-xl font-bold ${results.yieldRatio > 1 ? 'text-warning' : 'text-emerald-600'}`}>
                  {force > 0 ? (1 / results.yieldRatio).toFixed(1) : '∞'}x
                </span>
             </div>
             <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <motion.div 
                  className={`h-full ${results.yieldRatio > 0.8 ? 'bg-warning' : 'bg-emerald-500'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(0, Math.min(100, (1/Math.max(0.1, results.yieldRatio)) * 10))}%` }}
                />
             </div>
             <div className="mt-4 pt-4 border-t border-slate-200/30">
               <div className="label-mono text-[9px] mb-1">Estimated Yield Load</div>
               <div className="text-sm font-bold text-ink">
                 {results.yieldForce.toFixed(0)} <span className="text-[10px] text-ink-dim uppercase">Newtons</span>
               </div>
             </div>
          </div>
        </aside>

        {/* 3D Viewer */}
        <div className="flex-1 relative bg-white">
          <div className="absolute inset-0 z-0 bg-slate-50" />
          
          {/* HUD Indicators */}
          <div className="absolute top-10 left-10 z-10 pointer-events-none border-l-2 border-slate-200 pl-6">
            <div className="flex items-baseline gap-2 text-ink">
              <span className="text-6xl font-black tracking-tighter">{(results.maxStress / 1e6).toFixed(1)}</span>
              <span className="text-2xl font-medium text-ink-dim">MPa</span>
            </div>
            <div className="label-mono mt-1">Crush Resistance (σ max)</div>
          </div>

          <div className="absolute bottom-10 right-10 z-10 pointer-events-none text-right">
            <h3 className="label-mono mb-4 text-ink-dim">Simulated Profile</h3>
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setSection('Hollow Circle')}
                className={`px-6 py-2 rounded-lg border pointer-events-auto transition-all text-[10px] tracking-widest uppercase font-black ${
                  section === 'Hollow Circle' ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20' : 'bg-white text-ink-dim border-slate-200'
                }`}
              >
                Hollow
              </button>
              <button 
                onClick={() => setSection('Solid Rectangle')}
                className={`px-6 py-2 rounded-lg border pointer-events-auto transition-all text-[10px] tracking-widest uppercase font-black ${
                  section === 'Solid Rectangle' ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20' : 'bg-white text-ink-dim border-slate-200'
                }`}
              >
                Solid
              </button>
            </div>
          </div>

          <Canvas shadows gl={{ antialias: true }}>
            <PerspectiveCamera makeDefault position={[5, 2, 5]} fov={40} />
            <OrbitControls enablePan={false} minDistance={3} maxDistance={12} makeDefault />
            
            <ambientLight intensity={0.8} />
            <spotLight position={[10, 10, 10]} intensity={1.5} angle={0.3} penumbra={1} castShadow />
            <pointLight position={[-5, -5, -5]} intensity={0.8} color="#0ea5e9" />

            <group position={[-1.5, 0, 0]}>
              <BendingModel params={{ ...results, length, thickness, force, material, section }} />
            </group>

            <Grid 
              infiniteGrid 
              fadeDistance={20} 
              cellSize={0.5} 
              sectionSize={2.5} 
              sectionThickness={1.5} 
              sectionColor="#cbd5e1" 
              cellColor="#f1f5f9"
              position={[0, -2, 0]}
            />
            
            <Environment preset="studio" />
          </Canvas>
        </div>
      </div>

      {/* Footer / Computation Model */}
      <footer className="h-44 glass border-x-0 border-b-0 px-10 flex gap-12 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
        <div className="flex-1 border-r border-slate-200 py-6 pr-10">
          <div className="label-mono mb-6 text-accent">Computation Model (Euler-Bernoulli)</div>
          <div className="flex items-center gap-10 opacity-90 text-ink">
            <div className="flex items-center gap-4">
              <span className="text-4xl italic font-serif text-accent">δ</span>
              <span className="text-2xl font-light">=</span>
              <div className="flex flex-col items-center">
                <span className="border-b border-slate-400 pb-1 font-mono text-xl px-4 text-ink-dim">P · L³</span>
                <span className="pt-1 font-mono text-xl text-ink-dim">3 · E · I</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-y-1 gap-x-6 text-[10px] font-mono text-ink-dim uppercase tracking-wider font-bold">
              <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" /> P: LOAD</div>
              <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" /> L: LENGTH</div>
              <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" /> E: MODULUS</div>
              <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" /> I: INERTIA</div>
            </div>
          </div>
        </div>

        <div className="w-80 py-6">
          <div className="label-mono mb-4">Impact Displacement</div>
          <div className="flex items-baseline gap-2">
            <span className="text-6xl font-black tracking-tighter text-accent">{(results.deflection * 1000).toFixed(2)}</span>
            <span className="text-xl font-medium text-ink-dim">mm</span>
          </div>
          <div className="mt-6 h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-accent shadow-[0_0_15px_rgba(2,132,199,0.2)]"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (results.deflection * 1000) * 10)}%` }}
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
