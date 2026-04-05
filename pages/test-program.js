// /pages/test-program.js
import { useState, useEffect } from "react";
import exercisesData from "../data/exercises.json";

export default function TestProgram() {
  const [exercises, setExercises] = useState([]);
  const [program, setProgram] = useState([]);

  useEffect(() => {
    // Charge les exercices depuis le JSON
    setExercises(exercisesData);
  }, []);

  // Générateur de programme aléatoire
  const generateProgram = (count = 8) => {
    if (exercises.length === 0) return;
    const shuffled = [...exercises].sort(() => 0.5 - Math.random());
    setProgram(shuffled.slice(0, count));
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", background: "#121212", color: "#fff" }}>
      <h1 style={{ marginBottom: "1rem" }}>Test Exercices SundaraFlow</h1>
      <p>Total exercices disponibles : {exercises.length}</p>

      <button
        onClick={() => generateProgram(10)}
        style={{
          margin: "1rem 0",
          padding: "0.5rem 1rem",
          background: "#e63946",
          border: "none",
          borderRadius: "5px",
          color: "#fff",
          cursor: "pointer"
        }}
      >
        Générer un programme de 10 exercices
      </button>

      {program.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Programme généré :</h2>
          {program.map((ex) => (
            <div key={ex.id} style={{ marginBottom: "2rem", borderBottom: "1px solid #444", paddingBottom: "1rem" }}>
              <h3>{ex.name} ({ex.mode === "reps" ? ex.value + " reps" : ex.value + " sec"})</h3>
              <p><strong>Type:</strong> {ex.type} | <strong>Niveau:</strong> {ex.level}</p>
              <p><strong>Muscles principaux:</strong> {ex.primary_muscle}</p>
              <p><strong>Muscles secondaires:</strong> {ex.secondary_muscle?.join(", ") || "Aucun"}</p>
              <p><strong>Équipement:</strong> {ex.equipment?.join(", ") || "Aucun"}</p>
              <p><strong>Instructions:</strong></p>
              <ul>
                <li><strong>Setup:</strong> {ex.instructions?.setup || "N/A"}</li>
                <li><strong>Execution:</strong> {ex.instructions?.execution || "N/A"}</li>
                {ex.instructions?.tips?.map((tip, i) => <li key={i}><strong>Tip:</strong> {tip}</li>)}
                {ex.instructions?.common_mistakes?.map((err, i) => <li key={i}><strong>Erreur:</strong> {err}</li>)}
              </ul>
              <p><strong>Repas associés:</strong></p>
              <ul>
                {ex.meals?.map((meal, i) => (
                  <li key={i}><strong>{meal.meal}:</strong> {meal.recipe}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}