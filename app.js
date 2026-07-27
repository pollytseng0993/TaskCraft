/**
 * TaskCraft - 할 일 관리 웹 애플리케이션
 * v2.0 - 동기화 없이 로컬 자동저장 + JSON 백업/복원
 */

document.addEventListener('DOMContentLoaded', () => {
  // --------------------------------------------------------------------------
  // 1. 상태 및 스토리지 키 초기화
  // --------------------------------------------------------------------------
  const STORAGE_KEY_TASKS = 'taskcraft_tasks_v1';
  const STORAGE_KEY_THEME = 'taskcraft_theme_v1';

  let tasks = loadTasks();
  let currentFilterTab = 'all';
  let currentCategory = 'all';
  let currentSort = 'newest';
  let searchQuery = '';
  let currentCreatedDate = '';

  // DOM Elements
  const taskListEl = document.getElementById('task-list');
  const emptyStateEl = document.getElementById('empty-state');
  const addTaskForm = document.getElementById('add-task-form');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const backupBtn = document.getElementById('backup-btn');
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search');
  const filterCategorySelect = document.getElementById('filter-category');
  const filterStatusSelect = document.getElementById('filter-status');
  const filterCreatedDateInput = document.getElementById('filter-created-date');
  const clearDateFilterBtn = document.getElementById('clear-date-filter');
  const sortBySelect = document.getElementById('sort-by');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const clearCompletedBtn = document.getElementById('clear-completed-btn');

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

  const editModal = document.getElementById('edit-modal');
  const editTaskForm = document.getElementById('edit-task-form');
  const closeEditModalBtn = document.getElementById('close-edit-modal');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');

  const backupModal = document.getElementById('backup-modal');
  const closeBackupModalBtn = document.getElementById('close-backup-modal');
  const exportJsonBtn = document.getElementById('export-json-btn');
  const importJsonBtn = document.getElementById('import-json-btn');
  const importJsonInput = document.getElementById('import-json-input');

  initHeaderDate();
  initTheme();
  renderApp();

  // --------------------------------------------------------------------------
  // 2. 데이터 로드 / 저장 (localStorage 자동저장)
  // --------------------------------------------------------------------------
  function loadTasks() {
    const data = localStorage.getItem(STORAGE_KEY_TASKS);
    if (data) {
      try { return JSON.parse(data); } catch (e) { console.error(e); }
    }
    // 첫 실행 시 샘플 데이터
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    return [
      {
        id: 'demo-1', title: '새 프로젝트 아키텍처 및 디자인 시스템 구축',
        category: 'work', priority: 'high', dueDate: todayStr,
        note: '상세 가이드라인 문서 작성 및 팀원 공유', completed: false,
        createdAt: Date.now() - 3600000 * 4
      },
      {
        id: 'demo-2', title: '비타민 영양제 챙겨먹기 및 30분 산책',
        category: 'health', priority: 'medium', dueDate: todayStr,
        note: '', completed: true, createdAt: Date.now() - 3600000 * 12
      },
      {
        id: 'demo-3', title: '주말 식재료 구매 (우유, 계란, 야채)',
        category: 'shopping', priority: 'low', dueDate: tomorrowStr,
        note: '마켓컬리 세일 항목 확인하기', completed: false,
        createdAt: Date.now() - 3600000 * 24
      }
    ];
  }

  function saveTasks() {
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
  }

  function initHeaderDate() {
    const dateEl = document.getElementById('current-date');
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    if (dateEl) dateEl.textContent = today.toLocaleDateString('ko-KR', options);
    const dueDateInput = document.getElementById('task-duedate');
    if (dueDateInput) dueDateInput.value = today.toISOString().split('T')[0];
  }

  // --------------------------------------------------------------------------
  // 3. 테마 토글
  // --------------------------------------------------------------------------
  function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  themeToggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE_KEY_THEME, next);
    showToast(`${next === 'dark' ? '다크' : '라이트'} 모드로 변경되었습니다.`, 'info');
  });

  // --------------------------------------------------------------------------
  // 4. 할 일 CRUD
  // --------------------------------------------------------------------------
  addTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('task-title').value.trim();
    if (!title) return;

    tasks.unshift({
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title,
      category: document.getElementById('task-category').value,
      priority: document.getElementById('task-priority').value,
      dueDate: document.getElementById('task-duedate').value,
      note: document.getElementById('task-note').value.trim(),
      completed: false,
      createdAt: Date.now()
    });
    saveTasks();
    renderApp();
    document.getElementById('task-title').value = '';
    document.getElementById('task-note').value = '';
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
    const idx = tasks.findIndex(t => t.id === id);
    if (idx !== -1) {
      const deleted = tasks.splice(idx, 1)[0];
      saveTasks();
      renderApp();
      showToast(`'${deleted.title}' 항목이 삭제되었습니다.`, 'danger');
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
      editModal.classList.add('hidden');
      showToast('할 일이 수정되었습니다.', 'info');
    }
  });

  closeEditModalBtn.addEventListener('click', () => editModal.classList.add('hidden'));
  cancelEditBtn.addEventListener('click', () => editModal.classList.add('hidden'));

  clearCompletedBtn.addEventListener('click', () => {
    const count = tasks.filter(t => t.completed).length;
    if (count === 0) { showToast('삭제할 완료된 항목이 없습니다.', 'info'); return; }
    if (confirm(`완료된 ${count}개 항목을 모두 삭제하시겠습니까?`)) {
      tasks = tasks.filter(t => !t.completed);
      saveTasks();
      renderApp();
      showToast('완료된 모든 항목이 삭제되었습니다.', 'danger');
    }
  });

  // --------------------------------------------------------------------------
  // 5. 검색 / 필터 / 정렬
  // --------------------------------------------------------------------------
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    clearSearchBtn.classList.toggle('hidden', !searchQuery);
    renderApp();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    renderApp();
  });

  if (filterCreatedDateInput) {
    filterCreatedDateInput.addEventListener('change', (e) => {
      currentCreatedDate = e.target.value;
      if (clearDateFilterBtn) clearDateFilterBtn.classList.toggle('hidden', !currentCreatedDate);
      renderApp();
    });
  }

  if (clearDateFilterBtn) {
    clearDateFilterBtn.addEventListener('click', () => {
      if (filterCreatedDateInput) filterCreatedDateInput.value = '';
      currentCreatedDate = '';
      clearDateFilterBtn.classList.add('hidden');
      renderApp();
    });
  }

  if (filterStatusSelect) {
    filterStatusSelect.addEventListener('change', (e) => {
      currentFilterTab = e.target.value;
      tabBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === currentFilterTab));
      renderApp();
    });
  }

  filterCategorySelect.addEventListener('change', (e) => { currentCategory = e.target.value; renderApp(); });
  sortBySelect.addEventListener('change', (e) => { currentSort = e.target.value; renderApp(); });

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilterTab = btn.getAttribute('data-tab');
      if (filterStatusSelect) filterStatusSelect.value = currentFilterTab;
      renderApp();
    });
  });

  function formatDateToYYYYMMDD(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function getFilteredAndSortedTasks() {
    return tasks.filter(task => {
      if (currentFilterTab === 'active' && task.completed) return false;
      if (currentFilterTab === 'completed' && !task.completed) return false;
      if (currentCategory !== 'all' && task.category !== currentCategory) return false;
      if (currentCreatedDate) {
        const taskCreatedStr = formatDateToYYYYMMDD(task.createdAt);
        if (taskCreatedStr !== currentCreatedDate) return false;
      }
      if (searchQuery) {
        const inTitle = task.title.toLowerCase().includes(searchQuery);
        const inNote = task.note && task.note.toLowerCase().includes(searchQuery);
        if (!inTitle && !inNote) return false;
      }
      return true;
    }).sort((a, b) => {
      if (currentSort === 'newest') return b.createdAt - a.createdAt;
      if (currentSort === 'oldest') return a.createdAt - b.createdAt;
      if (currentSort === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      if (currentSort === 'priority') {
        return ({ high: 1, medium: 2, low: 3 }[a.priority] || 4) - ({ high: 1, medium: 2, low: 3 }[b.priority] || 4);
      }
      return 0;
    });
  }

  // --------------------------------------------------------------------------
  // 6. 렌더링
  // --------------------------------------------------------------------------
  function renderApp() {
    updateDashboard();
    const visible = getFilteredAndSortedTasks();
    taskListEl.innerHTML = '';
    if (visible.length === 0) {
      emptyStateEl.classList.remove('hidden');
      const hasFilter = searchQuery || currentCategory !== 'all' || currentFilterTab !== 'all' || currentCreatedDate;
      document.getElementById('empty-title').textContent = hasFilter ? '검색 또는 필터 결과가 없습니다' : '등록된 할 일이 없습니다';
      document.getElementById('empty-desc').textContent = hasFilter ? '다른 검색어나 필터 조건을 시도해보세요.' : '새로운 목표나 작업을 작성하여 하루를 알차게 시작해보세요!';
    } else {
      emptyStateEl.classList.add('hidden');
      visible.forEach(task => taskListEl.appendChild(createTaskDOMItem(task)));
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
    progressCircle.style.strokeDashoffset = 201.06 - (201.06 * percent) / 100;

    if (percent === 100 && total > 0) progressStatusText.textContent = '모든 할 일을 완벽하게 끝마쳤습니다! 👏';
    else if (percent >= 70) progressStatusText.textContent = '거의 다 완성되어 가고 있습니다!';
    else if (percent >= 30) progressStatusText.textContent = '좋은 흐름으로 진행되고 있습니다.';
    else progressStatusText.textContent = '차근차근 하나씩 완료해 보세요!';
  }

  function createTaskDOMItem(task) {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    li.setAttribute('data-id', task.id);

    const catMap = {
      work: { name: '업무', cls: 'cat-work', icon: '💼' },
      personal: { name: '개인', cls: 'cat-personal', icon: '👤' },
      shopping: { name: '쇼핑', cls: 'cat-shopping', icon: '🛒' },
      goal: { name: '목표', cls: 'cat-goal', icon: '🎯' },
      health: { name: '건강', cls: 'cat-health', icon: '💊' },
      idea: { name: '아이디어', cls: 'cat-idea', icon: '💡' }
    };
    const cat = catMap[task.category] || { name: task.category, cls: '', icon: '📌' };

    const prioMap = {
      high: { name: '높음', cls: 'prio-high' },
      medium: { name: '중간', cls: 'prio-medium' },
      low: { name: '낮음', cls: 'prio-low' }
    };
    const prio = prioMap[task.priority] || { name: task.priority, cls: '' };

    let dueDateHTML = '';
    if (task.dueDate) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const due = new Date(task.dueDate); due.setHours(0, 0, 0, 0);
      const diff = Math.ceil((due - today) / 86400000);
      let cls = '', label = task.dueDate;
      if (diff < 0 && !task.completed) { cls = 'overdue'; label = `기한 초과 (${Math.abs(diff)}일 지남)`; }
      else if (diff === 0) { cls = 'today'; label = '오늘 마감'; }
      dueDateHTML = `<span class="badge duedate-badge ${cls}"><i class="ri-calendar-line"></i> ${label}</span>`;
    }

    const createdStr = formatDateToYYYYMMDD(task.createdAt);
    const createdBadgeHTML = createdStr ? `<span class="badge created-date-badge" title="등록일: ${createdStr}"><i class="ri-time-line"></i> 등록: ${createdStr}</span>` : '';

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
          <span class="badge category-badge ${cat.cls}">${cat.icon} ${cat.name}</span>
          <span class="badge priority-badge ${prio.cls}">우선순위: ${prio.name}</span>
          ${createdBadgeHTML}
          ${dueDateHTML}
        </div>
      </div>
      <div class="task-actions">
        <button class="action-btn edit-btn" title="수정"><i class="ri-edit-line"></i></button>
        <button class="action-btn delete-btn" title="삭제"><i class="ri-delete-bin-line"></i></button>
      </div>`;

    li.querySelector('.task-checkbox').addEventListener('change', () => toggleTaskCompletion(task.id));
    li.querySelector('.edit-btn').addEventListener('click', () => openEditModal(task.id));
    li.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));
    return li;
  }

  // --------------------------------------------------------------------------
  // 7. 백업 / JSON 내보내기 / 불러오기
  // --------------------------------------------------------------------------
  backupBtn.addEventListener('click', () => backupModal.classList.remove('hidden'));
  closeBackupModalBtn.addEventListener('click', () => backupModal.classList.add('hidden'));

  exportJsonBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TaskCraft_백업_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('백업 파일이 다운로드되었습니다.', 'success');
  });

  importJsonBtn.addEventListener('click', () => importJsonInput.click());

  importJsonInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (Array.isArray(imported)) {
          tasks = imported;
          saveTasks();
          renderApp();
          backupModal.classList.add('hidden');
          showToast(`${imported.length}개의 할 일이 성공적으로 복원되었습니다!`, 'success');
        } else { alert('올바른 백업 파일 형식이 아닙니다.'); }
      } catch { alert('파일을 읽는 중 오류가 발생했습니다.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // --------------------------------------------------------------------------
  // 8. 유틸리티
  // --------------------------------------------------------------------------
  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, t => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[t] || t));
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: 'ri-checkbox-circle-fill', info: 'ri-information-line', danger: 'ri-error-warning-fill' };
    toast.innerHTML = `<i class="${icons[type] || icons.info}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
});
