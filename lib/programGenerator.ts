// lib/programGenerator.ts

export type GoalType =
  | 'Perte de poids'
  | 'Prise de masse'
  | 'Maintien'
  | 'Force'
  | 'Endurance'
  | 'Renfo général'
  | 'Mobilité';

export type LevelType = 'Débutant' | 'Intermédiaire' | 'Avancé';

export interface ExerciseData {
  id: string;
  name: string;
  type: string;
  level: LevelType;
  primary_muscle: string;
  secondary_muscle: string[];
  equipment: string[];
  mode: 'reps' | 'time';
  value: number;
  sets: number;
  rest_seconds: number;
  instructions: {
    setup: string;
    execution: string;
    tips: string[];
    common_mistakes: string[];
  };
  difficulty_score: number;
  tags: string[];
  goals: GoalType[];
  meals: { meal: string; recipe: string }[];
}

export interface GeneratedExercise {
  exerciseId: string;
  name: string;
  type: string;
  primary_muscle: string;
  mode: 'reps' | 'time';
  sets: number;
  reps: string;        // "12" ou "45s"
  rest: string;        // "60s"
  notes: string;
  meals: { meal: string; recipe: string }[];
  instructions: ExerciseData['instructions'];
}

export interface GeneratedSession {
  day: number;
  label: string;
  focus: string;
  exercises: GeneratedExercise[];
}

export interface GeneratedProgram {
  title: string;
  goal: GoalType;
  level: LevelType;
  durationWeeks: number;
  sessionsPerWeek: number;
  sessions: GeneratedSession[];
  summary: string;
  weeklyMealPlan: { meal: string; recipe: string }[];
}

/* ══════════════════════════════════════════════
   TEMPLATES PAR OBJECTIF
   blocks totaux visés : 6–8 exercices / séance
══════════════════════════════════════════════ */

interface DayTemplate {
  label: string;
  focus: string;
  blocks: { type: string; count: number }[];
}

