'use client';

import { useRouter } from 'next/navigation';

export default function SelectRegisterPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-gray-900 p-10 rounded-2xl w-full max-w-2xl text-center">

        <h1 className="text-3xl mb-4">Bienvenue sur SundaraFlow</h1>
        <p className="text-gray-400 mb-10">
          Choisissez votre expérience pour continuer
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* COACH */}
          <div
            onClick={() => router.push('/register/coach')}
            className="cursor-pointer border border-gray-700 p-6 rounded-xl hover:border-white transition"
          >
            <h2 className="text-xl mb-2">Coach</h2>
            <p className="text-gray-400 text-sm">
              Je crée et vends des programmes
            </p>
          </div>

          {/* CLIENT */}
          <div
            onClick={() => router.push('/register/client')}
            className="cursor-pointer border border-gray-700 p-6 rounded-xl hover:border-white transition"
          >
            <h2 className="text-xl mb-2">Client</h2>
            <p className="text-gray-400 text-sm">
              Je suis un programme et j’accède à mon espace
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}