'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function LoadingScreen() {
  const [phase, setPhase] = useState<'hidden' | 'in' | 'hold' | 'out'>('hidden');
  const pathname = usePathname();

  useEffect(() => {
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    let t3: ReturnType<typeof setTimeout>;

    setPhase('in');
    t1 = setTimeout(() => setPhase('hold'), 150);
    t2 = setTimeout(() => setPhase('out'), 900);
    t3 = setTimeout(() => setPhase('hidden'), 1300);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [pathname]);

  if (phase === 'hidden') return null;

  const visible = phase === 'in' || phase === 'hold';
  const barWidth = phase === 'out' ? '100%' : phase === 'hold' ? '75%' : '0%';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: '#121212',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: visible ? 1 : 0,
      transition: 'opacity .38s cubic-bezier(.4,0,.2,1)',
      pointerEvents: phase === 'out' ? 'none' : 'all',
    }}>

      {/* Ambient glow */}
      <div style={{
        position: 'absolute',
        top: '30%',
        left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 500,
        height: 500,
        background: 'radial-gradient(circle, rgba(158,27,27,.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Logo block */}
      <div style={{
        textAlign: 'center',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity .4s ease .1s, transform .4s ease .1s',
      }}>
        {/* Wordmark */}
        <div style={{
          fontFamily: 'Lexend, system-ui, sans-serif',
          fontWeight: 900,
          fontSize: 'clamp(1.4rem, 4vw, 2rem)',
          letterSpacing: '.22em',
          textTransform: 'uppercase',
          color: '#FFFFFF',
          marginBottom: 6,
        }}>
          SUNDARA<span style={{ color: '#9E1B1B' }}>FLOW</span>
        </div>

        {/* Tagline */}
        <div style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '.62rem',
          letterSpacing: '.28em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,.3)',
          marginBottom: 40,
        }}>
          Performance · Nutrition · Coaching
        </div>

        {/* Progress track */}
        <div style={{
          width: 160,
          height: 2,
          background: 'rgba(255,255,255,.08)',
          borderRadius: 99,
          overflow: 'hidden',
          margin: '0 auto',
        }}>
          <div style={{
            height: '100%',
            width: barWidth,
            background: 'linear-gradient(90deg, #9E1B1B, #b91c1c)',
            borderRadius: 99,
            transition: phase === 'hold'
              ? 'width .7s cubic-bezier(.4,0,.2,1)'
              : phase === 'out'
              ? 'width .35s cubic-bezier(.4,0,.2,1)'
              : 'none',
            boxShadow: '0 0 12px rgba(158,27,27,.6)',
          }} />
        </div>

        {/* Dots */}
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 22 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: i === 0 ? '#9E1B1B' : 'rgba(255,255,255,.15)',
              animation: `lsDot 1.2s ease ${i * .2}s infinite`,
            }} />
          ))}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@900&family=Inter:wght@400&display=swap');
        @keyframes lsDot {
          0%,80%,100% { transform: scale(1); opacity: .3 }
          40%          { transform: scale(1.5); opacity: 1 }
        }
      `}</style>
    </div>
  );
}