const GOAL_TEMPLATES: Record<GoalType, {
  durationWeeks: number;
  sessionsPerWeek: number;
  days: DayTemplate[];
  summary: string;
}> = {
  'Perte de poids': {
    durationWeeks: 8,
    sessionsPerWeek: 4,
    summary: 'Programme intensif combinant cardio HIIT et renforcement pour maximiser la dépense calorique et préserver la masse musculaire.',
    days: [
      { label: 'Lundi — Cardio HIIT', focus: 'Cardio intense',
        blocks: [{ type: 'Cardio', count: 3 }, { type: 'Force', count: 2 }, { type: 'Renfo-Core', count: 2 }] },
      { label: 'Mercredi — Force Full Body', focus: 'Renforcement musculaire',
        blocks: [{ type: 'Force', count: 4 }, { type: 'Cardio', count: 2 }, { type: 'Renfo-Core', count: 1 }] },
      { label: 'Vendredi — HIIT Cardio', focus: 'Brûle-graisses',
        blocks: [{ type: 'Cardio', count: 2 }, { type: 'Force', count: 3 }, { type: 'Renfo-Core', count: 2 }] },
      { label: 'Samedi — Core & Mobilité', focus: 'Core et récupération active',
        blocks: [{ type: 'Renfo-Core', count: 3 }, { type: 'Mobility', count: 2 }, { type: 'Cardio', count: 1 }] },
    ],
  },
  'Prise de masse': {
    durationWeeks: 10,
    sessionsPerWeek: 4,
    summary: 'Programme de musculation progressif axé sur la surcharge progressive, avec un volume élevé pour stimuler la croissance musculaire.',
    days: [
      { label: 'Lundi — Push (Pectoraux / Épaules / Triceps)', focus: 'Poussée horizontale et verticale',
        blocks: [{ type: 'Force', count: 5 }, { type: 'Renfo-Core', count: 2 }] },
      { label: 'Mercredi — Pull (Dos / Biceps)', focus: 'Tirage et dorsaux',
        blocks: [{ type: 'Force', count: 5 }, { type: 'Renfo-Core', count: 2 }] },
      { label: 'Vendredi — Legs (Cuisses / Fessiers)', focus: 'Membres inférieurs',
        blocks: [{ type: 'Force', count: 5 }, { type: 'Renfo-Core', count: 1 }, { type: 'Mobility', count: 1 }] },
      { label: 'Dimanche — Full Body Pump', focus: 'Volume et finition',
        blocks: [{ type: 'Force', count: 4 }, { type: 'Renfo-Core', count: 2 }, { type: 'Cardio', count: 1 }] },
    ],
  },
  'Maintien': {
    durationWeeks: 6,
    sessionsPerWeek: 3,
    summary: 'Programme équilibré pour maintenir votre condition physique actuelle avec des séances variées et accessibles.',
    days: [
      { label: 'Lundi — Full Body léger', focus: 'Entretien musculaire',
        blocks: [{ type: 'Force', count: 3 }, { type: 'Cardio', count: 2 }, { type: 'Renfo-Core', count: 2 }] },
      { label: 'Jeudi — Cardio & Core', focus: 'Cardio et gainage',
        blocks: [{ type: 'Cardio', count: 3 }, { type: 'Renfo-Core', count: 2 }, { type: 'Mobility', count: 2 }] },
      { label: 'Samedi — Force & Mobilité', focus: 'Renforcement et souplesse',
        blocks: [{ type: 'Force', count: 3 }, { type: 'Mobility', count: 2 }, { type: 'Renfo-Core', count: 2 }] },
    ],
  },
  'Force': {
    durationWeeks: 12,
    sessionsPerWeek: 4,
    summary: 'Programme de force pure basé sur des exercices poly-articulaires avec charges lourdes et longs temps de récupération.',
    days: [
      { label: 'Lundi — Force Haut du Corps', focus: 'Pousser lourd',
        blocks: [{ type: 'Force', count: 5 }, { type: 'Renfo-Core', count: 2 }] },
      { label: 'Mardi — Force Bas du Corps', focus: 'Jambes et fessiers',
        blocks: [{ type: 'Force', count: 5 }, { type: 'Mobility', count: 1 }, { type: 'Renfo-Core', count: 1 }] },
      { label: 'Jeudi — Dos & Tirage', focus: 'Force dorsaux',
        blocks: [{ type: 'Force', count: 5 }, { type: 'Renfo-Core', count: 2 }] },
      { label: 'Samedi — Full Body Force', focus: 'Intégration globale',
        blocks: [{ type: 'Force', count: 4 }, { type: 'Cardio', count: 1 }, { type: 'Mobility', count: 2 }] },
    ],
  },
  'Endurance': {
    durationWeeks: 8,
    sessionsPerWeek: 4,
    summary: 'Programme d\'endurance cardio-vasculaire combinant séances longues et intervalles pour améliorer votre VO2max et votre résistance.',
    days: [
      { label: 'Lundi — Cardio Long', focus: 'Endurance aérobie',
        blocks: [{ type: 'Cardio', count: 4 }, { type: 'Mobility', count: 2 }, { type: 'Renfo-Core', count: 1 }] },
      { label: 'Mercredi — Intervalles HIIT', focus: 'Puissance cardio',
        blocks: [{ type: 'Cardio', count: 4 }, { type: 'Renfo-Core', count: 2 }, { type: 'Force', count: 1 }] },
      { label: 'Vendredi — Force Endurance', focus: 'Renfo circuit',
        blocks: [{ type: 'Force', count: 3 }, { type: 'Cardio', count: 3 }, { type: 'Renfo-Core', count: 1 }] },
      { label: 'Dimanche — Récupération active', focus: 'Mobilité et récupération',
        blocks: [{ type: 'Mobility', count: 3 }, { type: 'Renfo-Core', count: 2 }, { type: 'Cardio', count: 1 }] },
    ],
  },
  'Renfo général': {
    durationWeeks: 8,
    sessionsPerWeek: 3,
    summary: 'Programme complet de renforcement musculaire général pour développer une condition physique équilibrée et fonctionnelle.',
    days: [
      { label: 'Lundi — Haut du Corps', focus: 'Pectoraux, dos, épaules',
        blocks: [{ type: 'Force', count: 4 }, { type: 'Renfo-Core', count: 2 }, { type: 'Cardio', count: 1 }] },
      { label: 'Mercredi — Bas du Corps', focus: 'Cuisses, fessiers, mollets',
        blocks: [{ type: 'Force', count: 4 }, { type: 'Cardio', count: 2 }, { type: 'Renfo-Core', count: 1 }] },
      { label: 'Vendredi — Full Body', focus: 'Intégration et Core',
        blocks: [{ type: 'Force', count: 3 }, { type: 'Renfo-Core', count: 2 }, { type: 'Mobility', count: 2 }] },
    ],
  },
  'Mobilité': {
    durationWeeks: 6,
    sessionsPerWeek: 3,
    summary: 'Programme doux axé sur la flexibilité, la mobilité articulaire et la récupération active pour améliorer votre amplitude de mouvement.',
    days: [
      { label: 'Lundi — Mobilité Hanche & Dos', focus: 'Bas du dos et hanches',
        blocks: [{ type: 'Mobility', count: 4 }, { type: 'Renfo-Core', count: 2 }, { type: 'Force', count: 1 }] },
      { label: 'Mercredi — Étirements Full Body', focus: 'Corps entier',
        blocks: [{ type: 'Mobility', count: 5 }, { type: 'Renfo-Core', count: 2 }] },
      { label: 'Vendredi — Core & Mobilité', focus: 'Stabilité et souplesse',
        blocks: [{ type: 'Renfo-Core', count: 3 }, { type: 'Mobility', count: 4 }] },
    ],
  },
};

