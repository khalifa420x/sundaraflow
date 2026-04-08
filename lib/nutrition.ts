// lib/nutrition.ts

export interface FoodItem {
  name: string;
  quantity: number; // en grammes
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// Calcul automatique des totaux
export function calculateTotals(items: FoodItem[]): NutritionTotals {
  return items.reduce((acc, item) => ({
    calories: acc.calories + item.calories,
    protein: acc.protein + item.protein,
    carbs: acc.carbs + item.carbs,
    fat: acc.fat + item.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

// Recalcul quand la quantité change
export function recalculateForQuantity(
  item: FoodItem,
  newQuantity: number
): FoodItem {
  const ratio = newQuantity / (item.quantity || 100);
  return {
    ...item,
    quantity: newQuantity,
    calories: Math.round(item.calories * ratio),
    protein: Math.round(item.protein * ratio * 10) / 10,
    carbs: Math.round(item.carbs * ratio * 10) / 10,
    fat: Math.round(item.fat * ratio * 10) / 10,
  };
}

// Recherche Open Food Facts
export async function searchFood(query: string): Promise<FoodItem[]> {
  const res = await fetch(
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=8&fields=product_name,nutriments`
  );
  const data = await res.json();
  return (data.products || [])
    .filter((p: any) => p.product_name && p.nutriments)
    .map((p: any) => ({
      name: p.product_name,
      quantity: 100,
      calories: Math.round(p.nutriments['energy-kcal_100g'] || 0),
      protein: Math.round((p.nutriments['proteins_100g'] || 0) * 10) / 10,
      carbs: Math.round((p.nutriments['carbohydrates_100g'] || 0) * 10) / 10,
      fat: Math.round((p.nutriments['fat_100g'] || 0) * 10) / 10,
    }));
}

// Feedback nutritionnel pour le coach
export function getNutritionFeedback(totals: NutritionTotals, targetCalories: number): string[] {
  const feedback: string[] = [];
  if (totals.calories === 0) return feedback;

  const proteinCalories = totals.protein * 4;
  const proteinPct = (proteinCalories / totals.calories) * 100;
  const carbCalories = totals.carbs * 4;
  const carbPct = (carbCalories / totals.calories) * 100;

  if (proteinPct < 25) feedback.push('⚠️ Protéines insuffisantes — visez 25-35% des calories');
  if (proteinPct > 40) feedback.push('✓ Excellent ratio protéique');
  if (carbPct > 60) feedback.push("⚠️ Glucides élevés — à ajuster selon l'objectif");
  if (totals.calories > targetCalories * 1.1) feedback.push("⚠️ Repas au-dessus de l'objectif calorique");
  if (totals.calories < targetCalories * 0.5) feedback.push('💡 Repas léger — adapter selon le moment de la journée');

  return feedback;
}
