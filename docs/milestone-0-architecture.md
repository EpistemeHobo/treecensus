# Milestone 0 — System Architecture

## Objective

Define the overall system architecture, major components, data flow, user roles, initial technology stack, and known constraints for the Tree Census System.

---

## 1. System Overview

The Tree Census System is a multi-component platform that replaces paper-based tree census workflows with a modular digital pipeline. It spans offline field data collection, cloud-based ingestion and processing, a secure web portal, and periodic on-premise backup.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TREE CENSUS SYSTEM                           │
│                                                                     │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │  Field Layer │───▶│   Cloud Layer    │───▶│   Portal Layer   │  │
│  │  (Zoho Form) │    │     (GCP)        │    │  (Next.js Web)   │  │
│  └──────────────┘    └────────┬─────────┘    └──────────────────┘  │
│                               │                                     │
│                               ▼                                     │
│                    ┌──────────────────────┐                         │
│                    │  On-Premise Backup   │                         │
│                    │  (Institution Srv)   │                         │
│                    └──────────────────────┘                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Major Components

### 2.1 Field Layer — Offline-Capable Digital Form

| Item | Decision |
|------|----------|
| Platform | Zoho Forms (current); replaceable via adapter |
| Operation | Offline-first; auto-sync on reconnect |
| Output | Form submission payload (JSON/CSV) sent to cloud ingestion endpoint |
| Constraints | Form platform must support offline storage and background sync |

### 2.2 Cloud Layer — GCP Backend

| Sub-component | Purpose |
|--------------|---------|
| **Ingestion Service** | Receives raw form submissions, timestamps, validates schema, stores to Raw store |
| **Raw Data Store** | Cloud Storage bucket — immutable raw submission archive |
| **Transformation Pipeline** | Cloud Functions or Dataflow job — cleans, validates, deduplicates, and promotes to processed tables |
| **Processed Data Store** | BigQuery — structured, queryable census data |
| **Metadata & Audit Store** | BigQuery tables for submission logs, transformation logs, user access logs |
| **API Layer** | Cloud Run service exposing REST API to the web portal |

### 2.3 Portal Layer — Web Portal

| Item | Decision |
|------|----------|
| Framework | Next.js (React) |
| Runtime | Node.js |
| Hosting | Cloud Run (GCP) or Firebase Hosting (static export) |
| Auth | JWT-based session via backend; roles enforced server-side |
| UI Design | Pulse Interface Core design system (dark theme, coral/violet palette) |

### 2.4 On-Premise Backup

| Item | Decision |
|------|----------|
| Trigger | Scheduled Cloud Scheduler job |
| Transfer | gsutil / Cloud Storage Transfer to institutional server via SFTP or rsync |
| Scope | Raw data, processed data, report outputs, metadata snapshots |
| Frequency | Daily incremental, weekly full |

---

## 3. Data Flow

```
[Field Device]
     │  (form submit — online or offline queue)
     ▼
[Zoho Forms / Form Provider]
     │  (webhook / API push on sync)
     ▼
[GCP Ingestion Service — Cloud Run]
     │  ├─ Validate schema
     │  ├─ Timestamp submission
     │  └─ Write to Raw Store (Cloud Storage)
     ▼
[Raw Data Store — Cloud Storage]
     │  (event trigger on new object)
     ▼
[Transformation Pipeline — Cloud Functions]
     │  ├─ Clean and normalize fields
     │  ├─ Species/location lookup validation
     │  ├─ Deduplication check
     │  ├─ Write transformation log
     │  └─ Write to Processed Store (BigQuery)
     ▼
[Processed Data Store — BigQuery]
     │  (queried by API layer)
     ▼
[API Layer — Cloud Run]
     │  (REST endpoints consumed by portal)
     ▼
[Web Portal — Next.js]
     │  ├─ Standard query & filter
     │  ├─ SQL interface (admin only)
     │  ├─ Dashboard & map visualization
     │  ├─ CSV / Excel export
     │  └─ Smart report generator
     ▼
[On-Premise Backup Server]
     (scheduled pull from Cloud Storage + BigQuery exports)
```

---

## 4. User Roles

