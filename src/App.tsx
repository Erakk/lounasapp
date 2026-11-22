import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomeScreen } from './screens/HomeScreen';

// Only the home screen is in the first download. Other screens load when first opened
// (the map alone is ~220 kB; random pick and place pages bring the animation library).
const MapScreen = lazy(() => import('./screens/MapScreen'));
const RandomScreen = lazy(() => import('./screens/RandomScreen').then((m) => ({ default: m.RandomScreen })));
const MineScreen = lazy(() => import('./screens/MineScreen').then((m) => ({ default: m.MineScreen })));
const PlaceDetailScreen = lazy(() => import('./screens/PlaceDetailScreen').then((m) => ({ default: m.PlaceDetailScreen })));

const fallback = <div className="grid min-h-[70vh] place-items-center text-sm text-ink-2">Ladataan…</div>;
const wrap = (el: React.ReactNode) => <Suspense fallback={fallback}>{el}</Suspense>;

// HashRouter: works on any static host without server-side rewrites.
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomeScreen />} />
          <Route path="kartta" element={wrap(<MapScreen />)} />
          <Route path="arvo" element={wrap(<RandomScreen />)} />
          <Route path="omat" element={wrap(<MineScreen />)} />
          <Route path="paikka/:id" element={wrap(<PlaceDetailScreen />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
