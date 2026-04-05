// generator.js
// Générateur de programme client
function generateProgram(clientLevel, goal, exercises, template) {
  const program = [];
  const usedExercises = new Set();

  template.day_templates.forEach(dayTemplate => {
    const day = { day: dayTemplate.day, exercises: [] };

    dayTemplate.blocks.forEach(block => {
      // Filtrer exercices selon type, niveau et objectif
      const filtered = exercises.filter(
        ex =>
          ex.type === block.type &&
          (ex.level === clientLevel || ex.level === "Débutant") &&
          ex.goals.includes(goal) &&
          !usedExercises.has(ex.id)
      );

      // Mélanger et choisir le nombre demandé
      const shuffled = filtered.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, block.count);

      selected.forEach(ex => usedExercises.add(ex.id));
      day.exercises.push(...selected);
    });

    program.push(day);
  });

  return program;
}

module.exports = { generateProgram };