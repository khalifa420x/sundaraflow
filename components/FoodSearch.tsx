'use client';

import { useState, useEffect, useRef } from 'react';
import { FoodItem, searchFood } from '@/lib/nutrition';

interface FoodSearchProps {
  onAdd: (item: FoodItem) => void;
  placeholder?: string;
}

export default function FoodSearch({ onAdd, placeholder = 'Rechercher un aliment…' }: FoodSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const items = await searchFood(query.trim());
        setResults(items);
        setOpen(true);
        const initQty: Record<number, number> = {};
        items.forEach((_, i) => { initQty[i] = 100; });
        setQuantities(initQty);
      } catch {
        setError('Erreur réseau — vérifiez votre connexion.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, [query]);

  const handleAdd = (item: FoodItem, idx: number) => {
    const qty = quantities[idx] ?? 100;
    const ratio = qty / 100;
    onAdd({
      ...item,
      quantity: qty,
      calories: Math.round(item.calories * ratio),
      protein: Math.round(item.protein * ratio * 10) / 10,
      carbs: Math.round(item.carbs * ratio * 10) / 10,
      fat: Math.round(item.fat * ratio * 10) / 10,
    });
  };

  return (
    <div style={{ width: '100%', marginBottom: 14, position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%',
            background: '#1c1b1b',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            padding: '10px 40px 10px 12px',
            color: '#e5e2e1',
            fontFamily: 'Inter, sans-serif',
            fontSize: '.84rem',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {loading && (
          <div style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            width: 16, height: 16, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.07)', borderTopColor: '#b22a27',
            animation: 'fspin .7s linear infinite',
          }} />
        )}
      </div>

      {error && (
        <div style={{ fontSize: '.72rem', color: '#f87171', marginTop: 4, fontFamily: 'Inter, sans-serif' }}>{error}</div>
      )}

      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8, marginTop: 4,
          maxHeight: 320, overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {results.map((item, idx) => (
            <div key={idx} style={{
              padding: '10px 12px',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.8rem', color: '#e5e2e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.name}
                </div>
                <div style={{ fontSize: '.65rem', color: '#9CA3AF', marginTop: 2 }}>
                  {item.calories} kcal · {item.protein}g prot · {item.carbs}g gluc · {item.fat}g lip
                  <span style={{ color: '#6B7280' }}> / 100g</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <input
                  type="number"
                  min={1}
                  max={9999}
                  value={quantities[idx] ?? 100}
                  onChange={e => setQuantities(q => ({ ...q, [idx]: Number(e.target.value) }))}
                  style={{
                    width: 58, textAlign: 'center',
                    background: '#2a2a2a', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 6, padding: '5px 6px',
                    color: '#e5e2e1', fontFamily: 'Inter, sans-serif', fontSize: '.78rem',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '.68rem', color: '#6B7280' }}>g</span>
                <button
                  onClick={() => handleAdd(item, idx)}
                  style={{
                    background: 'rgba(178,42,39,0.15)',
                    border: '1px solid rgba(178,42,39,0.35)',
                    borderRadius: 6, padding: '5px 10px',
                    color: '#e3beb8', fontFamily: 'Lexend, sans-serif', fontWeight: 700,
                    fontSize: '.66rem', letterSpacing: '.06em',
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    minHeight: 30,
                  }}
                >
                  + Ajouter
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && results.length === 0 && !loading && query.trim() && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8, marginTop: 4, padding: '14px 16px',
          fontSize: '.78rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif',
        }}>
          Aucun résultat pour «&nbsp;{query}&nbsp;»
        </div>
      )}

      <style>{`@keyframes fspin { to { transform: translateY(-50%) rotate(360deg); } }`}</style>
    </div>
  );
}