/* ══════════════════════════════════════════════
   FONCTION PRINCIPALE
══════════════════════════════════════════════ */
export function generateProgram(
  goal: GoalType,
  level: LevelType,
  exercises: ExerciseData[],
  customSessions?: number,
  customWeeks?: number,
): GeneratedProgram {
  const template = GOAL_TEMPLATES[goal];
  const sessionsPerWeek = customSessions ?? template.sessionsPerWeek;
  const durationWeeks = customWeeks ?? template.durationWeeks;

  const daysToUse = template.days.slice(0, sessionsPerWeek);
  while (daysToUse.length < sessionsPerWeek) {
    const idx = daysToUse.length % template.days.length;
    const extra = { ...template.days[idx], label: `Séance ${daysToUse.length + 1} — ${template.days[idx].focus}` };
    daysToUse.push(extra);
  }

  const usedIds = new Set<string>();
  const allMeals: { meal: string; recipe: string }[] = [];

  const sessions: GeneratedSession[] = daysToUse.map((dayTpl, idx) => {
    const sessionExercises: GeneratedExercise[] = [];

    dayTpl.blocks.forEach(block => {
      const isMobilityBlock = block.type === 'Mobility';

      // Pool : type + niveau + objectif
      // Pour les blocs Mobility : accepter Mobility OU Renfo-Core,
      // et ne pas filtrer sur les objectifs (la mobilité s'applique à tous)
      let pool = exercises.filter(ex => {
        const typeMatch = isMobilityBlock
          ? (ex.type === 'Mobility' || ex.type === 'Renfo-Core')
          : ex.type === block.type;
        const levelOk = ex.level === level
          || ex.level === 'Débutant'
          || (level === 'Avancé' && ex.level === 'Intermédiaire');
        const goalOk = isMobilityBlock
          ? true
          : (ex.goals.includes(goal) || ex.goals.includes('Renfo général'));
        return typeMatch && levelOk && goalOk;
      });

      // Fallback : si aucun exercice trouvé, ouvrir à n'importe quel type
      if (pool.length === 0) {
        pool = exercises.filter(ex => {
          const levelOk = ex.level === level
            || ex.level === 'Débutant'
            || (level === 'Avancé' && ex.level === 'Intermédiaire');
          return levelOk;
        });
      }
      // Dernier recours : tous les exercices
      if (pool.length === 0) pool = [...exercises];

      const fresh = pool.filter(ex => !usedIds.has(ex.id));
      const candidates = fresh.length >= block.count ? fresh : pool;
      const shuffled = [...candidates].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, block.count);

      selected.forEach(ex => {
        usedIds.add(ex.id);
        if (ex.meals && ex.meals.length > 0 && allMeals.length < 4) {
          ex.meals.forEach(m => { if (!allMeals.find(am => am.meal === m.meal)) allMeals.push(m); });
        }

        // Calcul sets/reps propre (évite toute concaténation)
        let sets = ex.sets;
        let repsNum = ex.value;            // number
        const isTime = ex.mode === 'time';

        if (goal === 'Force') {
          sets = Math.min(sets + 1, 6);
          if (!isTime) repsNum = Math.max(repsNum - 4, 3);
        }
        if (goal === 'Prise de masse') {
          sets = Math.min(sets + 1, 5);
        }
        if (goal === 'Endurance' || goal === 'Perte de poids') {
          sets = Math.max(sets - 1, 2);
          repsNum = isTime ? Math.min(repsNum + 10, 90) : repsNum + 3;
        }
        if (level === 'Débutant') {
          sets = Math.max(sets - 1, 2);
          repsNum = isTime ? Math.max(repsNum - 10, 20) : Math.max(repsNum - 2, 6);
        }
        if (level === 'Avancé') {
          sets = Math.min(sets + 1, 6);
        }

        const reps = isTime ? `${repsNum}s` : `${repsNum}`;

        let restSec = ex.rest_seconds;
        if (goal === 'Force') restSec += 30;
        if (goal === 'Endurance' || goal === 'Perte de poids') restSec = Math.max(restSec - 15, 20);
        const rest = `${restSec}s`;

        sessionExercises.push({
          exerciseId: ex.id,
          name: ex.name,
          type: ex.type,
          primary_muscle: ex.primary_muscle,
          mode: ex.mode,
          sets,
          reps,
          rest,
          notes: ex.instructions.tips[0] || '',
          meals: ex.meals,
          instructions: ex.instructions,
        });
      });
    });

    return { day: idx + 1, label: dayTpl.label, focus: dayTpl.focus, exercises: sessionExercises };
  });

  const weeklyMealPlan: { meal: string; recipe: string }[] = [];
  const mealNames = ['Petit déjeuner', 'Déjeuner', 'Collation', 'Dîner'];
  mealNames.forEach(mealName => {
    const found = allMeals.find(m => m.meal === mealName);
    if (found) weeklyMealPlan.push(found);
  });

  const titleMap: Record<GoalType, string> = {
    'Perte de poids': 'Programme Brûle-Graisses',
    'Prise de masse': 'Programme Hypertrophie',
    'Maintien': 'Programme Maintien',
    'Force': 'Programme Force Pure',
    'Endurance': 'Programme Endurance',
    'Renfo général': 'Programme Renforcement Complet',
    'Mobilité': 'Programme Mobilité & Souplesse',
  };

  return {
    title: `${titleMap[goal]} — ${level} ${durationWeeks} sem.`,
    goal,
    level,
    durationWeeks,
    sessionsPerWeek,
    sessions,
    summary: template.summary,
    weeklyMealPlan,
  };
}
