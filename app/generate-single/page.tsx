"use client";

import { Suspense } from 'react';
import { GenerateSinglePage } from '@/components/GenerateSinglePage';

function GenerateSinglePageWrapper() {
  return <GenerateSinglePage />;
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen bg-obsidian">
        <div className="text-center">
          <div className="inline-block mb-4 w-8 h-8 rounded-full border-4 animate-spin border-gold border-t-transparent"></div>
          <p className="text-pearl/60">加载中...</p>
        </div>
      </div>
    }>
      <GenerateSinglePageWrapper />
    </Suspense>
  );
}

