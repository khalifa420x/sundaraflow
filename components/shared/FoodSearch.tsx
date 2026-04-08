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

// Base locale d'aliments courants (valeurs pour 100g)
const LOCAL_FOODS: FoodItem[] = [
  { name: 'Blanc de poulet', quantity: 100, calories: 110, protein: 23, carbs: 0, fat: 2 },
  { name: 'Poulet rôti', quantity: 100, calories: 215, protein: 25, carbs: 0, fat: 13 },
  { name: 'Cuisse de poulet', quantity: 100, calories: 185, protein: 20, carbs: 0, fat: 11 },
  { name: 'Riz blanc cuit', quantity: 100, calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { name: 'Riz basmati cuit', quantity: 100, calories: 121, protein: 2.5, carbs: 25, fat: 0.4 },
  { name: 'Riz complet cuit', quantity: 100, calories: 112, protein: 2.6, carbs: 23, fat: 0.9 },
  { name: 'Pâtes cuites', quantity: 100, calories: 158, protein: 5.5, carbs: 31, fat: 0.9 },
  { name: 'Saumon', quantity: 100, calories: 208, protein: 20, carbs: 0, fat: 13 },
  { name: 'Thon en boîte', quantity: 100, calories: 116, protein: 26, carbs: 0, fat: 1 },
  { name: 'Œuf entier', quantity: 100, calories: 155, protein: 13, carbs: 1.1, fat: 11 },
  { name: 'Blanc d\'œuf', quantity: 100, calories: 52, protein: 11, carbs: 0.7, fat: 0.2 },
  { name: 'Bœuf haché 5%', quantity: 100, calories: 137, protein: 21, carbs: 0, fat: 5 },
  { name: 'Steak bœuf', quantity: 100, calories: 172, protein: 26, carbs: 0, fat: 7 },
  { name: 'Dinde', quantity: 100, calories: 135, protein: 30, carbs: 0, fat: 1 },
  { name: 'Crevettes', quantity: 100, calories: 99, protein: 21, carbs: 0.2, fat: 1.1 },
  { name: 'Avocat', quantity: 100, calories: 160, protein: 2, carbs: 9, fat: 15 },
  { name: 'Brocoli', quantity: 100, calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
  { name: 'Épinards', quantity: 100, calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  { name: 'Patate douce', quantity: 100, calories: 86, protein: 1.6, carbs: 20, fat: 0.1 },
  { name: 'Pomme de terre', quantity: 100, calories: 77, protein: 2, carbs: 17, fat: 0.1 },
  { name: 'Carotte', quantity: 100, calories: 41, protein: 0.9, carbs: 10, fat: 0.2 },
  { name: 'Tomate', quantity: 100, calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
  { name: 'Courgette', quantity: 100, calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3 },
  { name: 'Haricots verts', quantity: 100, calories: 31, protein: 1.8, carbs: 7, fat: 0.1 },
  { name: 'Lentilles cuites', quantity: 100, calories: 116, protein: 9, carbs: 20, fat: 0.4 },
  { name: 'Pois chiches cuits', quantity: 100, calories: 164, protein: 8.9, carbs: 27, fat: 2.6 },
  { name: 'Fromage blanc 0%', quantity: 100, calories: 49, protein: 8, carbs: 3.8, fat: 0.2 },
  { name: 'Yaourt grec 0%', quantity: 100, calories: 57, protein: 9.9, carbs: 3.6, fat: 0.4 },
  { name: 'Lait demi-écrémé', quantity: 100, calories: 46, protein: 3.2, carbs: 4.8, fat: 1.6 },
  { name: 'Flocons d\'avoine', quantity: 100, calories: 368, protein: 13, carbs: 58, fat: 7 },
  { name: 'Pain complet', quantity: 100, calories: 247, protein: 9, carbs: 45, fat: 3.4 },
  { name: 'Banane', quantity: 100, calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  { name: 'Pomme', quantity: 100, calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  { name: 'Myrtilles', quantity: 100, calories: 57, protein: 0.7, carbs: 14, fat: 0.3 },
  { name: 'Fraises', quantity: 100, calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3 },
  { name: 'Amandes', quantity: 100, calories: 579, protein: 21, carbs: 22, fat: 50 },
  { name: 'Noix de cajou', quantity: 100, calories: 553, protein: 18, carbs: 30, fat: 44 },
  { name: 'Huile d\'olive', quantity: 100, calories: 884, protein: 0, carbs: 0, fat: 100 },
  { name: 'Beurre de cacahuète', quantity: 100, calories: 588, protein: 25, carbs: 20, fat: 50 },
  { name: 'Chocolat noir 70%', quantity: 100, calories: 598, protein: 8, carbs: 46, fat: 43 },
  { name: 'Quinoa cuit', quantity: 100, calories: 120, protein: 4.4, carbs: 22, fat: 1.9 },
  { name: 'Mozzarella', quantity: 100, calories: 280, protein: 18, carbs: 2.2, fat: 22 },
  { name: 'Parmesan', quantity: 100, calories: 431, protein: 38, carbs: 3.2, fat: 29 },
  { name: 'Whey protéine', quantity: 100, calories: 400, protein: 80, carbs: 8, fat: 5 },
  { name: 'Skyr', quantity: 100, calories: 63, protein: 11, carbs: 4, fat: 0.2 },
];

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export default function FoodSearch({ onAddItem, placeholder }: FoodSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<any>(null);
  const skipBlur = useRef(false);

  const search = async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }

    const normQ = normalize(q);

    // 1. Chercher dans la base locale d'abord
    const localResults = LOCAL_FOODS.filter(food =>
      normalize(food.name).includes(normQ)
    );

    if (localResults.length >= 3) {
      // Assez de résultats locaux — pas besoin de l'API
      setResults(localResults.slice(0, 8));
      setOpen(true);
      return;
    }

    // 2. Compléter avec Open Food Facts si pas assez de résultats locaux
    setLoading(true);
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20&fields=product_name,nutriments`
      );
      const data = await res.json();

      const apiResults: FoodItem[] = (data.products || [])
        .filter((p: any) =>
          p.product_name?.trim() &&
          (p.nutriments?.['energy-kcal_100g'] ?? 0) > 0 &&
          normalize(p.product_name).includes(normQ)
        )
        .slice(0, 8 - localResults.length)
        .map((p: any) => ({
          name: p.product_name.trim(),
          quantity: 100,
          calories: Math.round(p.nutriments['energy-kcal_100g']),
          protein: Math.round((p.nutriments['proteins_100g'] ?? 0) * 10) / 10,
          carbs: Math.round((p.nutriments['carbohydrates_100g'] ?? 0) * 10) / 10,
          fat: Math.round((p.nutriments['fat_100g'] ?? 0) * 10) / 10,
        }));

      const combined = [...localResults, ...apiResults].slice(0, 8);
      setResults(combined);
      setOpen(combined.length > 0);
    } catch {
      // Si API échoue, afficher quand même les résultats locaux
      setResults(localResults);
      setOpen(localResults.length > 0);
    }
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
          placeholder={placeholder || 'Ex : poulet, riz basmati, avocat…'}
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
          maxHeight: 260,
          overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
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
