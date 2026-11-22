/**
 * Main Application Logic & UI Controller
 * Office Asset Management System
 */

const App = {
  state: {
    currentUser: null,
    currentTab: 'dashboard',
    assets: [],
    categories: [],
    departments: [],
    locations: [],
    employees: [],
    selectedAsset: null
  },

  async init() {
    this.bindEvents();
    const authenticated = await this.checkAuth();
    if (authenticated) {
      await this.loadMetadata();
      await this.switchTab('dashboard');
    }
  },

  // Authentication State & Session Check
  // Authentication State & Session Check
  async checkAuth() {
    const token = localStorage.getItem('assetflow_token');
    if (!token || token === 'undefined' || token === 'null') {
      localStorage.removeItem('assetflow_token');
      localStorage.removeItem('assetflow_user');
      this.showAuthPortal();
      return false;
    }

    try {
      const res = await API.getMe();
      if (res && res.success && res.user) {
        this.state.currentUser = res.user;
        this.updateUserUI(res.user);
        this.showApp();
        return true;
      }
      
      this.showAuthPortal();
      return false;
    } catch (err) {
      // API.request() already clears localStorage and calls showAuthPortal() on 401
      return false;
    }
  },


  showAuthPortal(message = '') {
    const portal = document.getElementById('authPortal');
    const app = document.getElementById('appContainer');
    if (portal) portal.style.display = 'flex';
    if (app) app.style.display = 'none';

    if (message) {
      this.setAuthAlert(message, 'info');
    }
  },

  showApp() {
    const portal = document.getElementById('authPortal');
    const app = document.getElementById('appContainer');
    if (portal) portal.style.display = 'none';
    if (app) app.style.display = 'flex';
  },

  switchAuthTab(tab) {
    const btnIn = document.getElementById('tabBtnSignIn');
    const btnUp = document.getElementById('tabBtnSignUp');
    const formIn = document.getElementById('signInForm');
    const formUp = document.getElementById('signUpForm');

    this.clearAuthAlert();

    if (tab === 'signin') {
      if (btnIn) btnIn.classList.add('active');
      if (btnUp) btnUp.classList.remove('active');
      if (formIn) formIn.style.display = 'flex';
      if (formUp) formUp.style.display = 'none';
    } else {
      if (btnUp) btnUp.classList.add('active');
      if (btnIn) btnIn.classList.remove('active');
      if (formUp) formUp.style.display = 'flex';
      if (formIn) formIn.style.display = 'none';
    }
  },

  setAuthAlert(message, type = 'error') {
    const alertBox = document.getElementById('authAlert');
    if (!alertBox) return;
    alertBox.className = `auth-alert ${type}`;
    alertBox.textContent = message;
    alertBox.style.display = 'flex';
  },

  clearAuthAlert() {
    const alertBox = document.getElementById('authAlert');
    if (alertBox) {
      alertBox.textContent = '';
      alertBox.style.display = 'none';
    }
  },

  async handleSignIn(e) {
    if (e && e.preventDefault) e.preventDefault();
    this.clearAuthAlert();

    const idInput = document.getElementById('signInIdentifier');
    const pwdInput = document.getElementById('signInPassword');
    const submitBtn = document.getElementById('signInSubmitBtn');

    const identifier = idInput ? idInput.value.trim() : '';
    const password = pwdInput ? pwdInput.value : '';

    if (!identifier || !password) {
      this.setAuthAlert('Please enter your work email/username and password.', 'error');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      const textSpan = submitBtn.querySelector('.btn-text');
      if (textSpan) textSpan.textContent = 'Verifying credentials...';
    }

    try {
      const res = await API.login({ emailOrUsername: identifier, password });
      if (res.success && res.token) {
        localStorage.setItem('assetflow_token', res.token);
        localStorage.setItem('assetflow_user', JSON.stringify(res.user));
        this.state.currentUser = res.user;
        this.updateUserUI(res.user);
        this.showToast(`Welcome, ${res.user.full_name}!`, 'success');
        this.showApp();
        await this.loadMetadata();
        await this.switchTab('dashboard');
      } else {
        this.setAuthAlert(res.error || 'Failed to sign in', 'error');
      }
    } catch (err) {
      this.setAuthAlert(err.message || 'Incorrect credentials', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        const textSpan = submitBtn.querySelector('.btn-text');
        if (textSpan) textSpan.textContent = 'Sign In to Dashboard';
      }
    }
  },

  demoLogin(email, password) {
    const idInput = document.getElementById('signInIdentifier');
    const pwdInput = document.getElementById('signInPassword');
    if (idInput) idInput.value = email;
    if (pwdInput) pwdInput.value = password;
    this.switchAuthTab('signin');
    this.handleSignIn();
  },

  async handleSignUp(e) {
    if (e && e.preventDefault) e.preventDefault();
    this.clearAuthAlert();

    const fullNameInput = document.getElementById('signUpFullName');
    const emailInput = document.getElementById('signUpEmail');
    const usernameInput = document.getElementById('signUpUsername');
    const roleSelect = document.getElementById('signUpRole');
    const pwdInput = document.getElementById('signUpPassword');
    const confirmPwdInput = document.getElementById('signUpConfirmPassword');
    const submitBtn = document.getElementById('signUpSubmitBtn');

    const fullName = fullNameInput ? fullNameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const username = usernameInput ? usernameInput.value.trim() : '';
    const role = roleSelect ? roleSelect.value : 'Staff Member';
    const password = pwdInput ? pwdInput.value : '';
    const confirmPassword = confirmPwdInput ? confirmPwdInput.value : '';

    if (password !== confirmPassword) {
      this.setAuthAlert('Passwords do not match. Please re-enter them.', 'error');
      return;
    }

    if (password.length < 6) {
      this.setAuthAlert('Password must be at least 6 characters.', 'error');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      const textSpan = submitBtn.querySelector('.btn-text');
      if (textSpan) textSpan.textContent = 'Creating account...';
    }

    try {
      const res = await API.register({
        full_name: fullName,
        email,
        username,
        role,
        password
      });

      if (res.success && res.token) {
        localStorage.setItem('assetflow_token', res.token);
        localStorage.setItem('assetflow_user', JSON.stringify(res.user));
        this.state.currentUser = res.user;
        this.updateUserUI(res.user);
        this.showToast(`Account registered! Welcome to AssetFlow, ${res.user.full_name}`, 'success');
        this.showApp();
        await this.loadMetadata();
        await this.switchTab('dashboard');
      } else {
        this.setAuthAlert(res.error || 'Failed to register account.', 'error');
      }
    } catch (err) {
      this.setAuthAlert(err.message || 'Registration failed.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        const textSpan = submitBtn.querySelector('.btn-text');
        if (textSpan) textSpan.textContent = 'Create Account & Enter Portal';
      }
    }
  },

  async handleLogout() {
    try {
      await API.logout();
    } catch (err) {
      console.warn('Logout API request error:', err);
    }
    localStorage.removeItem('assetflow_token');
    localStorage.removeItem('assetflow_user');
    this.state.currentUser = null;
    this.showToast('You have been signed out successfully.', 'info');
    this.showAuthPortal('You have been signed out.');
  },

  updateUserUI(user) {
    if (!user) return;
    const initials = (user.full_name || 'User')
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    // Sidebar
    const sName = document.getElementById('sidebarUserName');
    const sRole = document.getElementById('sidebarUserRole');
    const sAvatar = document.getElementById('sidebarUserAvatar');
    if (sName) sName.textContent = user.full_name;
    if (sRole) sRole.textContent = user.role || 'System Online';
    if (sAvatar) {
      sAvatar.textContent = initials;
      if (user.avatar_color) sAvatar.style.background = user.avatar_color;
    }

    // Top Header
    const hName = document.getElementById('headerUserName');
    const hRole = document.getElementById('headerUserRole');
    const hAvatar = document.getElementById('headerUserAvatar');
    if (hName) hName.textContent = user.full_name;
    if (hRole) hRole.textContent = user.role || 'Online';
    if (hAvatar) {
      hAvatar.textContent = initials;
      if (user.avatar_color) hAvatar.style.background = user.avatar_color;
    }
  },

  togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      if (btn) btn.style.color = '#818cf8';
    } else {
      input.type = 'password';
      if (btn) btn.style.color = '#64748b';
    }
  },

  showForgotInfo() {
    this.setAuthAlert('To reset your credentials, contact david.kim@company.com (IT Infrastructure) or use the 1-Click Demo Login.', 'info');
  },

  bindEvents() {
    // Nav menu items
    document.querySelectorAll('.nav-item[data-tab]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = el.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // Modal background dismiss
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closeAllModals();
        }
      });
    });

    // Close buttons inside modals
    document.querySelectorAll('.modal-close, [data-modal-close]').forEach(btn => {
      btn.addEventListener('click', () => this.closeAllModals());
    });

    // Keyboard ESC to close modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeAllModals();
    });

    // Search input debouncer
    const assetSearch = document.getElementById('assetSearchInput');
    if (assetSearch) {
      let timer;
      assetSearch.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => this.loadAssets(), 250);
      });
    }

    // Category filter
    const catFilter = document.getElementById('assetCategoryFilter');
    if (catFilter) {
      catFilter.addEventListener('change', () => this.loadAssets());
    }

    // Status filter buttons
    document.querySelectorAll('.asset-status-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.asset-status-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.loadAssets();
      });
    });

    // Add Asset Form Submit
    const addAssetForm = document.getElementById('addAssetForm');
    if (addAssetForm) {
      addAssetForm.addEventListener('submit', (e) => this.handleAddAsset(e));
    }

    // Checkout Form Submit
    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
      checkoutForm.addEventListener('submit', (e) => this.handleCheckout(e));
    }

    // Return Form Submit
    const returnForm = document.getElementById('returnForm');
    if (returnForm) {
      returnForm.addEventListener('submit', (e) => this.handleReturn(e));
    }

    // Maintenance Form Submit
    const maintenanceForm = document.getElementById('maintenanceForm');
    if (maintenanceForm) {
      maintenanceForm.addEventListener('submit', (e) => this.handleCreateMaintenance(e));
    }

    // Resolve Maintenance Form Submit
    const resolveMaintForm = document.getElementById('resolveMaintenanceForm');
    if (resolveMaintForm) {
      resolveMaintForm.addEventListener('submit', (e) => this.handleResolveMaintenance(e));
    }
  },

  async loadMetadata() {
    try {
      const [cats, depts, locs, emps] = await Promise.all([
        API.getCategories(),
        API.getDepartments(),
        API.getLocations(),
        API.getEmployees()
      ]);

      this.state.categories = cats.data || [];
      this.state.departments = depts.data || [];
      this.state.locations = locs.data || [];
      this.state.employees = emps.data || [];

      this.populateSelectOptions();
    } catch (err) {
      this.showToast('Failed to load application metadata', 'error');
    }
  },

  populateSelectOptions() {
    // Populate category dropdowns
    const catOptions = this.state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    const catFilter = document.getElementById('assetCategoryFilter');
    if (catFilter) {
      catFilter.innerHTML = `<option value="ALL">All Categories</option>` + catOptions;
    }
    const assetCatSelect = document.getElementById('assetCategorySelect');
    if (assetCatSelect) assetCatSelect.innerHTML = catOptions;

    // Populate locations
    const locOptions = this.state.locations.map(l => `<option value="${l.id}">${l.building} - ${l.floor} (${l.room})</option>`).join('');
    const assetLocSelect = document.getElementById('assetLocationSelect');
    if (assetLocSelect) assetLocSelect.innerHTML = locOptions;

    // Populate employees for checkout modal
    const empOptions = this.state.employees.map(e => `<option value="${e.id}">${e.full_name} (${e.employee_id} - ${e.department_name || 'Staff'})</option>`).join('');
    const checkoutEmpSelect = document.getElementById('checkoutEmployeeSelect');
    if (checkoutEmpSelect) checkoutEmpSelect.innerHTML = empOptions;
  },

  async switchTab(tabName) {
    this.state.currentTab = tabName;

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(el => {
      if (el.getAttribute('data-tab') === tabName) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Update view active state
    document.querySelectorAll('.tab-view').forEach(view => {
      view.classList.remove('active');
    });

    const activeView = document.getElementById(`tab-${tabName}`);
    if (activeView) {
      activeView.classList.add('active');
    }

    // Update Header title
    const titles = {
      dashboard: { title: 'Executive Overview', subtitle: 'Live asset valuation, allocations, and lifecycle status' },
      assets: { title: 'Asset Inventory', subtitle: 'Hardware, monitors, furniture & digital asset catalog' },
      allocations: { title: 'Check-out & Assignments', subtitle: 'Employee hardware allocations and return management' },
      maintenance: { title: 'Maintenance & Service', subtitle: 'Equipment repair tickets and vendor warranties' },
      depreciation: { title: 'Financial & Depreciation Engine', subtitle: 'Straight-line valuation according to GAAP / IAS 16' },
      labels: { title: 'Asset QR Label Station', subtitle: 'Printable hardware barcode tags and inspection labels' },
      audit: { title: 'Audit Trail & Compliance', subtitle: 'Chronological activity history and modification logs' }
    };

    const header = titles[tabName] || { title: 'Office Asset Manager', subtitle: 'Enterprise Edition' };
    const hTitle = document.getElementById('pageHeaderTitle');
    const hSub = document.getElementById('pageHeaderSubtitle');
    if (hTitle) hTitle.textContent = header.title;
    if (hSub) hSub.textContent = header.subtitle;

    // Load tab-specific data
    if (tabName === 'dashboard') await this.loadDashboard();
    else if (tabName === 'assets') await this.loadAssets();
    else if (tabName === 'allocations') await this.loadAllocations();
    else if (tabName === 'maintenance') await this.loadMaintenance();
    else if (tabName === 'depreciation') await this.loadDepreciation();
    else if (tabName === 'labels') await this.loadLabels();
    else if (tabName === 'audit') await this.loadAudit();
  },

  async loadDashboard() {
    try {
      const res = await API.getDashboard();
      const { summary, categoryDistribution, departmentDistribution, expiringWarranties, recentActivity } = res;

      // Update KPI Cards
      document.getElementById('kpiTotalAssets').textContent = summary.totalAssets;
      document.getElementById('kpiTotalCost').textContent = `$${summary.totalPurchaseCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      document.getElementById('kpiBookValue').textContent = `$${summary.totalCurrentBookValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      document.getElementById('kpiAssignedCount').textContent = `${summary.assignedCount} Assets`;
      document.getElementById('kpiAvailableCount').textContent = `${summary.availableCount} in stock`;
      document.getElementById('kpiMaintenanceCount').textContent = `${summary.maintenanceCount} Tickets`;

      // Render Charts
      const donutCanvas = document.getElementById('categoryDonutCanvas');
      Charts.renderDonut(donutCanvas, categoryDistribution);

      const deptListContainer = document.getElementById('departmentBarList');
      Charts.renderBarList(deptListContainer, departmentDistribution);

      // Render Upcoming Warranties
      const warrantyContainer = document.getElementById('warrantyAlertList');
      if (warrantyContainer) {
        if (!expiringWarranties || expiringWarranties.length === 0) {
          warrantyContainer.innerHTML = `<p style="font-size: 0.85rem; color: #64748b; padding: 12px 0;">All warranties currently healthy. No expirations within next 90 days.</p>`;
        } else {
          warrantyContainer.innerHTML = expiringWarranties.map(w => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
              <div>
                <strong style="font-size: 0.85rem; color: #0f172a;">${w.name}</strong>
                <div style="font-size: 0.72rem; color: #64748b; font-family: monospace;">${w.asset_tag}</div>
              </div>
              <span class="badge badge-critical">${w.daysLeft} days left</span>
            </div>
          `).join('');
        }
      }

      // Render Recent Activity
      const activityContainer = document.getElementById('recentActivityFeed');
      if (activityContainer) {
        activityContainer.innerHTML = recentActivity.map(item => `
          <div class="activity-item">
            <div class="activity-bullet"></div>
            <div class="activity-content">
              <p>${item.details}</p>
              <div class="activity-meta">${new Date(item.timestamp).toLocaleString()} • ${item.performed_by}</div>
            </div>
          </div>
        `).join('');
      }

    } catch (err) {
      this.showToast('Error loading dashboard analytics', 'error');
    }
  },

  async loadAssets() {
    try {
      const search = document.getElementById('assetSearchInput')?.value || '';
      const category_id = document.getElementById('assetCategoryFilter')?.value || 'ALL';
      const activeStatusPill = document.querySelector('.asset-status-pill.active');
      const status = activeStatusPill ? activeStatusPill.getAttribute('data-status') : 'ALL';

      const res = await API.getAssets({ search, category_id, status });
      this.state.assets = res.data || [];

      const tbody = document.getElementById('assetsTableBody');
      if (!tbody) return;

      if (this.state.assets.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 32px; color: #64748b;">No assets found matching current criteria.</td></tr>`;
        return;
      }

      tbody.innerHTML = this.state.assets.map(asset => {
        const statusBadge = this.getStatusBadge(asset.status);
        const conditionBadge = `<span class="badge badge-neutral">${asset.condition || 'Good'}</span>`;
        const assignedDisplay = asset.assigned_employee_name 
          ? `<div><strong>${asset.assigned_employee_name}</strong><br><span style="font-size: 0.74rem; color: #64748b;">${asset.department_name || 'Staff'}</span></div>`
          : `<span style="color: #94a3b8; font-style: italic;">Unassigned (Inventory)</span>`;

        return `
          <tr>
            <td>
              <div style="font-family: monospace; font-weight: 700; color: #4f46e5;">${asset.asset_tag}</div>
              <div style="font-size: 0.74rem; color: #94a3b8; font-family: monospace;">${asset.serial_number}</div>
            </td>
            <td>
              <div style="font-weight: 600; color: #0f172a;">${asset.name}</div>
              <div style="font-size: 0.74rem; color: #64748b;">${asset.manufacturer || ''} ${asset.model || ''}</div>
            </td>
            <td><span class="badge badge-neutral">${asset.category_name || 'General'}</span></td>
            <td>${statusBadge}</td>
            <td>
              <div><strong>$${asset.purchase_cost.toLocaleString()}</strong></div>
              <div style="font-size: 0.74rem; color: #059669;">Book: $${asset.financials.currentBookValue.toLocaleString()}</div>
            </td>
            <td>${assignedDisplay}</td>
            <td style="text-align: right;">
              <div style="display: inline-flex; gap: 6px;">
                <button class="btn btn-secondary btn-sm" onclick="App.openAssetDetailModal(${asset.id})" title="Details & QR">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  Details
                </button>
                ${asset.status === 'Available' ? `
                  <button class="btn btn-primary btn-sm" onclick="App.openCheckoutModal(${asset.id})">Assign</button>
                ` : ''}
                ${asset.status === 'Assigned' ? `
                  <button class="btn btn-secondary btn-sm" onclick="App.openReturnModalForAsset(${asset.id})">Return</button>
                ` : ''}
                <button class="btn btn-secondary btn-sm" onclick="App.openMaintenanceModal(${asset.id})" title="Log Issue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      this.showToast('Error loading asset list', 'error');
    }
  },

  async loadAllocations() {
    try {
      const res = await API.getAllocations();
      const records = res.data || [];
      const tbody = document.getElementById('allocationsTableBody');
      if (!tbody) return;

      if (records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 32px; color: #64748b;">No allocation history found.</td></tr>`;
        return;
      }

      tbody.innerHTML = records.map(al => {
        const isCurrent = al.status === 'Active';
        const statusBadge = isCurrent 
          ? `<span class="badge badge-assigned"><span class="badge-dot"></span>Active</span>`
          : `<span class="badge badge-available"><span class="badge-dot"></span>Returned</span>`;

        return `
          <tr>
            <td>
              <div style="font-family: monospace; font-weight: 700; color: #4f46e5;">${al.asset_tag}</div>
              <div style="font-size: 0.8rem; color: #0f172a; font-weight: 600;">${al.asset_name}</div>
            </td>
            <td>
              <div style="font-weight: 600; color: #0f172a;">${al.employee_name}</div>
              <div style="font-size: 0.74rem; color: #64748b;">${al.emp_code} • ${al.department_name || 'Staff'}</div>
            </td>
            <td>${new Date(al.allocated_date).toLocaleDateString()}</td>
            <td>${al.expected_return_date ? new Date(al.expected_return_date).toLocaleDateString() : '<span style="color:#94a3b8;">Open-ended</span>'}</td>
            <td>${statusBadge}</td>
            <td style="text-align: right;">
              ${isCurrent ? `
                <button class="btn btn-secondary btn-sm" onclick="App.openReturnModal(${al.id}, '${al.asset_tag}', '${al.employee_name}')">
                  Check-in / Return
                </button>
              ` : `
                <span style="font-size: 0.74rem; color: #64748b;">Returned ${new Date(al.returned_date).toLocaleDateString()}</span>
              `}
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      this.showToast('Error loading allocation history', 'error');
    }
  },

  async loadMaintenance() {
    try {
      const res = await API.getMaintenanceRecords();
      const tickets = res.data || [];
      const tbody = document.getElementById('maintenanceTableBody');
      if (!tbody) return;

      if (tickets.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 32px; color: #64748b;">No maintenance tickets found.</td></tr>`;
        return;
      }

      tbody.innerHTML = tickets.map(ticket => {
        let pClass = 'badge-neutral';
        if (ticket.priority === 'Critical') pClass = 'badge-critical';
        else if (ticket.priority === 'High') pClass = 'badge-maintenance';
        else if (ticket.priority === 'Medium') pClass = 'badge-neutral';

        const priorityBadge = `<span class="badge ${pClass}">${ticket.priority}</span>`;
        const isResolved = ticket.status === 'Completed' || ticket.status === 'Cancelled';

        return `
          <tr>
            <td>
              <div style="font-family: monospace; font-weight: 700;">${ticket.ticket_number}</div>
              <div style="font-size: 0.74rem; color: #64748b;">${new Date(ticket.reported_date).toLocaleDateString()}</div>
            </td>
            <td>
              <div style="font-weight: 600; color: #0f172a;">${ticket.asset_name}</div>
              <div style="font-family: monospace; font-size: 0.74rem; color: #4f46e5;">${ticket.asset_tag}</div>
            </td>
            <td style="max-width: 240px; font-size: 0.82rem;">${ticket.issue_description}</td>
            <td>${priorityBadge}</td>
            <td>
              <span class="badge ${isResolved ? 'badge-available' : 'badge-maintenance'}">
                <span class="badge-dot"></span>${ticket.status}
              </span>
            </td>
            <td>$${parseFloat(ticket.cost || 0).toFixed(2)}</td>
            <td style="text-align: right;">
              ${!isResolved ? `
                <button class="btn btn-secondary btn-sm" onclick="App.openResolveMaintenanceModal(${ticket.id}, '${ticket.ticket_number}', ${ticket.cost || 0})">
                  Update / Resolve
                </button>
              ` : `
                <span style="font-size: 0.74rem; color: #059669; font-weight: 600;">Resolved</span>
              `}
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      this.showToast('Error loading maintenance tickets', 'error');
    }
  },

  async loadDepreciation() {
    try {
      const res = await API.getDepreciationReport();
      const assets = res.data || [];
      const tbody = document.getElementById('depreciationTableBody');
      if (!tbody) return;

      tbody.innerHTML = assets.map(a => {
        const pctUsed = Math.min(100, Math.round(a.depreciation_percentage));
        return `
          <tr>
            <td>
              <div style="font-family: monospace; font-weight: 700; color: #4f46e5;">${a.asset_tag}</div>
              <div style="font-size: 0.8rem; color: #0f172a; font-weight: 600;">${a.name}</div>
            </td>
            <td>${a.category}</td>
            <td>${a.purchase_date}</td>
            <td><strong>$${a.purchase_cost.toLocaleString()}</strong></td>
            <td>$${a.annual_depreciation.toLocaleString()}/yr</td>
            <td>$${a.accumulated_depreciation.toLocaleString()}</td>
            <td>
              <div style="font-weight: 700; color: #059669;">$${a.current_book_value.toLocaleString()}</div>
              <div class="progress-bar-wrap" title="${pctUsed}% depreciated">
                <div class="progress-bar-fill" style="width: ${100 - pctUsed}%;"></div>
              </div>
              <div style="font-size: 0.7rem; color: #64748b; margin-top: 2px;">${a.remaining_years} yrs remaining (${100 - pctUsed}% book value)</div>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      this.showToast('Error loading depreciation schedule', 'error');
    }
  },

  async loadLabels() {
    try {
      const res = await API.getAssets();
      const assets = res.data || [];
      const container = document.getElementById('labelsGridContainer');
      if (!container) return;

      container.innerHTML = assets.map(a => `
        <div class="card" style="padding: 16px; text-align: center; border: 2px dashed #cbd5e1; background: #fff;">
          <div style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; font-weight: 700;">
            OFFICE ASSET INVENTORY TAG
          </div>
          <div style="font-family: monospace; font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 6px 0;">
            ${a.asset_tag}
          </div>
          <img src="/api/assets/${a.id}/qr" style="width: 140px; height: 140px; margin: 4px auto; display: block;" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'140\\' height=\\'140\\'><rect width=\\'140\\' height=\\'140\\' fill=\\'%23f1f5f9\\'/><text x=\\'50%\\' y=\\'50%\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' font-family=\\'monospace\\' fill=\\'%2364748b\\'>QR TAG</text></svg>'">
          <div style="font-size: 0.8rem; font-weight: 700; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${a.name}
          </div>
          <div style="font-size: 0.7rem; color: #64748b; font-family: monospace;">
            SN: ${a.serial_number}
          </div>
          <div style="margin-top: 8px; font-size: 0.68rem; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 6px;">
            Property of Corp • Do Not Remove
          </div>
        </div>
      `).join('');
    } catch (err) {
      this.showToast('Error loading label sticker cards', 'error');
    }
  },

  async loadAudit() {
    try {
      const res = await API.getAuditLogs(100);
      const logs = res.data || [];
      const tbody = document.getElementById('auditTableBody');
      if (!tbody) return;

      tbody.innerHTML = logs.map(l => `
        <tr>
          <td><span style="font-family: monospace; font-size: 0.78rem;">${new Date(l.timestamp).toLocaleString()}</span></td>
          <td><span class="badge badge-neutral">${l.action}</span></td>
          <td style="font-weight: 600; color: #0f172a;">${l.performed_by}</td>
          <td style="color: #334155; font-size: 0.83rem;">${l.details}</td>
        </tr>
      `).join('');
    } catch (err) {
      this.showToast('Error loading audit log', 'error');
    }
  },

  // Helper: Status badge
  getStatusBadge(status) {
    switch (status) {
      case 'Available':
        return '<span class="badge badge-available"><span class="badge-dot"></span>Available</span>';
      case 'Assigned':
        return '<span class="badge badge-assigned"><span class="badge-dot"></span>Assigned</span>';
      case 'In Maintenance':
        return '<span class="badge badge-maintenance"><span class="badge-dot"></span>In Maintenance</span>';
      case 'Decommissioned':
      case 'Disposed':
        return '<span class="badge badge-critical"><span class="badge-dot"></span>Decommissioned</span>';
      default:
        return `<span class="badge badge-neutral">${status}</span>`;
    }
  },

  // Modal Openers
  openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('active');
  },

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(el => el.classList.remove('active'));
  },

  openAddAssetModal() {
    const form = document.getElementById('addAssetForm');
    if (form) form.reset();
    this.openModal('modalAddAsset');
  },

  async openAssetDetailModal(assetId) {
    try {
      const res = await API.getAssetById(assetId);
      const asset = res.data;
      this.state.selectedAsset = asset;

      document.getElementById('detailAssetTag').textContent = asset.asset_tag;
      document.getElementById('detailAssetName').textContent = asset.name;
      document.getElementById('detailCategory').textContent = asset.category_name || 'General';
      document.getElementById('detailSerial').textContent = asset.serial_number;
      document.getElementById('detailModel').textContent = `${asset.manufacturer || ''} ${asset.model || ''}`;
      document.getElementById('detailStatus').innerHTML = this.getStatusBadge(asset.status);
      document.getElementById('detailPurchaseCost').textContent = `$${asset.purchase_cost.toLocaleString()}`;
      document.getElementById('detailBookValue').textContent = `$${asset.financials.currentBookValue.toLocaleString()}`;
      document.getElementById('detailAccDepreciation').textContent = `$${asset.financials.accumulatedDepreciation.toLocaleString()}`;
      document.getElementById('detailWarranty').textContent = asset.warranty_expiry || 'N/A';
      document.getElementById('detailLocation').textContent = `${asset.building || 'HQ'} - ${asset.floor || ''} (${asset.room || 'General'})`;
      document.getElementById('detailAssignedTo').textContent = asset.assigned_employee_name 
        ? `${asset.assigned_employee_name} (${asset.assigned_employee_id} - ${asset.department_name})`
        : 'In Stock (Unassigned)';

      // QR Code image
      const qrImg = document.getElementById('detailQrImage');
      if (qrImg) qrImg.src = asset.qrCodeDataUrl;

      // Allocation History in modal
      const allocList = document.getElementById('detailAllocHistory');
      if (allocList) {
        if (!asset.allocations || asset.allocations.length === 0) {
          allocList.innerHTML = `<p style="font-size: 0.78rem; color: #94a3b8;">No assignment history.</p>`;
        } else {
          allocList.innerHTML = asset.allocations.map(al => `
            <div style="font-size: 0.8rem; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
              <strong>${al.employee_name}</strong> (${al.emp_code})<br>
              <span style="font-size: 0.72rem; color: #64748b;">
                ${new Date(al.allocated_date).toLocaleDateString()} ➔ ${al.returned_date ? new Date(al.returned_date).toLocaleDateString() : 'Present (Active)'}
              </span>
            </div>
          `).join('');
        }
      }

      this.openModal('modalAssetDetail');
    } catch (err) {
      this.showToast('Failed to load asset details', 'error');
    }
  },

  openCheckoutModal(assetId) {
    const asset = this.state.assets.find(a => a.id === assetId);
    if (!asset) return;

    document.getElementById('checkoutAssetId').value = asset.id;
    document.getElementById('checkoutAssetDisplay').textContent = `${asset.asset_tag} - ${asset.name}`;
    this.openModal('modalCheckout');
  },

  openReturnModalForAsset(assetId) {
    // Find active allocation for asset
    API.getAllocations('Active').then(res => {
      const alloc = (res.data || []).find(a => a.asset_id === assetId);
      if (alloc) {
        this.openReturnModal(alloc.id, alloc.asset_tag, alloc.employee_name);
      } else {
        this.showToast('No active allocation found for this asset', 'warning');
      }
    });
  },

  openReturnModal(allocationId, assetTag, employeeName) {
    document.getElementById('returnAllocationId').value = allocationId;
    document.getElementById('returnAssetDisplay').textContent = `${assetTag} (Assigned to: ${employeeName})`;
    this.openModal('modalReturn');
  },

  openMaintenanceModal(assetId) {
    const asset = this.state.assets.find(a => a.id === assetId);
    document.getElementById('maintenanceAssetId').value = assetId;
    document.getElementById('maintenanceAssetDisplay').textContent = asset ? `${asset.asset_tag} - ${asset.name}` : `Asset #${assetId}`;
    this.openModal('modalMaintenance');
  },

  openResolveMaintenanceModal(ticketId, ticketNumber, currentCost) {
    document.getElementById('resolveTicketId').value = ticketId;
    document.getElementById('resolveTicketNumberDisplay').textContent = ticketNumber;
    document.getElementById('resolveCost').value = currentCost || 0;
    this.openModal('modalResolveMaintenance');
  },

  // Form Submissions
  async handleAddAsset(e) {
    e.preventDefault();
    const form = e.target;
    const payload = {
      name: form.name.value.trim(),
      category_id: form.category_id.value,
      serial_number: form.serial_number.value.trim(),
      model: form.model.value.trim(),
      manufacturer: form.manufacturer.value.trim(),
      purchase_date: form.purchase_date.value,
      purchase_cost: parseFloat(form.purchase_cost.value),
      salvage_value: parseFloat(form.salvage_value.value || 0),
      useful_life_years: parseInt(form.useful_life_years.value || 4, 10),
      warranty_expiry: form.warranty_expiry.value || null,
      location_id: form.location_id.value,
      notes: form.notes.value.trim()
    };

    try {
      const res = await API.createAsset(payload);
      this.showToast(res.message || 'Asset registered successfully!', 'success');
      this.closeAllModals();
      await this.loadAssets();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleCheckout(e) {
    e.preventDefault();
    const form = e.target;
    const payload = {
      asset_id: parseInt(form.asset_id.value, 10),
      employee_id: parseInt(form.employee_id.value, 10),
      expected_return_date: form.expected_return_date.value || null,
      checkout_notes: form.checkout_notes.value.trim()
    };

    try {
      const res = await API.checkoutAsset(payload);
      this.showToast(res.message || 'Asset assigned!', 'success');
      this.closeAllModals();
      if (this.state.currentTab === 'assets') await this.loadAssets();
      else if (this.state.currentTab === 'allocations') await this.loadAllocations();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleReturn(e) {
    e.preventDefault();
    const form = e.target;
    const payload = {
      allocation_id: parseInt(form.allocation_id.value, 10),
      return_condition: form.return_condition.value,
      return_notes: form.return_notes.value.trim()
    };

    try {
      const res = await API.checkinAsset(payload);
      this.showToast(res.message || 'Asset checked in!', 'success');
      this.closeAllModals();
      if (this.state.currentTab === 'assets') await this.loadAssets();
      else if (this.state.currentTab === 'allocations') await this.loadAllocations();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleCreateMaintenance(e) {
    e.preventDefault();
    const form = e.target;
    const payload = {
      asset_id: parseInt(form.asset_id.value, 10),
      issue_description: form.issue_description.value.trim(),
      priority: form.priority.value,
      assigned_vendor: form.assigned_vendor.value.trim(),
      cost: parseFloat(form.cost.value || 0)
    };

    try {
      const res = await API.createMaintenance(payload);
      this.showToast(res.message || 'Ticket created!', 'success');
      this.closeAllModals();
      if (this.state.currentTab === 'assets') await this.loadAssets();
      else if (this.state.currentTab === 'maintenance') await this.loadMaintenance();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleResolveMaintenance(e) {
    e.preventDefault();
    const form = e.target;
    const ticketId = parseInt(form.ticket_id.value, 10);
    const payload = {
      status: form.status.value,
      cost: parseFloat(form.cost.value || 0),
      resolution_notes: form.resolution_notes.value.trim(),
      return_to_available: form.return_to_available.checked
    };

    try {
      const res = await API.updateMaintenance(ticketId, payload);
      this.showToast(res.message || 'Ticket resolved!', 'success');
      this.closeAllModals();
      if (this.state.currentTab === 'maintenance') await this.loadMaintenance();
      else if (this.state.currentTab === 'assets') await this.loadAssets();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // Toast Notification Dispatcher
  showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div style="flex: 1;">${message}</div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
