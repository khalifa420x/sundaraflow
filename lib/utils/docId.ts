// Génère un ID Firestore lisible depuis un email
// khalifa.j92@hotmail.com → "khalifa_j92"

export function emailToDocId(email: string): string {
  return email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
}
