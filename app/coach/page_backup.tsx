'use client';

import ProtectedRoute from '../../components/ProtectedRoute';

export default function CoachPage() {
  return (
    <ProtectedRoute role="coach">
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <h1 className="text-3xl font-bold">Coach Dashboard</h1>
      </div>
    </ProtectedRoute>
  );
}