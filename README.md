<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thesis Coordination — GMU</title>
  <?!= include('Stylesheet') ?>
</head>
<body>

<div class="app-shell">

  <!-- ══════════════════════════════════════════════
       LOADING SCREEN
  ══════════════════════════════════════════════ -->
  <div class="loading-screen" id="loading-screen">
    <div class="spinner"></div>
    <span class="loading-label">Loading thesis coordination data…</span>
  </div>

  <!-- ══════════════════════════════════════════════
       SIDEBAR
  ══════════════════════════════════════════════ -->
  <nav class="sidebar" aria-label="Main navigation">
    <div class="sidebar-brand">
      <div class="brand-mark">
        <div class="brand-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
        </div>
        <div class="brand-wordmark">
          <div class="brand-name">Thesis Coordination</div>
          <div class="brand-inst">Gulf Medical University</div>
        </div>
      </div>
      <span class="semester-chip" id="sidebar-semester">—</span>
    </div>

    <div class="sidebar-nav">
      <div class="nav-label">Overview</div>
      <button class="nav-item active" id="nav-dashboard" onclick="Nav.show('dashboard')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        Dashboard
      </button>
      <button class="nav-item" id="nav-students" onclick="Nav.show('students')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        Students
        <span class="nav-badge" id="risk-badge" style="display:none">0</span>
      </button>
      <button class="nav-item" id="nav-milestones" onclick="Nav.show('milestones')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        Milestones
      </button>

      <div class="nav-label">Actions</div>
      <button class="nav-item" id="nav-email" onclick="Nav.show('email')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        Email centre
      </button>
      <button class="nav-item" id="nav-reports" onclick="Nav.show('reports')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        Reports
      </button>

      <div class="nav-label">System</div>
      <button class="nav-item" onclick="Actions.rebuildDashboard()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        Rebuild data
      </button>
      <button class="nav-item" id="nav-settings" onclick="Nav.show('settings')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        Settings
      </button>
    </div>

    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="user-avatar-sm" id="sidebar-avatar">—</div>
        <div>
          <div class="user-name-sm" id="sidebar-coordinator">Loading…</div>
          <div class="user-role-sm">Thesis Coordinator</div>
        </div>
      </div>
    </div>
  </nav>

  <!-- ══════════════════════════════════════════════
       MAIN AREA
  ══════════════════════════════════════════════ -->
  <div class="main-area">

    <!-- Topbar -->
    <header class="topbar">
      <div class="topbar-title-group">
        <div class="topbar-title" id="topbar-title">Dashboard</div>
        <div class="topbar-sub" id="topbar-sub">MSc Medical Laboratory Science</div>
      </div>
      <div class="topbar-actions">
        <div class="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="global-search" placeholder="Search students…" oninput="Table.filter()" autocomplete="off">
        </div>
        <button class="notif-btn" id="notif-btn" title="Notifications" onclick="Alerts.togglePanel()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span class="notif-dot" id="notif-dot" style="display:none"></span>
        </button>
        <button class="btn btn-secondary btn-sm" onclick="Actions.exportCSV()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export
        </button>
        <button class="btn btn-primary btn-sm" onclick="Nav.show('email')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          Send emails
        </button>
      </div>
    </header>

    <!-- Content area — views rendered here -->
    <main class="content-area" id="content-area">

      <!-- ═══ VIEW: DASHBOARD ═══ -->
      <div id="view-dashboard">

        <!-- Metrics grid -->
        <div class="metrics-grid" id="metrics-grid">
          <div class="metric-card c-teal">
            <div class="mc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
            <div class="mc-label">Active students</div>
            <div class="mc-value" id="m-total">—</div>
            <div class="mc-sub" id="m-total-sub">—</div>
          </div>
          <div class="metric-card c-green">
            <div class="mc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><polyline points="20 6 9 17 4 12"/></svg></div>
            <div class="mc-label">On track</div>
            <div class="mc-value" id="m-ontrack">—</div>
            <div class="mc-sub">No overdue milestones</div>
          </div>
          <div class="metric-card c-red">
            <div class="mc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
            <div class="mc-label">At risk</div>
            <div class="mc-value" id="m-risk">—</div>
            <div class="mc-sub">Require immediate attention</div>
          </div>
          <div class="metric-card c-amber">
            <div class="mc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
            <div class="mc-label">Monitoring</div>
            <div class="mc-value" id="m-monitor">—</div>
            <div class="mc-sub">Overdue 14–30 days</div>
          </div>
          <div class="metric-card c-blue">
            <div class="mc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
            <div class="mc-label">Milestones done</div>
            <div class="mc-value" id="m-ms">—</div>
            <div class="mc-sub">Across all students</div>
          </div>
          <div class="metric-card c-purple">
            <div class="mc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
            <div class="mc-label">Missing ORCID</div>
            <div class="mc-value" id="m-orcid">—</div>
            <div class="mc-sub">Registration incomplete</div>
          </div>
        </div>

        <!-- Alerts panel (hidden until populated) -->
        <div class="alerts-panel" id="alerts-panel" style="display:none">
          <div class="alerts-hdr" onclick="Alerts.togglePanel()">
            <div class="alerts-hdr-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <span class="alerts-hdr-title">Students requiring immediate attention</span>
            <span class="alerts-hdr-count" id="alerts-count">0</span>
            <span class="alerts-chevron open" id="alerts-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg></span>
          </div>
          <div class="alerts-body open" id="alerts-body">
            <div class="alerts-grid" id="alerts-grid"></div>
          </div>
        </div>

        <!-- Filter bar -->
        <div class="filter-bar">
          <div class="filter-group">
            <span class="filter-label">Supervisor</span>
            <select class="filter-select" id="f-supervisor" onchange="Table.filter()">
              <option value="">All supervisors</option>
            </select>
          </div>
          <div class="fdivider"></div>
          <div class="filter-group">
            <span class="filter-label">Risk</span>
            <select class="filter-select" id="f-risk" onchange="Table.filter()">
              <option value="">All</option>
              <option value="risk">At risk</option>
              <option value="monitor">Monitor</option>
              <option value="on">On track</option>
              <option value="done">Completed</option>
            </select>
          </div>
          <div class="fdivider"></div>
          <div class="filter-group">
            <span class="filter-label">Milestone</span>
            <select class="filter-select" id="f-milestone" onchange="Table.filter()">
              <option value="">All milestones</option>
            </select>
          </div>
          <button class="filter-clear" onclick="Table.clearFilters()">Clear filters</button>
          <span class="filter-count" id="filter-count"></span>
        </div>

        <!-- Student table -->
        <div class="table-card">
          <div class="table-hdr">
            <h3>Student progress</h3>
            <div style="display:flex;gap:7px;align-items:center">
              <button class="btn btn-secondary btn-sm" onclick="Actions.sendBulkReminders()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                Send reminders
              </button>
            </div>
          </div>
          <div class="table-scroll">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="sortable sort-none" onclick="Table.sort('studentName')" data-col="studentName">Student <span class="sort-ind"></span></th>
                  <th class="sortable sort-none" onclick="Table.sort('supervisorName')" data-col="supervisorName">Supervisor <span class="sort-ind"></span></th>
                  <th>Milestones</th>
                  <th class="sortable sort-none" onclick="Table.sort('progress')" data-col="progress">Progress <span class="sort-ind"></span></th>
                  <th>Last activity</th>
                  <th class="sortable sort-none" onclick="Table.sort('riskFlag')" data-col="riskFlag">Risk <span class="sort-ind"></span></th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="student-tbody">
                <tr><td colspan="7"><div class="empty-state"><div class="spinner"></div></div></td></tr>
              </tbody>
            </table>
          </div>
        </div>

      </div><!-- /view-dashboard -->

      <!-- ═══ VIEW: EMAIL ═══ -->
      <div id="view-email" style="display:none">
        <div style="max-width:600px">
          <div style="margin-bottom:18px">
            <div class="section-title">Email centre</div>
            <div style="font-size:var(--text-sm);color:var(--text-muted);margin-top:3px">Send targeted or bulk communications to students and supervisors.</div>
          </div>
          <div class="table-card" style="padding:22px;margin-bottom:18px">
            <div style="font-size:var(--text-base);font-weight:600;margin-bottom:14px">Automated sends</div>
            <div style="display:flex;flex-direction:column;gap:9px">
              <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--surface-muted)">
                <div>
                  <div style="font-size:var(--text-sm);font-weight:600">ORCID requests</div>
                  <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px">Send to all active students without ORCID on file</div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="Actions.sendBulkEmail('orcid')">Send now</button>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--surface-muted)">
                <div>
                  <div style="font-size:var(--text-sm);font-weight:600">Reflection reminders</div>
                  <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px">Remind all active students to submit milestone reflections</div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="Actions.sendBulkEmail('reflection')">Send now</button>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--surface-muted)">
                <div>
                  <div style="font-size:var(--text-sm);font-weight:600">Supervisor feedback reminders</div>
                  <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px">Prompt supervisors with no recent feedback submission</div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="Actions.sendBulkEmail('supervisor')">Send now</button>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--surface-muted)">
                <div>
                  <div style="font-size:var(--text-sm);font-weight:600">Overdue milestone alerts</div>
                  <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px">Email students with one or more overdue milestones</div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="Actions.sendBulkEmail('overdue')">Send now</button>
              </div>
            </div>
          </div>
          <div class="table-card" style="padding:22px">
            <div style="font-size:var(--text-base);font-weight:600;margin-bottom:14px">Custom announcement</div>
            <div class="form-group">
              <label class="form-label">Subject</label>
              <input class="form-input" type="text" id="bulk-subject" placeholder="Email subject line">
            </div>
            <div class="form-group">
              <label class="form-label">Message</label>
              <textarea class="form-textarea" id="bulk-body" style="min-height:120px" placeholder="Message body (HTML is supported)"></textarea>
            </div>
            <div style="display:flex;gap:8px;margin-top:4px">
              <button class="btn btn-primary btn-sm" onclick="Actions.sendCustomBulk('students')">Send to all students</button>
              <button class="btn btn-secondary btn-sm" onclick="Actions.sendCustomBulk('supervisors')">Send to all supervisors</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ VIEW: REPORTS ═══ -->
      <div id="view-reports" style="display:none">
        <div style="max-width:500px">
          <div class="section-title" style="margin-bottom:18px">Reports</div>
          <div class="table-card" style="padding:22px">
            <div style="display:flex;flex-direction:column;gap:9px">
              <button class="btn btn-secondary" onclick="Actions.generateBulkReports()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Generate all student reports
              </button>
              <button class="btn btn-secondary" onclick="Actions.rebuildDashboard()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                Rebuild dashboard sheet
              </button>
              <button class="btn btn-secondary" onclick="Actions.flagAtRisk()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                Recalculate risk flags
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ VIEW: SETTINGS ═══ -->
      <div id="view-settings" style="display:none">
        <div style="max-width:520px">
          <div class="section-title" style="margin-bottom:4px">System settings</div>
          <div style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:18px">Edit the CONFIG sheet in your spreadsheet to update these values.</div>
          <div class="table-card" id="settings-body" style="overflow:hidden"></div>
        </div>
      </div>

      <!-- ═══ VIEW: MILESTONES ═══ -->
      <div id="view-milestones" style="display:none">
        <div class="section-title" style="margin-bottom:18px">Milestone overview</div>
        <div class="table-card">
          <div class="table-scroll">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Proposal dev.</th>
                  <th>Proposal pres.</th>
                  <th>IRB submission</th>
                  <th>Data collection</th>
                  <th>Data analysis</th>
                  <th>Thesis writing</th>
                  <th>Final defense</th>
                </tr>
              </thead>
              <tbody id="milestone-tbody"></tbody>
            </table>
          </div>
        </div>
      </div>

    </main>
  </div><!-- /main-area -->

  <!-- ══════════════════════════════════════════════
       STUDENT PROFILE DRAWER
  ══════════════════════════════════════════════ -->
  <div class="profile-overlay" id="profile-overlay">
    <div class="profile-backdrop" id="profile-backdrop" onclick="Profile.close()"></div>
    <div class="profile-drawer" id="profile-drawer">

      <div class="drawer-topbar">
        <h2 id="drawer-name">Student profile</h2>
        <span class="drawer-reg" id="drawer-reg"></span>
        <button class="btn btn-ghost btn-icon btn-sm" onclick="Profile.close()" title="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div class="profile-tabs">
        <button class="ptab active" data-tab="overview"     onclick="Profile.switchTab(this)">Overview</button>
        <button class="ptab"        data-tab="milestones"   onclick="Profile.switchTab(this)">Milestones</button>
        <button class="ptab"        data-tab="reflections"  onclick="Profile.switchTab(this)">Reflections</button>
        <button class="ptab"        data-tab="feedback"     onclick="Profile.switchTab(this)">Supervisor feedback</button>
        <button class="ptab"        data-tab="notes"        onclick="Profile.switchTab(this)">Coordinator notes</button>
        <button class="ptab"        data-tab="comms"        onclick="Profile.switchTab(this)">Email history</button>
      </div>

      <div class="profile-body" id="profile-body">
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <div class="empty-state-title">No student selected</div>
          <p>Click on a student in the table to open their profile.</p>
        </div>
      </div>

      <div class="qa-bar" id="qa-bar" style="display:none">
        <button class="btn btn-secondary btn-sm" id="qa-orcid"     onclick="Profile.sendORCID()">Send ORCID request</button>
        <button class="btn btn-secondary btn-sm" id="qa-reminder"  onclick="Profile.sendReminder()">Send reminder</button>
        <button class="btn btn-secondary btn-sm" id="qa-flag"      onclick="Profile.toggleFlag()">Flag for follow-up</button>
        <button class="btn btn-primary btn-sm"   id="qa-email"     onclick="Profile.openEmailModal()">Send email</button>
      </div>
    </div>
  </div>

</div><!-- /app-shell -->

<!-- Toast container -->
<div class="toast-container" id="toast-container"></div>

<?!= include('JavaScript') ?>
</body>
</html>
