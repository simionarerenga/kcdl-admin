# KCDL Admin — HQ Tarawa Operations Dashboard

**Kiribati Copra Development Ltd** · HQ Tarawa

React + Capacitor + Electron admin portal that connects to the same Firebase project as the **KCDL Copra Inspector** field app, giving HQ full visibility over all outer island copra operations.

---

## Features

| Section | Description |
|---|---|
| 📊 Dashboard | Live KPIs — total CPR/TWC weight, bags in storage, stations, daily totals |
| ⚡ Live Activity | Real-time stream of all field events (CPR, TWC, stock changes, farmer registrations) |
| 📋 CPR Records | Full CRUD view of all Copra Purchase Receipts with filters, search, photo viewer |
| 🚢 TWC Records | Truck Weighbridge Certificates by vessel, island, cooperative |
| ⚖️ Shed & Warehouse | Bag inventory tracker across all stages and stations |
| 🛳️ Shipments | Ready-to-ship manifest and shipment history |
| 👩‍🌾 Farmers Registry | All registered farmers — searchable, exportable |
| 📑 Reports Centre | 10 report formats — printable letterhead reports with date filters |
| 📈 Analytics | Monthly trends, island/cooperative performance charts |
| 🏝️ Stations | Manage outer island station profiles |
| 👤 User Management | Provision/de-provision inspector accounts |
| ⚙️ Settings | App info, Firebase links, admin profile |

## Reports Available

1. CPR Summary Report (by island, date range)
2. TWC Summary Report
3. Island Production Report
4. Station Activity Report
5. Daily Operations Report
6. Monthly Summary Report
7. Farmer Participation Report
8. Stock Status Report (by station)
9. Shipment Manifest
10. Cooperative Report

All reports render a print-ready letterhead document (KCDL branding).

---

## Tech Stack

- **React 18** + Vite 5
- **Capacitor 6** (Android APK)
- **Electron 32** (Desktop: Win/Mac/Linux)
- **Firebase** Firestore + Auth (project: `kcdl-1063a`) — same as Inspector app
- **GitHub Actions** — Android APK + Desktop builds

---

## Build

### Android APK
Trigger the **Android APK Build** workflow manually in GitHub Actions.
The `kcdl-admin.apk` artifact is uploaded upon success.

### Desktop
Trigger the **Desktop Build** workflow for Win/Mac/Linux installers.

### Development
```bash
npm install
npm run dev              # Web dev server
npm run electron:dev     # Electron dev mode
```

---

## Firebase Setup

This app shares the same Firebase project as the Copra Inspector app (`kcdl-1063a`). No separate project needed.

To grant HQ Admin access: create a user in Firebase Auth, then add a Firestore document at `users/{uid}` with `role: "admin"`.

---

*KCDL Copra Operations Platform · Confidential*
