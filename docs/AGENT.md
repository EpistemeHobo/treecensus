# AGENT.md — Tree Census System Project

## Project Concept

This project develops a digital tree census system for field data collection, cloud-based data processing, controlled data access, reporting, and long-term backup. The system is designed to replace or augment paper-based tree census workflows with an offline-capable digital workflow that can support field teams, data managers, researchers, and administrators.

The system has four major components:

1. **Offline-capable digital form**

   * Field users collect tree census data using a mobile/tablet form.
   * The form must work offline during fieldwork.
   * Data should automatically sync when internet connectivity becomes available.
   * The current working platform is Zoho Forms, but the system design should remain modular enough to support replacement or extension in the future.

2. **Cloud data processing system**

   * A GCP-based backend receives synced form submissions.
   * Raw form data is validated, cleaned, transformed, and stored in an analysis-ready structure.
   * The cloud layer should separate raw submission data from processed and curated datasets.
   * The system should support traceability from processed records back to original form submissions.

3. **Web portal**

   * Users access the system through a login-controlled web portal.
   * The portal provides multiple modes of data access and visualization:

     * Standard query interface
     * SQL query interface for authorized users
     * Dashboard summaries
     * Map-based visualization
     * CSV / Excel export
     * Smart report generation
   * The smart report function should allow users to select data, summarize results, insert images or text, and include signatures where required.

4. **Periodic on-premise backup**

   * Cloud data should be backed up periodically to an on-premise server.
   * Backup should include raw data, processed data, report outputs, and essential metadata.
   * Backup design should support disaster recovery, audit, and long-term institutional data retention.

5. **Design**
   * Maintheme read from Pulse---Interface-Core-DESIGN.md
   * Effect example that we would use on auth page read from auth_page_effect_example.html
   

## Guiding Principles

* Keep the system modular.
* Preserve raw field submissions.
* Separate raw, cleaned, processed, and report-ready data.
* Design for offline-first field operation.
* Prioritize data traceability and auditability.
* Avoid hard-coding one form provider into the whole architecture.
* Build secure user access from the beginning.
* Make backup and recovery part of the system design, not an afterthought.
* Deliver the project in small, testable milestones.

## Milestones

### Milestone 0 — Project Scoping and System Architecture

Define the overall system architecture, major components, data flow, user roles, and expected outputs.

Expected outcome:

* System architecture diagram
* Main user roles
* High-level data flow
* Initial technology stack decision
* List of known constraints and assumptions

---

### Milestone 1 — Digital Form Prototype

Create or refine the offline-capable digital tree census form.

Expected outcome:

* Working digital form prototype
* Required field list
* Validation rules
* Offline data collection test
* Sync behavior test
* Known limitations of the current form platform

---

### Milestone 2 — Field Test Workflow

Test the digital form in real or simulated field conditions.

Expected outcome:

* Field testing protocol
* Comparison between paper and digital workflow
* Usability issues
* Data completeness issues
* Sync issues
* Required form improvements

---

### Milestone 3 — Cloud Ingestion Layer

Build the first cloud-side mechanism to receive and store submitted form data.

Expected outcome:

* GCP project structure
* Raw submission storage
* Basic ingestion pipeline
* Submission timestamping
* Error logging
* Initial data backup point

---

### Milestone 4 — Data Transformation Pipeline

Transform raw form submissions into structured, queryable, and analysis-ready datasets.

Expected outcome:

* Cleaned data table
* Standardized tree census schema
* Data validation report
* Duplicate and missing-value checks
* Transformation logs
* Versioned processed dataset

---

### Milestone 5 — Core Database Design

Design and implement the main database structure for the tree census system.

Expected outcome:

* Database schema
* Raw data table
* Processed data table
* Tree/location/species-related tables
* User and access-control-related tables
* Metadata and audit tables

---

### Milestone 6 — Basic Web Portal

Develop the first login-controlled web portal for viewing and querying census data.

Expected outcome:

* User login
* Basic role-based access
* Data table view
* Standard search and filter
* Record detail view
* Basic CSV / Excel export

---

### Milestone 7 — Advanced Query and Export

Add advanced data access functions for technical users and administrators.

Expected outcome:

* SQL query interface for authorized users
* Saved query support
* Export filtered result as CSV / Excel
* Query logging
* Access restriction for sensitive functions

---

### Milestone 8 — Dashboard and Map Visualization

Add dashboard and geographic visualization features.

Expected outcome:

* Summary dashboard
* Tree count summaries
* Species summaries
* Location-based summaries
* Interactive map
* Filterable visualization
* Exportable dashboard outputs

---

### Milestone 9 — Smart Report Generator

Develop a report generation function that allows users to summarize selected data.

Expected outcome:

* User-selectable dataset for report
* Auto-generated summary tables
* Auto-generated charts or maps where appropriate
* Manual text insertion
* Image upload or insertion
* Signature field support
* Exportable report file

---

### Milestone 10 — On-Premise Backup System

Implement periodic backup from GCP to the institutional on-premise server.

Expected outcome:

* Backup schedule
* Backup target directory structure
* Backup logs
* Raw data backup
* Processed data backup
* Report output backup
* Restore test

---

### Milestone 11 — Security, Audit, and Access Control Review

Review system security, user roles, audit logs, and data access boundaries.

Expected outcome:

* User role matrix
* Access-control policy
* Audit log review
* Data export permission review
* Backup access review
* Security improvement list

---

### Milestone 12 — End-to-End System Test

Test the full workflow from field data collection to cloud processing, portal display, reporting, export, and backup.

Expected outcome:

* End-to-end test dataset
* Full workflow test report
* Identified failure points
* Performance observations
* User acceptance feedback
* Final improvement list before production

---

### Milestone 13 — Production Deployment

Deploy the system for real project use.

Expected outcome:

* Production environment
* User accounts
* Production form
* Production database
* Production backup
* Deployment documentation
* Operational handover document

---

### Milestone 14 — Maintenance and Future Extension

Plan system maintenance and future development.

Expected outcome:

* Maintenance plan
* Backup monitoring plan
* User support workflow
* Change request process
* Future feature list
* Migration strategy if the form provider changes

## Agent Working Rules

When helping with this project, the agent should:

* Keep each milestone small and testable.
* Avoid jumping into implementation before the milestone objective is clear.
* Preserve validated behavior from previous milestones.
* Clearly separate concept, requirement, design, implementation, and testing.
* Produce concise but actionable outputs.
* When writing technical instructions, include:

  * Objective
  * Scope
  * Inputs
  * Expected outputs
  * Acceptance criteria
  * Stop condition
* Avoid over-engineering unless the user explicitly asks for production-grade design.
* Prefer modular architecture over vendor lock-in.
* Treat field usability as a core requirement, not a secondary concern.
* Treat backup, audit, and traceability as mandatory components.

## Suggested Command Style for Future Agents

For future coding or implementation prompts, use this structure:

```text
REPO:
<repository or working directory>

STATE:
<current milestone status and what already works>

OBJECTIVE:
<what this milestone should achieve>

CONSTRAINTS:
<platform, security, data, or deployment constraints>

TASKS:
<small implementation tasks>

ACCEPTANCE:
<how to know the milestone is complete>

STOP:
<where the agent should stop and report back>
```

## Current Project Summary

The tree census system should support offline field data collection, cloud-based processing on GCP, secure web-based access, dashboard and map visualization, flexible data export, smart report generation, and periodic backup to an on-premise server. The project should be implemented through staged milestones, beginning with form validation and field testing, then progressing to cloud ingestion, database design, web portal development, reporting, backup, security review, and production deployment.