| Role | Description | Portal Access |
|------|-------------|--------------|
| **Field User** | Collects data using the digital form in the field | No portal access (form only) |
| **Data Viewer** | Reviews census records, runs standard queries, exports data | Read-only: table view, filter, CSV export |
| **Data Manager** | Validates, flags, or corrects records; runs reports | Data Viewer + record editing, report generation |
| **Analyst** | Runs advanced queries and custom reports | Data Manager + SQL interface, saved queries |
| **Administrator** | Manages users, monitors ingestion, reviews audit logs | Full access including user management, system logs |

---

## 5. Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Form | Zoho Forms | Current platform; offline + sync capability |
| Cloud Platform | GCP | Scalable, managed services, BigQuery for analytics |
| Ingestion | Cloud Run (Python/FastAPI) | Stateless, scalable, easy webhook receiver |
| Raw Store | Cloud Storage (GCS) | Immutable, low-cost, audit-friendly |
| Transform | Cloud Functions (Python) | Event-driven, triggered on new GCS objects |
| Processed DB | BigQuery | SQL-native, scales to large datasets, exports easily |
| API | Cloud Run (Python/FastAPI) | RESTful, JWT auth, thin adapter over BigQuery |
| Web Portal | Next.js + React | Modern JS stack, good ecosystem for dashboards |
| Portal Hosting | Cloud Run or Firebase Hosting | GCP-native, auto-scaling |
| Auth | Firebase Auth or custom JWT | Role-based, integrates with GCP IAM |
| Maps | Leaflet.js or Google Maps JS API | Tree location visualization |
| Charts | Recharts or Chart.js | Dashboard summaries |
| Backup | Cloud Scheduler + gsutil / Transfer | Periodic, automated, logged |

---

## 6. Data Model (High-Level)

### Raw Submissions
```
raw_submissions/
  {year}/{month}/{day}/
    {submission_id}.json      ← immutable, original form payload
```

### Processed Tables (BigQuery)
```
tree_census.submissions       ← one row per form submission (with raw ref)
tree_census.trees             ← one row per tree (deduplicated, standardized)
tree_census.species           ← reference table
tree_census.locations         ← reference table (plot, site, coordinates)
tree_census.users             ← portal user accounts and roles
tree_census.audit_log         ← all data changes and access events
tree_census.transformation_log ← pipeline run history
```

---

## 7. Design System

The portal uses the **Pulse Interface Core** design system:

- **Theme:** Dark (`#09090E` background)
- **Primary accent:** Coral `#FF6A55`
- **Secondary accent:** Violet `#8B5CF6`
- **Neutral text:** `#F4F1EA`
- **Muted text:** `#A9A3B5`
- **Surface style:** Glassmorphism with gradient border shells
- **Typography:** Inter (display 120px, body 15px, labels 15px)
- **Corner radii:** 13px, 16px family
- **Auth page background:** WebGL fine-line lattice with breathing pulse animation (see `auth_page_effect_example.html`)

---

## 8. Known Constraints and Assumptions

### Constraints
- Field devices may have no internet connectivity for extended periods.
- The form platform (Zoho Forms) controls the offline sync mechanism; the backend must be tolerant of delayed or out-of-order submissions.
- Sensitive location data requires row-level access controls in the portal.
- The institution requires all data to be physically backed up on-premise.
- Report outputs may require signatures for formal submissions.

### Assumptions
- Field users will have Android or iOS tablets with the Zoho Forms mobile app installed.
- Each form submission maps to one tree observation.
- The GCP project will be set up under the institution's Google Workspace account.
- The institutional on-premise server can accept SFTP or rsync connections from GCP.
- Species and location reference data will be seeded initially and maintained by Data Managers.

---

## 9. Milestone 0 Acceptance Criteria

- [x] System architecture diagram defined
- [x] Four major components described with sub-components
- [x] End-to-end data flow documented
- [x] Five user roles defined with access levels
- [x] Technology stack selected with rationale
- [x] High-level data model outlined
- [x] Design system referenced
- [x] Known constraints and assumptions listed

---

## 10. Next Step — Milestone 1

Proceed to **Milestone 1 — Digital Form Prototype**:
- Define required fields for the tree census form
- Set up validation rules in Zoho Forms
- Test offline data collection and sync behavior
- Document known limitations of the Zoho Forms platform

---

*Document version: 1.0 | Status: Complete | Date: 2026-06-27*
