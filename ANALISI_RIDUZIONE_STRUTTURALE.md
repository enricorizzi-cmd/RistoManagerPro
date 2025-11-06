# Analisi Riduzione Strutturale - RistoManagerPro

## Obiettivo

Eliminare tutte le voci e schede tranne:

- **Impostazioni** (Settings)
- **Utenti** (Users)
- **Piano Finanziario** (Financial Plan)

## 📊 STATO ATTUALE

### 1. PAGINE/COMPONENTI FRONTEND

#### ✅ DA MANTENERE:

- `components/Settings.tsx` - Impostazioni
- `components/UserManagement.tsx` - Gestione Utenti
- `components/FinancialPlan.tsx` - Piano Finanziario
- `components/financial/*` - Tutti i componenti del piano finanziario:
  - `AnalisiFP.tsx`
  - `BusinessPlanForm.tsx`
  - `CausaliManager.tsx`
  - `FinancialOverview.tsx`
  - `InserisciDati.tsx`
  - `PlanTable.tsx`
  - `StatsTable.tsx`

#### ❌ DA ELIMINARE:

- `components/Dashboard.tsx` - Dashboard/Riepilogo
- `components/Reservations.tsx` - Prenotazioni
- `components/Analytics.tsx` - Analisi Vendite
- `components/TableManagement.tsx` - Gestione Tavoli
- `components/Crm.tsx` - Gestione Clienti
- `components/MenuEngineering.tsx` - Gestione Menu
- `components/SalesAnalytics.tsx` - Analisi Vendite
- `components/ReservationModal.tsx` - Modale Prenotazioni
- `components/WaitlistModal.tsx` - Modale Lista Attesa
- `components/WalkinWaitlistModal.tsx` - Modale Walk-in

### 2. TABELLE DATABASE

#### ✅ DA MANTENERE (Master DB - `master.db`):

- `users` - Utenti del sistema
- `user_sessions` - Sessioni utente
- `user_location_permissions` - Permessi utente per location
- `locations` - Sedi/Location
- `location_enabled_tabs` - Tab abilitate per location

#### ✅ DA MANTENERE (Company DB - `ristomanager_{locationId}.db`):

- `financial_plan_state` - Stato del piano finanziario
- `data_entries` - Dati inseriti manualmente (InserisciDati)
- `business_plan_drafts` - Bozze del business plan
- `financial_stats` - Statistiche finanziarie mensili

#### ❌ DA ELIMINARE (Company DB):

- `reservations` - Prenotazioni
- `tables` - Tavoli
- `waitlist` - Lista d'attesa
- `menu_items` - Voci di menu
- `sales` - Vendite
- `customers` - Clienti

### 3. API ENDPOINTS

#### ✅ DA MANTENERE:

**Autenticazione:**

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

**Piano Finanziario:**

- `GET /api/financial-plan/state`
- `PUT /api/financial-plan/state`

**Data Entries (InserisciDati):**

- `GET /api/data-entries/:locationId`
- `POST /api/data-entries/:locationId`
- `PUT /api/data-entries/:locationId/:entryId`
- `DELETE /api/data-entries/:locationId/:entryId`
- `GET /api/data-entries/:locationId/sums`

**Financial Stats:**

- `GET /api/financial-stats`
- `PUT /api/financial-stats`
- `POST /api/financial-stats/migrate`
- `POST /api/financial-stats/calculate-fatturato-totale`

**Business Plan Drafts:**

- `GET /api/business-plan-drafts`
- `PUT /api/business-plan-drafts`
- `DELETE /api/business-plan-drafts/:id`

**Gestione Utenti (Admin):**

- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id/permissions`
- `PUT /api/users/:id/status`
- `PUT /api/users/:id/role`
- `DELETE /api/users/:id`

**Impostazioni (Admin):**

- `GET /api/settings/locations`
- `POST /api/settings/locations`
- `PUT /api/settings/locations/:id`
- `DELETE /api/settings/locations/:id`
- `GET /api/settings/locations/:id/tabs`
- `PUT /api/settings/locations/:id/tabs`

**User Locations:**

- `GET /api/user/locations`
- `GET /api/user/locations/financial-plan`
- `GET /api/user/enabled-tabs/:locationId`

**Locations (pubbliche):**

- `GET /api/locations`
- `POST /api/locations`
- `PUT /api/locations/:id`

#### ❌ DA ELIMINARE:

- `GET /api/reservations/:locationId`
- `POST /api/reservations`
- `PUT /api/reservations/:id/status`
- `GET /api/tables/:locationId`
- `PUT /api/tables/:id/status`
- `PUT /api/tables/:locationId/layout`
- `GET /api/waitlist/:locationId`
- `POST /api/waitlist`
- `DELETE /api/waitlist/:id`
- `GET /api/menu-items/:locationId`
- `GET /api/sales/:locationId`
- `GET /api/customers/:locationId` (se esiste)
- `POST /api/init-default-data` (o modificare per non creare menu_items)

### 4. CONTEXT E HOOKS

#### ✅ DA MANTENERE:

- `contexts/AuthContext.tsx` - Autenticazione
- `hooks/useBusinessPlan.ts` - Business Plan
- `hooks/useDataEntriesSums.ts` - Somme Data Entries
- `hooks/useFinancialPlanData.ts` - Dati Piano Finanziario
- `hooks/useFinancialPlanLocations.ts` - Location Piano Finanziario
- `hooks/usePlanEditor.ts` - Editor Piano

#### ❌ DA MODIFICARE/ELIMINARE:

- `contexts/AppContext.tsx` - Rimuovere:
  - `reservations`, `waitlist`, `tables`, `customers`, `menuItems`, `sales`
  - Funzioni: `addReservation`, `updateReservationStatus`, `updateTableStatus`, `saveTableLayout`, `assignReservationToTable`, `seatWalkIn`, `addWaitlistEntry`, `removeWaitlistEntry`, `seatFromWaitlist`, `markWaitlistNoShow`, `clearTable`
  - Mantenere solo: `locations`, `currentLocation`, `setCurrentLocation`, `updateLocationSettings`, `loading`, `error`, `notifications`, `showNotification`, `sidebarCollapsed`, `toggleSidebar`

### 5. SERVIZI API

#### ✅ DA MANTENERE:

- `services/financialPlanApi.ts` - API Piano Finanziario

#### ❌ DA ELIMINARE/MODIFICARE:

- `services/apiService.ts` - Rimuovere funzioni per:
  - Reservations
  - Tables
  - Waitlist
  - Menu Items
  - Sales
  - Customers
  - Mantenere solo funzioni per Locations (se necessarie)

### 6. TYPES

#### ✅ DA MANTENERE:

- Tipi per Financial Plan
- Tipi per Users
- Tipi per Settings
- Tipi base: `RestaurantLocation`, `AppNotification`, `NotificationType`

#### ❌ DA ELIMINARE:

- `Reservation`, `ReservationStatus`
- `Table`, `TableStatus`
- `WaitlistEntry`
- `MenuItem`
- `Sale`
- `Customer`
- `KPIs` (se non usato dal piano finanziario)

### 7. NAVIGAZIONE

#### ✅ DA MANTENERE:

- Link a `#settings` - Impostazioni
- Link a `#users` - Utenti (solo admin)
- Link a `#financial-plan` - Piano Finanziario

#### ❌ DA ELIMINARE:

- Link a `#dashboard` - Dashboard
- Link a `#reservations` - Prenotazioni
- Link a `#analytics` - Analisi
- Link a `#table-management` - Gestione Tavoli
- Link a `#crm` - Clienti
- Link a `#menu-engineering` - Menu
- Link a `#sales-analytics` - Analisi Vendite
- Link a `#waitlist` - Lista Attesa

### 8. HEADER E COMPONENTI UI

#### ✅ DA MANTENERE:

- `components/Header.tsx` - Modificare per rimuovere bottone "Accogli Cliente"
- `components/Sidebar.tsx` - Rimuovere link non necessari
- `components/MobileNav.tsx` - Rimuovere link non necessari
- `components/NotificationContainer.tsx` - Mantenere

#### ❌ DA ELIMINARE:

- Riferimenti a modali di prenotazione/waitlist nel Header

## 📋 PIANO D'AZIONE

### FASE 1: Pulizia Frontend

1. Eliminare componenti non necessari
2. Rimuovere import e riferimenti in `App.tsx`
3. Aggiornare `Sidebar.tsx` e `MobileNav.tsx`
4. Pulire `AppContext.tsx`
5. Aggiornare `Header.tsx`

### FASE 2: Pulizia Backend

1. Rimuovere endpoint API non necessari
2. Rimuovere creazione tabelle non necessarie in `initializeDatabase()`
3. Pulire `apiService.ts`
4. Aggiornare default tabs in `location_enabled_tabs`

### FASE 3: Pulizia Types e Utils

1. Rimuovere tipi non necessari da `types.ts`
2. Verificare e pulire utilities

### FASE 4: Testing

1. Verificare che Settings funzioni
2. Verificare che Users funzioni
3. Verificare che Financial Plan funzioni
4. Verificare che non ci siano riferimenti a componenti eliminati

## ⚠️ ATTENZIONI

1. **Location "all"**: Mantenere la logica per la location "Tutti" per aggregazione dati finanziari
2. **User Permissions**: Mantenere il sistema di permessi utente-location
3. **Location Enabled Tabs**: Aggiornare i default tabs per includere solo `financial-plan`
4. **Database Migration**: Le tabelle eliminate non verranno più create, ma i dati esistenti rimarranno (non critico per sviluppo)

## 📝 NOTE FINALI

- Il sistema sarà molto più snello e focalizzato solo su:
  - Gestione utenti e permessi
  - Gestione location e impostazioni
  - Piano finanziario completo con tutte le sue funzionalità
