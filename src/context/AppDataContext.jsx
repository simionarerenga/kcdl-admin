// src/context/AppDataContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Opens ONE set of Firestore real-time listeners when the app loads.
// Every section calls useAppData() instead of opening its own listeners.
// This means:
//   • Switching sections is instant (data is already loaded)
//   • Firebase connection count drops from ~40 to ~10
//   • All sections always show the same data at the same time
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import { db } from '../firebase';

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  // ── Field data ────────────────────────────────────────────────────────────
  const [cprEntries,   setCprEntries]   = useState([]);
  const [twcEntries,   setTwcEntries]   = useState([]);
  const [stock,        setStock]        = useState([]);   // shedStock collection
  const [shipments,    setShipments]    = useState([]);
  const [farmers,      setFarmers]      = useState([]);

  // ── Admin data ────────────────────────────────────────────────────────────
  const [users,        setUsers]        = useState([]);
  const [cooperatives, setCooperatives] = useState([]);
  const [islands,      setIslands]      = useState([]);
  const [villages,     setVillages]     = useState([]);

  // ── Phase 2: Pricing ──────────────────────────────────────────────────────
  const [pricing,      setPricing]      = useState([]);   // pricing history docs
  const [currentPrice, setCurrentPrice] = useState(null); // most recent price doc

  // ── Loading ───────────────────────────────────────────────────────────────
  // True until the three heaviest collections have their first snapshot
  const [loadCount,    setLoadCount]    = useState(0);
  const loading = loadCount < 3;

  const tick = () => setLoadCount(n => n + 1);

  useEffect(() => {
    const unsubs = [
      // Field data
      onSnapshot(collection(db, 'cprEntries'),
        s => setCprEntries(s.docs.map(d => ({ id: d.id, ...d.data() })))),

      onSnapshot(collection(db, 'twcEntries'),
        s => setTwcEntries(s.docs.map(d => ({ id: d.id, ...d.data() })))),

      onSnapshot(collection(db, 'shedStock'),
        s => { setStock(s.docs.map(d => ({ id: d.id, ...d.data() }))); tick(); }),

      onSnapshot(collection(db, 'shipments'),
        s => setShipments(s.docs.map(d => ({ id: d.id, ...d.data() })))),

      onSnapshot(collection(db, 'farmers'),
        s => setFarmers(s.docs.map(d => ({ id: d.id, ...d.data() })))),

      // Admin data
      onSnapshot(collection(db, 'users'),
        s => { setUsers(s.docs.map(d => ({ id: d.id, ...d.data() }))); tick(); }),

      onSnapshot(collection(db, 'cooperatives'),
        s => setCooperatives(s.docs.map(d => ({ id: d.id, ...d.data() })))),

      onSnapshot(collection(db, 'islands'),
        s => { setIslands(s.docs.map(d => ({ id: d.id, ...d.data() }))); tick(); }),

      onSnapshot(collection(db, 'villages'),
        s => setVillages(s.docs.map(d => ({ id: d.id, ...d.data() })))),

      // Phase 2: Pricing
      onSnapshot(
        query(collection(db, 'pricing'), orderBy('effectiveDate', 'desc')),
        s => {
          const docs = s.docs.map(d => ({ id: d.id, ...d.data() }));
          setPricing(docs);
          setCurrentPrice(docs[0] || null);
        }
      ),
    ];

    return () => unsubs.forEach(u => u());
  }, []);

  // Derived helpers used in multiple sections
  const inspectors = users.filter(u => u.role === 'inspector' || (!u.role && u.provisioned));

  const value = {
    // Raw collections
    cprEntries,
    twcEntries,
    stock,
    shipments,
    farmers,
    users,
    cooperatives,
    islands,
    villages,
    pricing,

    // Derived
    inspectors,
    currentPrice,   // { pricePerKg, currency, effectiveDate, setBy } | null

    // Global loading state
    loading,
  };

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside <AppDataProvider>');
  return ctx;
}
