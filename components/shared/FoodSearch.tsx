'use client';
import { useRef, useState } from 'react';

interface FoodItem {
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

export default function FoodSearch({ onAddItem, placeholder }: FoodSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<any>(null);
  const skipBlur = useRef(false);

  const search = async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=10&fields=product_name,nutriments`
      );
      const data = await res.json();
      const items: FoodItem[] = (data.products || [])
        .filter((p: any) => p.product_name?.trim() && (p.nutriments?.['energy-kcal_100g'] ?? 0) > 0)
        .slice(0, 8)
        .map((p: any) => ({
          name: p.product_name.trim(),
          quantity: 100,
          calories: Math.round(p.nutriments['energy-kcal_100g']),
          protein: Math.round((p.nutriments['proteins_100g'] ?? 0) * 10) / 10,
          carbs: Math.round((p.nutriments['carbohydrates_100g'] ?? 0) * 10) / 10,
          fat: Math.round((p.nutriments['fat_100g'] ?? 0) * 10) / 10,
        }));
      setResults(items);
      setOpen(items.length > 0);
    } catch { setResults([]); setOpen(false); }
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (item: FoodItem) => {
    skipBlur.current = false;
    onAddItem(item);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (!skipBlur.current) setOpen(false);
      skipBlur.current = false;
    }, 150);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder={placeholder || 'Ex : poulet, riz basmati…'}
          style={{
            flex: 1,
            background: '#2a2a2a',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 7,
            padding: '9px 12px',
            color: '#e5e2e1',
            fontSize: '.84rem',
            outline: 'none',
            width: '100%',
          }}
        />
        {loading && (
          <div style={{
            width: 18, height: 18,
            border: '2px solid rgba(255,255,255,0.07)',
            borderTopColor: '#b22a27',
            borderRadius: '50%',
            animation: 'spin .7s linear infinite',
            flexShrink: 0,
          }} />
        )}
      </div>

      {open && results.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0, right: 0,
          background: '#1c1b1b',
          border: '1px solid rgba(178,42,39,0.3)',
          borderRadius: 8,
          zIndex: 9999,
          maxHeight: 240,
          overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {results.map((item, i) => (
            <div
              key={i}
              onMouseDown={() => { skipBlur.current = true; }}
              onClick={() => handleSelect(item)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                cursor: 'pointer',
                borderBottom: i < results.length - 1
                  ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}
              onMouseEnter={e =>
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(178,42,39,0.12)'}
              onMouseLeave={e =>
                (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
            >
              <div>
                <div style={{
                  fontSize: '.82rem', color: '#e5e2e1',
                  fontWeight: 500, fontFamily: 'Inter, sans-serif',
                }}>
                  {item.name.length > 45 ? item.name.slice(0, 45) + '…' : item.name}
                </div>
                <div style={{ fontSize: '.6rem', color: '#9CA3AF', marginTop: 2 }}>
                  {item.calories} kcal · P {item.protein}g · G {item.carbs}g · L {item.fat}g · /100g
                </div>
              </div>
              <span style={{
                color: '#b22a27', fontWeight: 700,
                fontSize: '1.2rem', marginLeft: 10, flexShrink: 0,
              }}>+</span>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
