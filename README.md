\# Thesis Coordination Platform



\*\*MSc Medical Laboratory Science · Gulf Medical University\*\*



An internal academic operations platform for managing student thesis progress across the full research lifecycle.



\## Platform URLs



| Interface | URL |

|---|---|

| Coordinator dashboard | BASE\_URL |

| Reports and analytics | BASE\_URL?page=reports |

| Supervisor portal | BASE\_URL?page=supervisor |

| Student reflection form | BASE\_URL?page=reflection |



\## Quick setup



1\. Create Google Spreadsheet named: GMU MLS Thesis Coordination System

2\. Open Extensions → Apps Script → paste all .gs and .html files

3\. Run: Thesis System → Setup → Initialize all sheets

4\. Fill in CONFIG sheet: COORDINATOR\_EMAIL, COORDINATOR\_NAME, CURRENT\_SEMESTER

5\. Add coordinator to USERS sheet with role coordinator

6\. Import students via CSV\_IMPORT tab

7\. Deploy as Web App → copy URL → paste into CONFIG as WEB\_APP\_URL

8\. Install triggers: Thesis System → Setup → Install scheduled triggers



\## Documentation



\- DEPLOYMENT.md — deployment checklist and operations guide

\- DEVELOPMENT.md — clasp setup, branching, code rules



\## Maintainer



Thesis Coordinator, MSc Medical Laboratory Science — Gulf Medical University

