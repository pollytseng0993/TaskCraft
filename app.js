/**
 * TaskCraft - Complete Web Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // --------------------------------------------------------------------------
  // 1. Initial State & Storage Keys
  // --------------------------------------------------------------------------
  const STORAGE_KEY_TASKS = 'taskcraft_tasks_v1';
  const STORAGE_KEY_THEME = 'taskcraft_theme_v1';

  let tasks = loadTasks();
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

  // Set today's date in header & date input default
  initHeaderDate();
  initTheme();

  // Initial render
  renderApp();

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
    // Return sample demo data on first launch
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

  function saveTasks() {
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
  }

  function initHeaderDate() {
    const dateEl = document.getElementById('current-date');
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    if (dateEl) {
      dateEl.textContent = today.toLocaleDateString('ko-KR', options);
    }
    
    // Set default date in add form to today
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
  // 4. Task CRUD Logic
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

    // Reset Form
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
  // 5. Search, Filter & Sorting Listeners
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
  // 6. Filtering & Sorting Calculation
  // --------------------------------------------------------------------------
  function getFilteredAndSortedTasks() {
    return tasks.filter(task => {
      // Status Filter Tab
      if (currentFilterTab === 'active' && task.completed) return false;
      if (currentFilterTab === 'completed' && !task.completed) return false;

      // Category Filter
      if (currentCategory !== 'all' && task.category !== currentCategory) return false;

      // Search Query
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
  // 7. Render App & UI Update Engine
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

    // Calculate percentage
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    progressPercentageEl.textContent = `${percent}%`;

    // SVG Circular Progress Ring Update (r=32 => circumference = 2 * PI * 32 ≈ 201.06)
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

    // Category Label & Map
    const categoryMap = {
      work: { name: '업무', class: 'cat-work', icon: '💼' },
      personal: { name: '개인', class: 'cat-personal', icon: '👤' },
      shopping: { name: '쇼핑', class: 'cat-shopping', icon: '🛒' },
      goal: { name: '목표', class: 'cat-goal', icon: '🎯' },
      health: { name: '건강', class: 'cat-health', icon: '💊' },
      idea: { name: '아이디어', class: 'cat-idea', icon: '💡' }
    };
    const catInfo = categoryMap[task.category] || { name: task.category, class: '', icon: '📌' };

    // Priority Map
    const priorityMap = {
      high: { name: '높음', class: 'prio-high' },
      medium: { name: '중간', class: 'prio-medium' },
      low: { name: '낮음', class: 'prio-low' }
    };
    const prioInfo = priorityMap[task.priority] || { name: task.priority, class: '' };

    // Due Date Badge Text & Alert
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

    // Event Listeners for Item Actions
    const checkbox = li.querySelector('.task-checkbox');
    checkbox.addEventListener('change', () => toggleTaskCompletion(task.id));

    const editBtn = li.querySelector('.edit-btn');
    editBtn.addEventListener('click', () => openEditModal(task.id));

    const deleteBtn = li.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    return li;
  }

  // --------------------------------------------------------------------------
  // 8. Backup / Export & Import
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
  // 9. Utilities & Toast System
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
