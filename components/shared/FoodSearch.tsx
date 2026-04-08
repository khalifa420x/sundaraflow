'use client';

import { useState, useRef } from 'react';

export interface FoodItem {
  name: string;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface FoodSearchProps {
  onAddItem: (item: FoodItem) => void;
  placeholder?: string;
}

export default function FoodSearch({ onAddItem, placeholder = 'Rechercher un aliment…' }: FoodSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });

  const searchFoodItems = async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const url =
        `https://world.openfoodfacts.org/cgi/search.pl?` +
        `search_terms=${encodeURIComponent(q)}` +
        `&search_simple=1&action=process&json=1` +
        `&page_size=10&fields=product_name,nutriments`;
      const res = await fetch(url);
      const data = await res.json();
      const items: FoodItem[] = (data.products || [])
        .filter((p: any) =>
          p.product_name?.trim() &&
          (p.nutriments?.['energy-kcal_100g'] ?? 0) > 0
        )
        .slice(0, 8)
        .map((p: any) => ({
          name: p.product_name.trim(),
          quantity: 100,
          calories: Math.round(p.nutriments['energy-kcal_100g']),
          protein: Math.round((p.nutriments['proteins_100g'] ?? 0) * 10) / 10,
          carbs: Math.round((p.nutriments['carbohydrates_100g'] ?? 0) * 10) / 10,
          fat: Math.round((p.nutriments['fat_100g'] ?? 0) * 10) / 10,
        }));
      if (items.length > 0 && wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        setDropPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
      }
      setResults(items);
      setOpen(items.length > 0);
    } catch {
      setResults([]);
    }
    setLoading(false);
  };

  const handleAdd = (item: FoodItem) => {
    onAddItem(item);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={e => {
            const val = e.target.value;
            setQuery(val);
            clearTimeout(timerRef.current as any);
            timerRef.current = setTimeout(() => searchFoodItems(val), 300) as any;
          }}
          style={{
            flex: 1,
            background: '#2a2a2a',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 7,
            padding: '9px 12px',
            color: '#e5e2e1',
            fontSize: '.84rem',
            outline: 'none',
            boxSizing: 'border-box',
            width: '100%',
          }}
        />
        {loading && (
          <div style={{
            width: 18,
            height: 18,
            border: '2px solid rgba(255,255,255,0.07)',
            borderTopColor: '#b22a27',
            borderRadius: '50%',
            animation: 'fsSpin .7s linear infinite',
            flexShrink: 0,
          }} />
        )}
      </div>

      {open && results.length > 0 && (
        <div style={{
          position: 'fixed',
          top: dropPos.top,
          left: dropPos.left,
          width: dropPos.width,
          background: '#2a2a2a',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          zIndex: 9999,
          maxHeight: 220,
          overflowY: 'auto',
        }}>
          {results.map((item, i) => (
            <div
              key={i}
              onClick={() => handleAdd(item)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                cursor: 'pointer',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(178,42,39,0.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
            >
              <div>
                <div style={{ fontSize: '.82rem', color: '#e5e2e1', fontWeight: 500 }}>
                  {item.name.length > 45 ? item.name.slice(0, 45) + '…' : item.name}
                </div>
                <div style={{ fontSize: '.6rem', color: '#9CA3AF', marginTop: 2 }}>
                  {item.calories} kcal · P{item.protein}g · G{item.carbs}g · L{item.fat}g · /100g
                </div>
              </div>
              <span style={{ color: '#b22a27', fontWeight: 700, fontSize: '1.2rem', marginLeft: 8 }}>+</span>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes fsSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
