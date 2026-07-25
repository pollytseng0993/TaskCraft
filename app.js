/**
 * TaskCraft - Complete Web Application Logic with Real-time Cloud Sync
 */

document.addEventListener('DOMContentLoaded', () => {
  // --------------------------------------------------------------------------
  // 1. Initial State & Storage Keys
  // --------------------------------------------------------------------------
  const STORAGE_KEY_TASKS = 'taskcraft_tasks_v1';
  const STORAGE_KEY_THEME = 'taskcraft_theme_v1';
  const STORAGE_KEY_SYNC_CODE = 'taskcraft_synccode_v1';

  let tasks = loadTasks();
  let syncCode = localStorage.getItem(STORAGE_KEY_SYNC_CODE) || 'polly2026';
  let lastSyncTimestamp = 0;
  let isSyncing = false;

  let currentFilterTab = 'all'; // 'all', 'active', 'completed'
  let currentCategory = 'all';
  let currentSort = 'newest';
  let searchQuery = '';

  // DOM Elements
  const taskListEl = document.getElementById('task-list');
  const emptyStateEl = document.getElementById('empty-state');
  const addTaskForm = document.getElementById('add-task-form');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const backupBtn = document.getElementById('backup-btn');
  const syncStatusBtn = document.getElementById('sync-status-btn');
  const syncDot = document.querySelector('.sync-dot');

  // Search & Filter DOM Elements
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search');
  const filterCategorySelect = document.getElementById('filter-category');
  const sortBySelect = document.getElementById('sort-by');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const clearCompletedBtn = document.getElementById('clear-completed-btn');

  // Metric DOM Elements
  const progressCircle = document.getElementById('progress-circle');
  const progressPercentageEl = document.getElementById('progress-percentage');
  const progressStatusText = document.getElementById('progress-status-text');
  const totalCountEl = document.getElementById('total-count');
  const activeCountEl = document.getElementById('active-count');
  const completedCountEl = document.getElementById('completed-count');
  const highPriorityCountEl = document.getElementById('high-priority-count');

  const tabAllCount = document.getElementById('tab-all-count');
  const tabActiveCount = document.getElementById('tab-active-count');
  const tabCompletedCount = document.getElementById('tab-completed-count');

  // Modal Elements
  const editModal = document.getElementById('edit-modal');
  const editTaskForm = document.getElementById('edit-task-form');
  const closeEditModalBtn = document.getElementById('close-edit-modal');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');

  const backupModal = document.getElementById('backup-modal');
  const closeBackupModalBtn = document.getElementById('close-backup-modal');
  const exportJsonBtn = document.getElementById('export-json-btn');
  const importJsonBtn = document.getElementById('import-json-btn');
  const importJsonInput = document.getElementById('import-json-input');

  const syncModal = document.getElementById('sync-modal');
  const closeSyncModalBtn = document.getElementById('close-sync-modal');
  const cancelSyncBtn = document.getElementById('cancel-sync-btn');
  const saveSyncCodeBtn = document.getElementById('save-sync-code-btn');
  const syncCodeInput = document.getElementById('sync-code-input');
  const forceUploadBtn = document.getElementById('force-upload-btn');
  const forceDownloadBtn = document.getElementById('force-download-btn');

  // Set today's date in header & date input default
  initHeaderDate();
  initTheme();

  // Initial render & sync start
  renderApp();
  initCloudSync();

  // --------------------------------------------------------------------------
  // 2. Storage & Demo Data Loader
  // --------------------------------------------------------------------------
  function loadTasks() {
    const data = localStorage.getItem(STORAGE_KEY_TASKS);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error('Failed to parse saved tasks', e);
      }
    }
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    return [
      {
        id: 'demo-1',
        title: '새 프로젝트 아키텍처 및 디자인 시스템 구축',
        category: 'work',
        priority: 'high',
        dueDate: todayStr,
        note: '상세 가이드라인 문서 작성 및 팀원 공유',
        completed: false,
        createdAt: Date.now() - 3600000 * 4
      },
      {
        id: 'demo-2',
        title: '비타민 영양제 챙겨먹기 및 30분 산책',
        category: 'health',
        priority: 'medium',
        dueDate: todayStr,
        note: '',
        completed: true,
        createdAt: Date.now() - 3600000 * 12
      },
      {
        id: 'demo-3',
        title: '주말 식재료 구매 (우유, 계란, 야채)',
        category: 'shopping',
        priority: 'low',
        dueDate: tomorrowStr,
        note: '마켓컬리 세일 항목 확인하기',
        completed: false,
        createdAt: Date.now() - 3600000 * 24
      }
    ];
  }

  function saveTasks(skipCloudPush = false) {
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
    if (!skipCloudPush) {
      pushToCloudSync();
    }
  }

  function initHeaderDate() {
    const dateEl = document.getElementById('current-date');
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    if (dateEl) {
      dateEl.textContent = today.toLocaleDateString('ko-KR', options);
    }
    
    const dueDateInput = document.getElementById('task-duedate');
    if (dueDateInput) {
      dueDateInput.value = today.toISOString().split('T')[0];
    }
  }

  // --------------------------------------------------------------------------
  // 3. Theme Toggle & Persistence
  // --------------------------------------------------------------------------
  function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(STORAGE_KEY_THEME, newTheme);
    showToast(`테마가 ${newTheme === 'dark' ? '다크 모드' : '라이트 모드'}로 변경되었습니다.`, 'info');
  });

  // --------------------------------------------------------------------------
  // 4. Real-time Cloud Sync Engine (GitHub Gist Backend)
  // --------------------------------------------------------------------------
  // GitHub Gist ID - this is the actual cloud storage
  const GIST_ID = 'fc14d68995827b35cced728809dd1c0b';
  const GIST_FILE = 'taskcraft_sync.json';
  // Raw Gist URL (publicly readable, no auth needed for reads)
  const GIST_RAW_BASE = `https://gist.githubusercontent.com/pollytseng0993/${GIST_ID}/raw/`;
  // GitHub API URL for writes (uses gh token via a proxy or public read)
  const GIST_API_URL = `https://api.github.com/gists/${GIST_ID}`;

  function initCloudSync() {
    syncCodeInput.value = syncCode;
    pullFromCloudSync();
    // Poll every 3 seconds for real-time sync
    setInterval(pullFromCloudSync, 3000);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        lastSyncTimestamp = 0;
        pullFromCloudSync();
      }
    });
  }

  async function pushToCloudSync() {
    try {
      if (syncDot) syncDot.className = 'sync-dot syncing';
      const now = Date.now();
      lastSyncTimestamp = now;

      const payload = { updatedAt: now, tasks: tasks };
      const body = JSON.stringify(payload);

      // Write via GitHub Gist API - needs token
      const token = await getGhToken();
      if (!token) {
        // Fallback: use localStorage only
        if (syncDot) syncDot.className = 'sync-dot offline';
        return;
      }

      await fetch(GIST_API_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify({
          files: {
            [GIST_FILE]: { content: body }
          }
        })
      });

      if (syncDot) syncDot.className = 'sync-dot';
    } catch (e) {
      console.warn('Cloud sync push failed', e);
      if (syncDot) syncDot.className = 'sync-dot offline';
    }
  }

  async function pullFromCloudSync() {
    if (isSyncing) return;
    try {
      isSyncing = true;

      // Read via GitHub API with no-cache to always get latest
      const token = await getGhToken();
      const headers = { 'X-GitHub-Api-Version': '2022-11-28' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(GIST_API_URL, {
        headers: headers,
        cache: 'no-store'
      });
      if (!res.ok) { isSyncing = false; return; }

      const gistData = await res.json();
      const fileContent = gistData.files && gistData.files[GIST_FILE]
        ? gistData.files[GIST_FILE].content
        : null;

      if (fileContent) {
        const data = JSON.parse(fileContent);
        if (data && data.updatedAt && data.updatedAt > lastSyncTimestamp && Array.isArray(data.tasks)) {
          lastSyncTimestamp = data.updatedAt;
          tasks = data.tasks;
          saveTasks(true);
          renderApp();
        }
      }

      if (syncDot) syncDot.className = 'sync-dot';
    } catch (e) {
      console.warn('Cloud pull failed', e);
      if (syncDot) syncDot.className = 'sync-dot offline';
    } finally {
      isSyncing = false;
    }
  }

  async function getGhToken() {
    // Token is stored in localStorage by the user after setup
    return localStorage.getItem('taskcraft_gh_token') || null;
  }

  // Force Manual Push/Pull Handlers
  forceUploadBtn.addEventListener('click', async () => {
    if (!localStorage.getItem('taskcraft_gh_token')) {
      showToast('먼저 GitHub 토큰을 설정해 주세요.', 'danger');
      return;
    }
    lastSyncTimestamp = 0;
    await pushToCloudSync();
    syncModal.classList.add('hidden');
    showToast('현재 기기의 할 일이 구름으로 업로드되었습니다! ☁️', 'success');
  });

  forceDownloadBtn.addEventListener('click', async () => {
    lastSyncTimestamp = 0;
    await pullFromCloudSync();
    syncModal.classList.add('hidden');
    showToast('구름에서 최신 할 일을 불러왔습니다! ☁️', 'success');
  });

  // Sync Modal Handlers
  syncStatusBtn.addEventListener('click', () => {
    syncCodeInput.value = syncCode;
    syncModal.classList.remove('hidden');
  });

  closeSyncModalBtn.addEventListener('click', () => syncModal.classList.add('hidden'));
  cancelSyncBtn.addEventListener('click', () => syncModal.classList.add('hidden'));

  saveSyncCodeBtn.addEventListener('click', async () => {
    const ghTokenInput = document.getElementById('gh-token-input');
    const newToken = ghTokenInput ? ghTokenInput.value.trim() : '';

    if (newToken) {
      localStorage.setItem('taskcraft_gh_token', newToken);
    }

    lastSyncTimestamp = 0;
    await pullFromCloudSync();
    syncModal.classList.add('hidden');
    showToast('동기화 토큰이 저장되었습니다! 이제 실시간 동기화가 활성화됩니다.', 'success');
  });

  // --------------------------------------------------------------------------
  // 5. Task CRUD Logic
  // --------------------------------------------------------------------------
  addTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const titleInput = document.getElementById('task-title');
    const categorySelect = document.getElementById('task-category');
    const prioritySelect = document.getElementById('task-priority');
    const dueDateInput = document.getElementById('task-duedate');
    const noteInput = document.getElementById('task-note');

    const title = titleInput.value.trim();
    if (!title) return;

    const newTask = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title: title,
      category: categorySelect.value,
      priority: prioritySelect.value,
      dueDate: dueDateInput.value,
      note: noteInput.value.trim(),
      completed: false,
      createdAt: Date.now()
    };

    tasks.unshift(newTask);
    saveTasks();
    renderApp();

    titleInput.value = '';
    noteInput.value = '';
    showToast('새로운 할 일이 추가되었습니다!', 'success');
  });

  function toggleTaskCompletion(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      saveTasks();
      renderApp();
      showToast(task.completed ? '할 일을 완료했습니다! 🎉' : '진행 중으로 변경되었습니다.', 'success');
    }
  }

  function deleteTask(id) {
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex !== -1) {
      const deletedTask = tasks.splice(taskIndex, 1)[0];
      saveTasks();
      renderApp();
      showToast(`'${deletedTask.title}' 항목이 삭제되었습니다.`, 'danger');
    }
  }

  function openEditModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    document.getElementById('edit-task-id').value = task.id;
    document.getElementById('edit-task-title').value = task.title;
    document.getElementById('edit-task-category').value = task.category;
    document.getElementById('edit-task-priority').value = task.priority;
    document.getElementById('edit-task-duedate').value = task.dueDate || '';
    document.getElementById('edit-task-note').value = task.note || '';

    editModal.classList.remove('hidden');
  }

  function closeEditModal() {
    editModal.classList.add('hidden');
  }

  editTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-task-id').value;
    const task = tasks.find(t => t.id === id);

    if (task) {
      task.title = document.getElementById('edit-task-title').value.trim();
      task.category = document.getElementById('edit-task-category').value;
      task.priority = document.getElementById('edit-task-priority').value;
      task.dueDate = document.getElementById('edit-task-duedate').value;
      task.note = document.getElementById('edit-task-note').value.trim();

      saveTasks();
      renderApp();
      closeEditModal();
      showToast('할 일이 수정되었습니다.', 'info');
    }
  });

  closeEditModalBtn.addEventListener('click', closeEditModal);
  cancelEditBtn.addEventListener('click', closeEditModal);

  clearCompletedBtn.addEventListener('click', () => {
    const completedCount = tasks.filter(t => t.completed).length;
    if (completedCount === 0) {
      showToast('삭제할 완료된 항목이 없습니다.', 'info');
      return;
    }
    if (confirm(`완료된 ${completedCount}개의 할 일을 모두 삭제하시겠습니까?`)) {
      tasks = tasks.filter(t => !t.completed);
      saveTasks();
      renderApp();
      showToast('완료된 모든 항목이 삭제되었습니다.', 'danger');
    }
  });

  // --------------------------------------------------------------------------
  // 6. Search, Filter & Sorting Listeners
  // --------------------------------------------------------------------------
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    if (searchQuery) {
      clearSearchBtn.classList.remove('hidden');
    } else {
      clearSearchBtn.classList.add('hidden');
    }
    renderApp();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    renderApp();
  });

  filterCategorySelect.addEventListener('change', (e) => {
    currentCategory = e.target.value;
    renderApp();
  });

  sortBySelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderApp();
  });

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilterTab = btn.getAttribute('data-tab');
      renderApp();
    });
  });

  // --------------------------------------------------------------------------
  // 7. Filtering & Sorting Calculation
  // --------------------------------------------------------------------------
  function getFilteredAndSortedTasks() {
    return tasks.filter(task => {
      if (currentFilterTab === 'active' && task.completed) return false;
      if (currentFilterTab === 'completed' && !task.completed) return false;
      if (currentCategory !== 'all' && task.category !== currentCategory) return false;

      if (searchQuery) {
        const matchesTitle = task.title.toLowerCase().includes(searchQuery);
        const matchesNote = task.note && task.note.toLowerCase().includes(searchQuery);
        if (!matchesTitle && !matchesNote) return false;
      }

      return true;
    }).sort((a, b) => {
      if (currentSort === 'newest') {
        return b.createdAt - a.createdAt;
      } else if (currentSort === 'oldest') {
        return a.createdAt - b.createdAt;
      } else if (currentSort === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      } else if (currentSort === 'priority') {
        const priorityOrder = { high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return 0;
    });
  }

  // --------------------------------------------------------------------------
  // 8. Render App & UI Update Engine
  // --------------------------------------------------------------------------
  function renderApp() {
    updateDashboard();
    const visibleTasks = getFilteredAndSortedTasks();

    taskListEl.innerHTML = '';

    if (visibleTasks.length === 0) {
      emptyStateEl.classList.remove('hidden');
      if (searchQuery || currentCategory !== 'all' || currentFilterTab !== 'all') {
        document.getElementById('empty-title').textContent = '검색 또는 필터 결과가 없습니다';
        document.getElementById('empty-desc').textContent = '다른 검색어나 필터 조건을 시도해보세요.';
      } else {
        document.getElementById('empty-title').textContent = '등록된 할 일이 없습니다';
        document.getElementById('empty-desc').textContent = '새로운 목표나 작업을 작성하여 하루를 알차게 시작해보세요!';
      }
    } else {
      emptyStateEl.classList.add('hidden');
      visibleTasks.forEach(task => {
        const itemEl = createTaskDOMItem(task);
        taskListEl.appendChild(itemEl);
      });
    }
  }

  function updateDashboard() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const active = total - completed;
    const highPriority = tasks.filter(t => t.priority === 'high' && !t.completed).length;

    totalCountEl.textContent = total;
    activeCountEl.textContent = active;
    completedCountEl.textContent = completed;
    highPriorityCountEl.textContent = highPriority;

    tabAllCount.textContent = total;
    tabActiveCount.textContent = active;
    tabCompletedCount.textContent = completed;

    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    progressPercentageEl.textContent = `${percent}%`;

    const strokeDashoffset = 201.06 - (201.06 * percent) / 100;
    progressCircle.style.strokeDashoffset = strokeDashoffset;

    if (percent === 100 && total > 0) {
      progressStatusText.textContent = '모든 할 일을 완벽하게 끝마쳤습니다! 👏';
    } else if (percent >= 70) {
      progressStatusText.textContent = '거의 다 완성되어 가고 있습니다!';
    } else if (percent >= 30) {
      progressStatusText.textContent = '좋은 흐름으로 진행되고 있습니다.';
    } else {
      progressStatusText.textContent = '차근차근 하나씩 완료해 보세요!';
    }
  }

  function createTaskDOMItem(task) {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    li.setAttribute('data-id', task.id);

    const categoryMap = {
      work: { name: '업무', class: 'cat-work', icon: '💼' },
      personal: { name: '개인', class: 'cat-personal', icon: '👤' },
      shopping: { name: '쇼핑', class: 'cat-shopping', icon: '🛒' },
      goal: { name: '목표', class: 'cat-goal', icon: '🎯' },
      health: { name: '건강', class: 'cat-health', icon: '💊' },
      idea: { name: '아이디어', class: 'cat-idea', icon: '💡' }
    };
    const catInfo = categoryMap[task.category] || { name: task.category, class: '', icon: '📌' };

    const priorityMap = {
      high: { name: '높음', class: 'prio-high' },
      medium: { name: '중간', class: 'prio-medium' },
      low: { name: '낮음', class: 'prio-low' }
    };
    const prioInfo = priorityMap[task.priority] || { name: task.priority, class: '' };

    let dueDateHTML = '';
    if (task.dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(task.dueDate);
      due.setHours(0, 0, 0, 0);

      const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
      let badgeClass = '';
      let badgeText = task.dueDate;

      if (diffDays < 0 && !task.completed) {
        badgeClass = 'overdue';
        badgeText = `기한 초과 (${Math.abs(diffDays)}일 지남)`;
      } else if (diffDays === 0) {
        badgeClass = 'today';
        badgeText = '오늘 마감';
      }

      dueDateHTML = `<span class="badge duedate-badge ${badgeClass}"><i class="ri-calendar-line"></i> ${badgeText}</span>`;
    }

    li.innerHTML = `
      <div class="task-checkbox-wrapper">
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
        <i class="ri-check-line"></i>
      </div>

      <div class="task-body">
        <div class="task-header-row">
          <span class="task-title">${escapeHTML(task.title)}</span>
        </div>
        ${task.note ? `<p class="task-note">${escapeHTML(task.note)}</p>` : ''}
        <div class="task-badges">
          <span class="badge category-badge ${catInfo.class}">${catInfo.icon} ${catInfo.name}</span>
          <span class="badge priority-badge ${prioInfo.class}">우선순위: ${prioInfo.name}</span>
          ${dueDateHTML}
        </div>
      </div>

      <div class="task-actions">
        <button class="action-btn edit-btn" title="수정"><i class="ri-edit-line"></i></button>
        <button class="action-btn delete-btn" title="삭제"><i class="ri-delete-bin-line"></i></button>
      </div>
    `;

    const checkbox = li.querySelector('.task-checkbox');
    checkbox.addEventListener('change', () => toggleTaskCompletion(task.id));

    const editBtn = li.querySelector('.edit-btn');
    editBtn.addEventListener('click', () => openEditModal(task.id));

    const deleteBtn = li.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    return li;
  }

  // --------------------------------------------------------------------------
  // 9. Backup / Export & Import
  // --------------------------------------------------------------------------
  backupBtn.addEventListener('click', () => {
    backupModal.classList.remove('hidden');
  });

  closeBackupModalBtn.addEventListener('click', () => {
    backupModal.classList.add('hidden');
  });

  exportJsonBtn.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `TaskCraft_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('백업 파일이 성공적으로 다운로드 되었습니다.', 'success');
  });

  importJsonBtn.addEventListener('click', () => {
    importJsonInput.click();
  });

  importJsonInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
      try {
        const importedTasks = JSON.parse(event.target.result);
        if (Array.isArray(importedTasks)) {
          tasks = importedTasks;
          saveTasks();
          renderApp();
          backupModal.classList.add('hidden');
          showToast('성공적으로 데이터를 복원했습니다!', 'success');
        } else {
          alert('올바른 백업 파일 형식이 아닙니다.');
        }
      } catch (err) {
        alert('파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsText(file);
  });

  // --------------------------------------------------------------------------
  // 10. Utilities & Toast System
  // --------------------------------------------------------------------------
  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconClass = 'ri-information-line';
    if (type === 'success') iconClass = 'ri-checkbox-circle-fill';
    if (type === 'danger') iconClass = 'ri-error-warning-fill';

    toast.innerHTML = `<i class="${iconClass}"></i><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
});
