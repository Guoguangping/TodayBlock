'use strict';

/* ------------------------------------------------------------------ */
/* constants & state                                                   */
/* ------------------------------------------------------------------ */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const PRIORITY = {
  0: { label: '无', color: '#64748b' },
  1: { label: '低', color: '#60a5fa' },
  2: { label: '中', color: '#fbbf24' },
  3: { label: '高', color: '#fb7185' }
};

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const WEEKDAY_SHORT = ['日', '一', '二', '三', '四', '五', '六'];

const ICON = {
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4 4L19 6.8"></path></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"></circle><path d="M12 8v4l2.5 1.5"></path></svg>',
  file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l4 4v14H7z"></path><path d="M14 3v5h5"></path></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"></path></svg>',
  open: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9"></path><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"></path></svg>',
  spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z"></path><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"></path></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"></path></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>',
  calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"></rect><path d="M8 3v4M16 3v4M4 10h16"></path></svg>'
};

const VIEW_PARAM = new URLSearchParams(window.location.search).get('view');
const VIEW = ['bubble', 'panel', 'overview'].includes(VIEW_PARAM) ? VIEW_PARAM : 'panel';
document.documentElement.dataset.view = VIEW;

function storedMode(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value || fallback;
  } catch {
    return fallback;
  }
}

const state = {
  today: localKey(new Date()),
  tasks: [],
  trash: [],
  trashCount: 0,
  settings: null,
  dataDir: '',
  dataMode: '',
  counts: { today: 0, overdue: 0, doneToday: 0, totalToday: 0 },
  expanded: false,
  selectedDate: localKey(new Date()),
  viewYear: new Date().getFullYear(),
  viewMonth: new Date().getMonth(),
  modal: null,
  preview: null,
  ov: {
    query: '',
    project: '',
    status: 'all',
    overdue: false,
    selected: new Set(),
    dragId: null,
    mode: storedMode('todayblock.overview.mode', 'board') === 'table' ? 'table' : 'board'
  },
  trashView: {
    query: '',
    project: '',
    selected: new Set(),
    mode: storedMode('todayblock.trash.mode', 'card') === 'table' ? 'table' : 'card'
  },
  dragDepth: 0,
  toastTimer: null,
  loading: false
};

/* ------------------------------------------------------------------ */
/* date utilities                                                      */
/* ------------------------------------------------------------------ */

function pad(n) {
  return String(n).padStart(2, '0');
}

function localKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function addDays(key, days) {
  const date = parseKey(key);
  date.setDate(date.getDate() + days);
  return localKey(date);
}

function startOfMonth(year, month) {
  return new Date(year, month, 1, 12, 0, 0, 0);
}

function monthCells(year, month) {
  const first = startOfMonth(year, month);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    cells.push({
      date,
      key: localKey(date),
      outside: date.getMonth() !== month
    });
  }
  return cells;
}

function formatMonth(year, month) {
  return `${year}年${month + 1}月`;
}

function formatSelected(key) {
  const date = parseKey(key);
  const base = `${date.getMonth() + 1}月${date.getDate()}日 ${WEEKDAYS[date.getDay()]}`;
  if (key === state.today) return `今天 · ${base}`;
  if (date.getFullYear() !== new Date().getFullYear()) return `${date.getFullYear()}年${base}`;
  return base;
}

function isSameMonth(key, year, month) {
  const date = parseKey(key);
  return date.getFullYear() === year && date.getMonth() === month;
}

/* ------------------------------------------------------------------ */
/* utilities                                                           */
/* ------------------------------------------------------------------ */

function hasAIConfig() {
  return Boolean(state.settings?.ai?.hasKey);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function safeColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value)) ? value : '#64748b';
}

function taskColor(task) {
  return PRIORITY[task.priority]?.color || PRIORITY[0].color;
}

function sortTasks(tasks) {
  const statusRank = { todo: 0, doing: 1, done: 2 };
  return [...tasks].sort((a, b) => {
    if (a.status !== b.status) {
      return (statusRank[a.status] ?? 0) - (statusRank[b.status] ?? 0);
    }
    const aTime = a.dueTime || '99:99';
    const bTime = b.dueTime || '99:99';
    if (aTime !== bTime) return aTime.localeCompare(bTime);
    return (b.priority || 0) - (a.priority || 0);
  });
}

function tasksForDate(key) {
  return sortTasks(state.tasks.filter((task) => task.dueDate === key));
}

function taskById(id) {
  return state.tasks.find((task) => task.id === id) || null;
}

function projectHistory() {
  const names = [];
  for (const task of state.tasks) {
    const project = String(task.project || '').trim();
    if (project && !names.includes(project)) names.push(project);
  }
  return names.slice(0, 80);
}

function monthTaskCount(year, month) {
  return state.tasks.filter((task) => {
    if (!task.dueDate) return false;
    const date = parseKey(task.dueDate);
    return date.getFullYear() === year && date.getMonth() === month && task.status !== 'done';
  }).length;
}

function friendlyError(error, fallback = '操作失败') {
  let message = typeof error === 'string'
    ? error
    : String(error?.message || fallback);
  message = message
    .replace(/^Error invoking remote method '[^']+':\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .trim();
  return message || fallback;
}

function toast(message, kind = '') {
  const root = $('#toast-root');
  if (!root) return;
  root.innerHTML = '';
  const node = document.createElement('div');
  node.className = `toast ${kind}`.trim();
  node.textContent = message;
  root.appendChild(node);
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => {
    node.style.opacity = '0';
    node.style.transition = 'opacity 160ms ease';
    setTimeout(() => node.remove(), 180);
  }, 2600);
}

function setBusy(value) {
  state.loading = Boolean(value);
  const overlay = $('#busy-overlay');
  if (overlay) overlay.hidden = !state.loading;
}

/* ------------------------------------------------------------------ */
/* state sync                                                          */
/* ------------------------------------------------------------------ */

function applyState(snapshot) {
  if (!snapshot) return;
  state.today = snapshot.today || state.today;
  state.tasks = Array.isArray(snapshot.tasks) ? snapshot.tasks : [];
  state.trash = Array.isArray(snapshot.trash) ? snapshot.trash : [];
  state.trashCount = Number(snapshot.trashCount) || state.trash.length;
  state.settings = snapshot.settings || state.settings;
  state.dataDir = snapshot.dataDir || state.dataDir;
  state.dataMode = snapshot.dataMode || state.dataMode;
  state.counts = snapshot.counts || state.counts;
  state.expanded = VIEW === 'panel';
  if (!state.selectedDate) state.selectedDate = state.today;
  if (!isSameMonth(state.selectedDate, state.viewYear, state.viewMonth)) {
    const selected = parseKey(state.selectedDate);
    state.viewYear = selected.getFullYear();
    state.viewMonth = selected.getMonth();
  }
  applyTheme();
  const app = $('#app');
  const showPanel = VIEW === 'panel';
  app.classList.toggle('expanded', showPanel);
  app.classList.toggle('collapsed', !showPanel);
  app.classList.toggle('overview-mode', VIEW === 'overview');
}

function applyTheme() {
  const app = $('#app');
  app.dataset.theme = state.settings?.theme === 'light' ? 'light' : 'dark';
}

async function refresh() {
  try {
    const snapshot = await window.today.getState();
    applyState(snapshot);
    renderAll();
  } catch (error) {
    toast(`读取数据失败：${friendlyError(error)}`, 'err');
  }
}

/* ------------------------------------------------------------------ */
/* render: bubble                                                      */
/* ------------------------------------------------------------------ */

// 上一帧方块上显示的内容，用来判断数字要不要做一次上浮
let bubbleShown = null;

function renderBubble() {
  const bubble = $('#bubble');
  const count = Number(state.counts.today || 0);
  const overdue = Number(state.counts.overdue || 0);
  const done = Number(state.counts.doneToday || 0);
  const total = Number(state.counts.totalToday || 0);

  let level = 'level-0';
  if (count >= 6) level = 'level-high';
  else if (count >= 3) level = 'level-mid';
  else if (count >= 1) level = 'level-low';
  bubble.className = ['bubble', level, count === 0 ? 'is-clear' : '', overdue > 0 ? 'has-overdue' : '']
    .filter(Boolean)
    .join(' ');

  const countNode = $('#bubble-count');
  const shown = count === 0 ? 'done' : String(count);
  if (countNode && bubbleShown !== shown) {
    if (bubbleShown !== null) {
      countNode.classList.remove('is-swap');
      void countNode.offsetWidth;
      countNode.classList.add('is-swap');
    }
    bubbleShown = shown;
    countNode.innerHTML = count === 0 ? ICON.check : escapeHtml(String(count));
  }

  const title = count
    ? `今日 ${count} 项未完成${overdue ? ` · 逾期 ${overdue}` : ''}`
    : overdue
      ? `今天的任务已完成 · 逾期 ${overdue}`
      : '今天清空了，保持住';
  bubble.title = title;
  bubble.setAttribute('aria-label', title);

  const badge = $('#bubble-overdue');
  if (badge) {
    badge.hidden = overdue <= 0;
    badge.title = overdue ? `逾期 ${overdue} 项` : '';
  }

  // 描边从顶部起，按今天已完成 / 今天全部任务的比例加长；清空时画满一圈
  const arc = $('#bubble-arc');
  if (arc) {
    const progress = total > 0 ? Math.min(1, done / total) : 1;
    arc.style.strokeDasharray = '100';
    arc.style.strokeDashoffset = String(100 * (1 - progress));
    arc.classList.toggle('is-empty', progress <= 0);
  }
}

/* ------------------------------------------------------------------ */
/* render: calendar                                                    */
/* ------------------------------------------------------------------ */

function renderCalendar() {
  const calendar = $('#calendar');
  const cells = monthCells(state.viewYear, state.viewMonth);
  const html = cells.map(({ date, key, outside }) => {
    const tasks = tasksForDate(key);
    const pending = tasks.filter((task) => task.status !== 'done');
    const allDone = tasks.length > 0 && pending.length === 0;
    const hasOverdue = pending.length > 0 && key < state.today;
    const classes = [
      'day',
      outside ? 'is-outside' : '',
      date.getDay() === 0 || date.getDay() === 6 ? 'is-weekend' : '',
      key === state.today ? 'is-today' : '',
      key === state.selectedDate ? 'is-selected' : '',
      hasOverdue ? 'has-overdue' : '',
      allDone ? 'is-complete' : ''
    ].filter(Boolean).join(' ');

    const lead = pending.reduce((current, task) => (
      !current || (task.priority || 0) > (current.priority || 0) ? task : current
    ), null);
    const bar = pending.length
      ? `<span class="task-bar" style="--bar-color:${safeColor(taskColor(lead))}"></span>`
      : '';
    const count = pending.length > 9 ? '9+' : String(pending.length);
    const pendingMark = pending.length
      ? `<span class="day-meta">${bar}<span class="day-count-badge">${count}</span></span>`
      : '';
    const completeMark = allDone
      ? `<span class="day-check" aria-hidden="true">${ICON.check}</span>`
      : '';
    const statusCopy = tasks.length
      ? pending.length
        ? `${pending.length} 项待办`
        : `${tasks.length} 项已完成`
      : '无任务';
    const tooltip = tasks.length
      ? `${key}  ${statusCopy}  ${tasks.map((task) => task.title).join(' / ')}`
      : key;

    return `
      <button class="${classes}" type="button" data-date="${key}" role="gridcell" title="${escapeAttr(tooltip)}" aria-label="${escapeAttr(tooltip)}">
        <span class="day-num">${date.getDate()}</span>
        ${pendingMark}
        ${completeMark}
      </button>
    `;
  }).join('');

  calendar.innerHTML = html;
}

function renderHeader() {
  const summary = $('#header-summary');
  if (summary) {
    const today = Number(state.counts.today || 0);
    const overdue = Number(state.counts.overdue || 0);
    summary.textContent = today
      ? `今日 ${today} 项${overdue ? ` · ${overdue} 项逾期` : ' · 按节奏来'}`
      : '今天没有未完成任务';
  }

  const monthLabel = $('#month-label');
  if (monthLabel) monthLabel.textContent = formatMonth(state.viewYear, state.viewMonth);
  const monthSummary = $('#month-summary');
  if (monthSummary) {
    const count = monthTaskCount(state.viewYear, state.viewMonth);
    monthSummary.textContent = count ? `本月 ${count} 项待办` : '本月暂无待办';
  }
}

/* ------------------------------------------------------------------ */
/* render: day list                                                    */
/* ------------------------------------------------------------------ */

function renderDayList() {
  const dateLabel = $('#selected-date-label');
  if (dateLabel) dateLabel.textContent = formatSelected(state.selectedDate);

  const tasks = tasksForDate(state.selectedDate);
  const pending = tasks.filter((task) => task.status !== 'done');
  const done = tasks.filter((task) => task.status === 'done');
  const dayCount = $('#day-count');
  if (dayCount) {
    dayCount.textContent = pending.length
      ? `${pending.length} 项待办${done.length ? ` · ${done.length} 已完成` : ''}`
      : done.length
        ? `${done.length} 项已完成`
        : '暂无任务';
  }

  const list = $('#task-list');
  if (!tasks.length) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="empty-orbit">${ICON.calendar}</span>
        <strong>${state.selectedDate === state.today ? '今天还没有安排' : '这一天还没有安排'}</strong>
        <span>拖入一份文件让 AI 拆任务，或在下方输入框添加。</span>
      </div>
    `;
    return;
  }

  list.innerHTML = tasks.map((task) => {
    const color = safeColor(taskColor(task));
    const doneClass = task.status === 'done' ? 'is-done' : task.status === 'doing' ? 'is-doing' : '';
    const time = task.dueTime || '全天';
    const project = String(task.project || '').trim();
    const source = project
      ? `<span class="task-sub"><span class="task-project">#${escapeHtml(project)}</span>${task.sourceName ? `<span class="task-source"> · ${escapeHtml(task.sourceName)}</span>` : ''}</span>`
      : task.sourceName
        ? `<span class="task-sub">${ICON.file}<span>${escapeHtml(task.sourceName)}</span></span>`
        : task.notes
          ? `<span class="task-sub">${escapeHtml(task.notes.slice(0, 42))}</span>`
          : `<span class="task-sub">${escapeHtml(PRIORITY[task.priority]?.label || '无')}优先级</span>`;
    return `
      <div class="task-row ${doneClass}" data-task-id="${escapeAttr(task.id)}" style="--priority-color:${color}">
        <button class="task-check" type="button" data-action="toggle" aria-label="${task.status === 'done' ? '标记未完成' : '标记完成'}">
          ${ICON.check}
        </button>
        <span class="task-time">${task.dueDate < state.today && task.status !== 'done' ? '逾期' : escapeHtml(time)}</span>
        <span class="task-main">
          <span class="task-title">${escapeHtml(task.title)}</span>
          ${source}
        </span>
        <span class="task-priority" title="${escapeAttr(PRIORITY[task.priority]?.label || '无')}优先级"></span>
      </div>
    `;
  }).join('');
}

/* ------------------------------------------------------------------ */
/* render: all / panel                                                 */
/* ------------------------------------------------------------------ */

function renderPanel() {
  if (VIEW !== 'panel') return;
  renderHeader();
  renderCalendar();
  renderDayList();
  const dateInput = $('#quick-date');
  if (dateInput && document.activeElement !== dateInput) dateInput.value = state.selectedDate;
}

function renderAll() {
  if (VIEW === 'overview') {
    renderOverview();
  } else {
    renderBubble();
    if (VIEW === 'panel') renderPanel();
  }
  const app = $('#app');
  app.classList.toggle('expanded', VIEW === 'panel');
  app.classList.toggle('collapsed', VIEW !== 'panel');
  app.classList.toggle('overview-mode', VIEW === 'overview');
}

/* ------------------------------------------------------------------ */
/* overview board                                                      */
/* ------------------------------------------------------------------ */

function overviewStatus(task) {
  return ['todo', 'doing', 'done'].includes(task.status) ? task.status : 'todo';
}

function overviewStatusLabel(status) {
  if (status === 'done') return '已完成';
  if (status === 'doing') return '进行中';
  return '待处理';
}

function overviewDueLabel(task) {
  if (!task.dueDate) return '无日期';
  const date = task.dueDate === state.today ? '今天' : task.dueDate.slice(5);
  const time = task.dueTime ? ` ${task.dueTime}` : '';
  const overdue = overviewStatus(task) !== 'done' && task.dueDate < state.today;
  return `${date}${time}${overdue ? ' · 逾期' : ''}`;
}

function overviewFilteredTasks() {
  const query = state.ov.query.trim().toLowerCase();
  return state.tasks.filter((task) => {
    const status = overviewStatus(task);
    if (state.ov.project && String(task.project || '').trim() !== state.ov.project) return false;
    if (state.ov.status !== 'all' && status !== state.ov.status) return false;
    if (state.ov.overdue) {
      if (status === 'done' || !task.dueDate || task.dueDate >= state.today) return false;
    }
    if (query) {
      const haystack = [
        task.title,
        task.project,
        task.notes,
        task.completion,
        task.sourceName
      ].filter(Boolean).join('\n').toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

function overviewSort(a, b) {
  const aStatus = overviewStatus(a);
  const bStatus = overviewStatus(b);
  if (aStatus === 'done' || bStatus === 'done') {
    if (aStatus !== bStatus) return aStatus === 'done' ? 1 : -1;
    return new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime();
  }
  const aDate = a.dueDate || '9999-99-99';
  const bDate = b.dueDate || '9999-99-99';
  if (aDate !== bDate) return aDate.localeCompare(bDate);
  const aTime = a.dueTime || '99:99';
  const bTime = b.dueTime || '99:99';
  if (aTime !== bTime) return aTime.localeCompare(bTime);
  return (b.priority || 0) - (a.priority || 0);
}

function overviewCard(task) {
  const status = overviewStatus(task);
  const selected = state.ov.selected.has(task.id);
  const priority = PRIORITY[task.priority] || PRIORITY[0];
  const overdue = status !== 'done' && task.dueDate && task.dueDate < state.today;
  const project = String(task.project || '').trim();
  const completion = String(task.completion || '').trim();
  return `
    <article class="ov-card ${status === 'done' ? 'is-done' : ''} ${status === 'doing' ? 'is-doing' : ''} ${overdue ? 'is-overdue' : ''}" style="--priority-color:${priority.color}" draggable="true" data-task-id="${escapeAttr(task.id)}">
      <div class="ov-card-top">
        <input class="ov-checkbox" type="checkbox" data-ov-select aria-label="选择任务" ${selected ? 'checked' : ''}>
        <span class="ov-priority">${priority.label}</span>
        <button class="ov-complete" type="button" data-ov-toggle aria-label="${status === 'done' ? '重新打开' : '标记完成'}">${ICON.check}</button>
      </div>
      <h4 class="ov-card-title">${escapeHtml(task.title)}</h4>
      <div class="ov-card-sub">
        ${project ? `<span class="ov-project">#${escapeHtml(project)}</span>` : ''}
        <span class="${overdue ? 'ov-due overdue' : 'ov-due'}">${escapeHtml(overviewDueLabel(task))}</span>
      </div>
      ${completion ? `<p class="ov-completion">${escapeHtml(completion.slice(0, 90))}</p>` : ''}
      <div class="ov-card-foot">
        <span>${task.sourceName ? escapeHtml(task.sourceName) : overviewStatusLabel(status)}</span>
        ${task.sourcePath ? `<span class="ov-source">源文件</span>` : ''}
      </div>
    </article>
  `;
}

function overviewTableHtml(tasks) {
  if (!tasks.length) return '';
  const rows = tasks.map((task) => {
    const status = overviewStatus(task);
    const selected = state.ov.selected.has(task.id);
    const overdue = status !== 'done' && task.dueDate && task.dueDate < state.today;
    const priority = PRIORITY[task.priority] || PRIORITY[0];
    const project = String(task.project || '').trim();
    const detail = [task.completion, task.notes].filter(Boolean).join('\n').trim();
    return `
      <tr class="ov-table-row ${status === 'done' ? 'is-done' : ''}" data-task-id="${escapeAttr(task.id)}">
        <td class="ov-cell-check"><input class="ov-checkbox" type="checkbox" data-ov-select aria-label="选择任务" ${selected ? 'checked' : ''}></td>
        <td class="ov-cell-title">
          <strong>${escapeHtml(task.title)}</strong>
          ${task.sourceName ? `<span>${escapeHtml(task.sourceName)}</span>` : ''}
        </td>
        <td>${project ? `<span class="ov-project">#${escapeHtml(project)}</span>` : '<span class="ov-muted">—</span>'}</td>
        <td><span class="ov-status-pill status-${status}">${overviewStatusLabel(status)}</span></td>
        <td class="${overdue ? 'ov-due overdue' : ''}">${escapeHtml(overviewDueLabel(task))}</td>
        <td><span class="ov-priority-inline" style="color:${priority.color}">${priority.label}</span></td>
        <td class="ov-cell-detail">${detail ? escapeHtml(detail) : '<span class="ov-muted">—</span>'}</td>
        <td class="ov-cell-action"><button class="ov-complete" type="button" data-ov-toggle aria-label="${status === 'done' ? '重新打开' : '标记完成'}">${ICON.check}</button></td>
      </tr>
    `;
  }).join('');
  return `
    <div class="ov-table-wrap">
      <table class="ov-table">
        <thead>
          <tr>
            <th class="ov-cell-check">
              <label class="ov-select-all"><input id="ov-select-all" class="ov-checkbox" type="checkbox" aria-label="全选当前筛选结果">全选</label>
            </th>
            <th>任务</th>
            <th>项目</th>
            <th>状态</th>
            <th>截止</th>
            <th>优先级</th>
            <th>完成情况 / 备注</th>
            <th class="ov-cell-action"></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderOverview() {
  const filtered = overviewFilteredTasks().sort(overviewSort);
  const total = state.tasks.length;
  const pending = state.tasks.filter((task) => overviewStatus(task) !== 'done').length;
  const doing = state.tasks.filter((task) => overviewStatus(task) === 'doing').length;
  const done = state.tasks.filter((task) => overviewStatus(task) === 'done').length;
  const overdue = state.tasks.filter((task) => (
    overviewStatus(task) !== 'done' && task.dueDate && task.dueDate < state.today
  )).length;

  const summary = $('#ov-summary');
  if (summary) {
    summary.textContent = `共 ${total} 项 · 未完成 ${pending} · 进行中 ${doing} · 逾期 ${overdue} · 已完成 ${done}`;
  }

  const projectSelect = $('#ov-project');
  if (projectSelect) {
    const names = projectHistory();
    if (state.ov.project && !names.includes(state.ov.project)) names.push(state.ov.project);
    projectSelect.innerHTML = '<option value="">全部项目</option>'
      + names.map((project) => `<option value="${escapeAttr(project)}">${escapeHtml(project)}</option>`).join('');
    projectSelect.value = state.ov.project;
  }

  const statusSelect = $('#ov-status');
  if (statusSelect) statusSelect.value = state.ov.status;
  const overdueToggle = $('#ov-overdue');
  if (overdueToggle) overdueToggle.checked = state.ov.overdue;
  const search = $('#ov-search');
  if (search && search.value !== state.ov.query) search.value = state.ov.query;

  $$('[data-ov-mode]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.ovMode === state.ov.mode);
  });

  const board = $('#ov-board');
  if (board) {
    board.hidden = filtered.length === 0;
    board.classList.toggle('is-table', state.ov.mode === 'table');
    if (state.ov.mode === 'table') {
      board.innerHTML = overviewTableHtml(filtered);
      const selectAll = $('#ov-select-all');
      if (selectAll) {
        const selectedCount = filtered.filter((task) => state.ov.selected.has(task.id)).length;
        selectAll.checked = filtered.length > 0 && selectedCount === filtered.length;
        selectAll.indeterminate = selectedCount > 0 && selectedCount < filtered.length;
      }
    } else {
      const lanes = [
        { key: 'todo', label: '待处理' },
        { key: 'doing', label: '进行中' },
        { key: 'done', label: '已完成' }
      ];
      board.innerHTML = lanes.map((lane) => {
        const tasks = filtered.filter((task) => overviewStatus(task) === lane.key);
        return `
          <section class="ov-lane lane-${lane.key}" data-lane="${lane.key}">
            <header class="ov-lane-head">
              <span class="ov-lane-dot"></span>
              <strong>${lane.label}</strong>
              <span class="ov-lane-count">${tasks.length}</span>
            </header>
            <div class="ov-lane-body" data-lane-body="${lane.key}">
              ${tasks.map(overviewCard).join('') || '<div class="ov-lane-empty">拖动任务到这里</div>'}
            </div>
          </section>
        `;
      }).join('');
    }
  }

  const trashCount = $('#ov-trash-count');
  if (trashCount) trashCount.textContent = String(state.trashCount || 0);
  const trashButton = $('#ov-trash');
  if (trashButton) trashButton.classList.toggle('has-trash', (state.trashCount || 0) > 0);

  const empty = $('#ov-empty');
  if (empty) empty.hidden = filtered.length > 0;

  const selection = $('#ov-selection');
  const selectedCount = $('#ov-selected-count');
  if (selectedCount) selectedCount.textContent = String(state.ov.selected.size);
  if (selection) selection.hidden = state.ov.selected.size === 0;
}

function openBulkProject(ids) {
  const currentProjects = [...new Set(ids.map((id) => taskById(id)?.project || '').filter(Boolean))];
  const initial = currentProjects.length === 1 ? currentProjects[0] : '';
  state.modal = { type: 'bulk-project' };
  const root = $('#modal-root');
  root.classList.add('is-active');
  root.innerHTML = modalShell({
    eyebrow: 'BULK EDIT',
    title: '批量修改归属项目',
    sub: `已选择 ${ids.length} 项任务。留空会清除这些任务的项目。`,
    body: `
      <div class="field">
        <label for="bulk-project">项目名称</label>
        <input id="bulk-project" list="bulk-project-suggestions" maxlength="120" value="${escapeAttr(initial)}" placeholder="输入或选择项目名称">
        <datalist id="bulk-project-suggestions">
          ${projectHistory().map((project) => `<option value="${escapeAttr(project)}"></option>`).join('')}
        </datalist>
      </div>
    `,
    footer: `
      <div class="modal-actions">
        <button class="btn ghost" type="button" data-close="1">取消</button>
        <span class="spacer"></span>
        <button class="btn primary" type="button" id="bulk-project-save">应用</button>
      </div>
    `
  });

  const input = $('#bulk-project');
  input.focus();
  const save = async () => {
    const project = input.value.trim();
    try {
      await window.today.bulkUpdate(ids, { project });
      state.ov.selected.clear();
      closeModal();
      await refresh();
      toast(project ? `已改为「${project}」` : '已清除归属项目');
    } catch (error) {
      toast(friendlyError(error, '修改项目失败'), 'err');
    }
  };
  $('#bulk-project-save').addEventListener('click', save);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      save();
    }
  });
}

async function exportOverview(format, scope) {
  const ids = scope === 'filtered'
    ? overviewFilteredTasks().map((task) => task.id)
    : scope === 'selected'
      ? [...state.ov.selected]
      : null;
  try {
    const result = await window.today.exportTasks({ format, ids });
    if (result?.ok) toast(`已导出 ${result.count} 项任务`);
    else if (!result?.canceled) toast(result?.message || '导出失败', 'err');
  } catch (error) {
    toast(friendlyError(error, '导出失败'), 'err');
  }
}

function bindOverview() {
  const search = $('#ov-search');
  search?.addEventListener('input', () => {
    state.ov.query = search.value;
    renderOverview();
  });

  $('#ov-project')?.addEventListener('change', (event) => {
    state.ov.project = event.target.value;
    renderOverview();
  });

  $('#ov-status')?.addEventListener('change', (event) => {
    state.ov.status = event.target.value;
    renderOverview();
  });

  $('#ov-overdue')?.addEventListener('change', (event) => {
    state.ov.overdue = event.target.checked;
    renderOverview();
  });

  $$('[data-ov-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      state.ov.mode = button.dataset.ovMode === 'table' ? 'table' : 'board';
      try {
        localStorage.setItem('todayblock.overview.mode', state.ov.mode);
      } catch {
        /* ignore */
      }
      renderOverview();
    });
  });

  $('#ov-trash')?.addEventListener('click', () => openTrash());

  const exportMenu = $('#ov-export-menu');
  $('#ov-export')?.addEventListener('click', (event) => {
    event.stopPropagation();
    if (exportMenu) exportMenu.hidden = !exportMenu.hidden;
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.ov-export-wrap') && exportMenu) exportMenu.hidden = true;
  });
  $$('#ov-export-menu [data-export-format]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (exportMenu) exportMenu.hidden = true;
      await exportOverview(button.dataset.exportFormat, button.dataset.exportScope);
    });
  });

  const board = $('#ov-board');
  board?.addEventListener('click', async (event) => {
    if (event.target.closest('.ov-select-all')) {
      const visible = overviewFilteredTasks();
      if (!visible.length) return;
      const allSelected = visible.every((task) => state.ov.selected.has(task.id));
      for (const task of visible) {
        if (allSelected) state.ov.selected.delete(task.id);
        else state.ov.selected.add(task.id);
      }
      renderOverview();
      return;
    }

    const card = event.target.closest('.ov-card, .ov-table-row');
    if (!card) return;
    const id = card.dataset.taskId;
    if (event.target.closest('[data-ov-select]')) {
      if (state.ov.selected.has(id)) state.ov.selected.delete(id);
      else state.ov.selected.add(id);
      renderOverview();
      return;
    }
    if (event.target.closest('[data-ov-toggle]')) {
      await window.today.toggleTask(id);
      await refresh();
      return;
    }
    openDetail(id);
  });

  board?.addEventListener('dragstart', (event) => {
    const card = event.target.closest('.ov-card');
    if (!card) return;
    state.ov.dragId = card.dataset.taskId;
    card.classList.add('is-dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', card.dataset.taskId);
  });

  board?.addEventListener('dragend', () => {
    state.ov.dragId = null;
    $$('.ov-card.is-dragging').forEach((card) => card.classList.remove('is-dragging'));
    $$('.ov-lane-body.is-drop-target').forEach((lane) => lane.classList.remove('is-drop-target'));
  });

  board?.addEventListener('dragover', (event) => {
    const lane = event.target.closest('[data-lane-body]');
    if (!lane) return;
    event.preventDefault();
    lane.classList.add('is-drop-target');
  });

  board?.addEventListener('dragleave', (event) => {
    const lane = event.target.closest('[data-lane-body]');
    if (lane && !lane.contains(event.relatedTarget)) lane.classList.remove('is-drop-target');
  });

  board?.addEventListener('drop', async (event) => {
    const lane = event.target.closest('[data-lane-body]');
    if (!lane) return;
    event.preventDefault();
    lane.classList.remove('is-drop-target');
    const id = event.dataTransfer.getData('text/plain') || state.ov.dragId;
    const task = taskById(id);
    const status = lane.dataset.laneBody;
    const current = task ? overviewStatus(task) : null;
    state.ov.dragId = null;
    if (!task || !['todo', 'doing', 'done'].includes(status) || status === current) return;
    await window.today.updateTask(id, { status });
    await refresh();
    toast(`已移动到「${overviewStatusLabel(status)}」`);
  });

  $$('[data-bulk]').forEach((button) => {
    button.addEventListener('click', async () => {
      const action = button.dataset.bulk;
      if (action === 'clear') {
        state.ov.selected.clear();
        renderOverview();
        return;
      }
      const ids = [...state.ov.selected];
      if (!ids.length) return;
      try {
        if (action === 'done') {
          await window.today.bulkUpdate(ids, { status: 'done' });
        } else if (action === 'reopen') {
          await window.today.bulkUpdate(ids, { status: 'todo' });
        } else if (action === 'project') {
          openBulkProject(ids);
          return;
        } else if (action === 'delete') {
          if (!window.confirm(`将选中的 ${ids.length} 个任务移到回收站？`)) return;
          await window.today.bulkDelete(ids);
          toast(`已移 ${ids.length} 项到回收站`);
        } else if (action === 'export') {
          await exportOverview('xlsx', 'selected');
          return;
        }
        state.ov.selected.clear();
        await refresh();
      } catch (error) {
        toast(friendlyError(error, '批量操作失败'), 'err');
      }
    });
  });
}

/* ------------------------------------------------------------------ */
/* panel actions                                                       */
/* ------------------------------------------------------------------ */

async function openPanel() {
  if (VIEW === 'panel') return;
  try {
    await window.today.setExpanded(true);
  } catch {
    /* ignore */
  }
}

async function closePanel() {
  if (state.modal) {
    closeModal();
    return;
  }
  if (VIEW !== 'panel') return;
  try {
    await window.today.setExpanded(false);
  } catch {
    /* ignore */
  }
}

function setSelectedDate(key) {
  if (!key) return;
  state.selectedDate = key;
  const date = parseKey(key);
  state.viewYear = date.getFullYear();
  state.viewMonth = date.getMonth();
  renderPanel();
}

/* ------------------------------------------------------------------ */
/* modal: helpers                                                      */
/* ------------------------------------------------------------------ */

function closeModal() {
  state.modal = null;
  state.preview = null;
  const root = $('#modal-root');
  root.classList.remove('is-active');
  root.innerHTML = '';
}

function modalShell({ eyebrow, title, sub, body, footer, extraClass = '' }) {
  return `
    <div class="modal-backdrop" data-close="1"></div>
    <div class="modal-card ${extraClass}" role="dialog" aria-modal="true" aria-label="${escapeAttr(title)}">
      <div class="modal-head">
        <div class="modal-head-copy">
          <span class="modal-eyebrow">${escapeHtml(eyebrow)}</span>
          <strong class="modal-title">${escapeHtml(title)}</strong>
          ${sub ? `<span class="modal-sub">${sub}</span>` : ''}
        </div>
        <button class="icon-button modal-close" type="button" data-close="1" aria-label="关闭">${ICON.close}</button>
      </div>
      ${body}
      ${footer || ''}
    </div>
  `;
}

function priorityOptions(selected) {
  return [0, 1, 2, 3].map((value) => (
    `<option value="${value}" ${Number(selected) === value ? 'selected' : ''}>${PRIORITY[value].label}</option>`
  )).join('');
}

function statusOptions(selected) {
  return [
    { value: 'todo', label: '待处理' },
    { value: 'doing', label: '进行中' },
    { value: 'done', label: '已完成' }
  ].map((item) => (
    `<option value="${item.value}" ${overviewStatus({ status: selected }) === item.value ? 'selected' : ''}>${item.label}</option>`
  )).join('');
}

/* ------------------------------------------------------------------ */
/* modal: detail                                                       */
/* ------------------------------------------------------------------ */

function openDetail(id) {
  const task = taskById(id);
  if (!task) return;
  state.modal = { type: 'detail', id };
  const root = $('#modal-root');
  root.classList.add('is-active');
  root.innerHTML = detailHtml(task);
  bindDetail(task);
}

function detailHtml(task) {
  const source = task.sourceName
    ? `
      <div class="source-box">
        <span class="source-icon">${ICON.file}</span>
        <span class="source-copy">
          <strong>${escapeHtml(task.sourceName)}</strong>
          <span>${escapeHtml(task.sourceQuote || '由文件解析创建')}</span>
        </span>
      </div>
    `
    : '';

  const footer = `
    <div class="modal-actions">
      <button class="btn danger" type="button" id="detail-delete">${ICON.trash}移到回收站</button>
      ${task.sourcePath ? `<button class="btn ghost" type="button" id="detail-source">${ICON.open}源文件</button>` : ''}
      <span class="spacer"></span>
      <button class="btn ghost" type="button" data-close="1">取消</button>
      <button class="btn primary" type="submit" form="detail-form">保存</button>
    </div>
  `;

  return modalShell({
    eyebrow: task.status === 'done' ? '已完成任务' : task.status === 'doing' ? '进行中任务' : '任务详情',
    title: task.title,
    sub: `${formatSelected(task.dueDate || state.selectedDate)}${task.dueTime ? ` · ${task.dueTime}` : ''}`,
    body: `
      <form id="detail-form">
        <div class="field">
          <label for="detail-title">标题</label>
          <input id="detail-title" name="title" maxlength="120" value="${escapeAttr(task.title)}" required>
        </div>
        <div class="field">
          <label for="detail-project">归属项目</label>
          <input id="detail-project" name="project" list="project-suggestions" maxlength="120" value="${escapeAttr(task.project || '')}" placeholder="输入或选择项目名称">
          <datalist id="project-suggestions">
            ${projectHistory().map((project) => `<option value="${escapeAttr(project)}"></option>`).join('')}
          </datalist>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="detail-date">日期</label>
            <input id="detail-date" name="dueDate" type="date" value="${escapeAttr(task.dueDate || '')}">
          </div>
          <div class="field">
            <label for="detail-time">时间</label>
            <input id="detail-time" name="dueTime" type="time" value="${escapeAttr(task.dueTime || '')}">
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="detail-status">状态</label>
            <select id="detail-status" name="status">${statusOptions(task.status)}</select>
          </div>
          <div class="field">
            <label for="detail-priority">优先级</label>
            <select id="detail-priority" name="priority">${priorityOptions(task.priority)}</select>
          </div>
        </div>
        <div class="field">
          <label for="detail-notes">备注</label>
          <textarea id="detail-notes" name="notes" maxlength="2000" placeholder="补充上下文、地点、链接…">${escapeHtml(task.notes || '')}</textarea>
        </div>
        <div class="field">
          <label for="detail-completion">完成情况</label>
          <textarea id="detail-completion" name="completion" maxlength="2000" placeholder="记录进度、结果、卡点…">${escapeHtml(task.completion || '')}</textarea>
        </div>
        ${source}
        <div class="modal-actions" style="margin-top:2px">
          <button class="btn ${task.status === 'done' ? '' : 'primary'}" type="button" id="detail-complete">
            ${task.status === 'done' ? '重新打开' : `${ICON.check}标记完成`}
          </button>
          <span class="spacer"></span>
          <span class="modal-sub">AI 置信度 ${task.aiConfidence == null ? '—' : `${Math.round(task.aiConfidence * 100)}%`}</span>
        </div>
      </form>
    `,
    footer
  });
}

function bindDetail(task) {
  const form = $('#detail-form');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const patch = {
      title: $('#detail-title').value.trim(),
      project: $('#detail-project').value.trim(),
      status: $('#detail-status').value,
      dueDate: $('#detail-date').value || null,
      dueTime: $('#detail-time').value || null,
      priority: Number($('#detail-priority').value || 0),
      notes: $('#detail-notes').value.trim(),
      completion: $('#detail-completion').value.trim()
    };
    if (!patch.title) {
      toast('标题不能为空', 'err');
      return;
    }
    try {
      await window.today.updateTask(task.id, patch);
      if (patch.dueDate) setSelectedDate(patch.dueDate);
      closeModal();
      await refresh();
      toast('任务已更新');
    } catch (error) {
      toast(friendlyError(error), 'err');
    }
  });

  $('#detail-complete').addEventListener('click', async () => {
    try {
      await window.today.toggleTask(task.id);
      closeModal();
      await refresh();
      toast(task.status === 'done' ? '任务已重新打开' : '完成一项，继续保持');
    } catch (error) {
      toast(friendlyError(error), 'err');
    }
  });

  $('#detail-delete').addEventListener('click', async () => {
    try {
      await window.today.deleteTask(task.id);
      closeModal();
      await refresh();
      toast('已移到回收站');
    } catch (error) {
      toast(friendlyError(error), 'err');
    }
  });

  const sourceButton = $('#detail-source');
  if (sourceButton) {
    sourceButton.addEventListener('click', async () => {
      const result = await window.today.openSource(task.sourcePath);
      if (!result.ok) toast(result.message || '无法打开源文件', 'err');
    });
  }
}

/* ------------------------------------------------------------------ */
/* modal: paste text                                                   */
/* ------------------------------------------------------------------ */

function openTextParse() {
  state.modal = { type: 'text-ai' };
  const root = $('#modal-root');
  root.classList.add('is-active');
  root.innerHTML = textParseHtml();
  bindTextParse();
  setTimeout(() => $('#text-ai-input')?.focus(), 80);
}

function textParseHtml() {
  return modalShell({
    eyebrow: 'AI capture',
    title: '文字拆任务',
    sub: '粘贴会议记录、聊天记录或邮件内容，AI 提取任务后先预览，不会直接写入。',
    body: `
      <form id="text-ai-form">
        <div class="field">
          <label for="text-ai-input">文字内容</label>
          <textarea id="text-ai-input" maxlength="20000" rows="8" placeholder="在这里粘贴一段文字，例如会议纪要、客户消息、待办清单…"></textarea>
        </div>
        <div class="text-ai-meta">
          <span id="text-ai-count">0 / 20000</span>
          <span>文字会发送到你配置的 AI 服务</span>
        </div>
        <div id="text-ai-error" class="ai-status err" hidden><span class="dot"></span><span></span></div>
        <div class="modal-actions">
          <button class="btn" type="button" id="text-ai-clipboard">从剪贴板粘贴</button>
          <span class="spacer"></span>
          <button class="btn ghost" type="button" data-close="1">取消</button>
          <button class="btn primary" type="submit" id="text-ai-submit">开始解析</button>
        </div>
      </form>
    `
  });
}

function bindTextParse() {
  const input = $('#text-ai-input');
  const count = $('#text-ai-count');
  const submit = $('#text-ai-submit');
  const errorBox = $('#text-ai-error');

  const showError = (message) => {
    if (!errorBox) return;
    errorBox.hidden = false;
    const textNode = errorBox.querySelector('span:last-child');
    if (textNode) textNode.textContent = message;
  };
  const clearError = () => {
    if (errorBox) errorBox.hidden = true;
  };

  const updateCount = () => {
    if (count) count.textContent = `${input.value.length} / 20000`;
  };
  input.addEventListener('input', () => {
    updateCount();
    clearError();
  });

  input.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      $('#text-ai-form').requestSubmit();
    }
  });

  $('#text-ai-clipboard').addEventListener('click', async () => {
    try {
      const text = await window.today.readClipboardText();
      if (!text || !text.trim()) {
        showError('剪贴板里没有文字');
        return;
      }
      input.value = text.slice(0, 20000);
      updateCount();
      clearError();
      input.focus();
    } catch (error) {
      showError(friendlyError(error, '读取剪贴板失败'));
    }
  });

  $('#text-ai-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) {
      showError('先粘贴或输入一段文字');
      return;
    }
    if (text.length < 4) {
      showError('文字太短：至少输入 4 个字符，或直接使用快速添加');
      return;
    }
    if (!hasAIConfig()) {
      showError('文字解析需要先在设置中配置 AI');
      return;
    }

    clearError();
    submit.disabled = true;
    submit.textContent = '解析中…';
    try {
      const result = await window.today.parseText(text);
      closeModal();
      showPreview(result);
    } catch (error) {
      submit.disabled = false;
      submit.textContent = '开始解析';
      showError(friendlyError(error, '文字解析失败'));
    }
  });
}

/* ------------------------------------------------------------------ */
/* modal: settings                                                     */
/* ------------------------------------------------------------------ */

function openSettings() {
  state.modal = { type: 'settings' };
  const root = $('#modal-root');
  root.classList.add('is-active');
  root.innerHTML = settingsHtml();
  bindSettings();
}

function settingsHtml() {
  const s = state.settings || {};
  const ai = s.ai || {};
  return modalShell({
    eyebrow: 'Preferences',
    title: '设置',
    sub: '数据默认只保存在本机。AI 仅在你配置并主动拖入文件时调用。',
    body: `
      <div class="settings-section">
        <div class="settings-heading"><strong>外观与行为</strong><span>桌面常驻</span></div>
        <div class="setting-row">
          <div class="setting-copy"><strong>主题</strong><span>深色更适合长时间工作</span></div>
          <div style="display:flex;gap:4px">
            <button class="btn ${s.theme !== 'light' ? 'primary' : ''}" type="button" data-theme-choice="dark">深色</button>
            <button class="btn ${s.theme === 'light' ? 'primary' : ''}" type="button" data-theme-choice="light">浅色</button>
          </div>
        </div>
        <div class="setting-row setting-row-wrap">
          <div class="setting-copy"><strong>界面大小</strong><span>自动时，100% 缩放下约为 115%</span></div>
          <div class="scale-choices">
            <button class="btn ${(s.uiScale || 'auto') === 'auto' ? 'primary' : ''}" type="button" data-ui-scale="auto">自动</button>
            <button class="btn ${s.uiScale === 'standard' ? 'primary' : ''}" type="button" data-ui-scale="standard">标准</button>
            <button class="btn ${s.uiScale === 'large' ? 'primary' : ''}" type="button" data-ui-scale="large">大</button>
            <button class="btn ${s.uiScale === 'xlarge' ? 'primary' : ''}" type="button" data-ui-scale="xlarge">特大</button>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-copy"><strong>窗口置顶</strong><span>始终显示在其他窗口上方</span></div>
          <button class="toggle ${s.alwaysOnTop ? 'on' : ''}" type="button" data-toggle="alwaysOnTop" aria-label="切换置顶"></button>
        </div>
        <div class="setting-row">
          <div class="setting-copy"><strong>通知提醒</strong><span>到点提醒、每日摘要和逾期提醒</span></div>
          <button class="toggle ${s.notifications ? 'on' : ''}" type="button" data-toggle="notifications" aria-label="切换提醒"></button>
        </div>
        <div class="setting-row">
          <div class="setting-copy"><strong>开机启动</strong><span>登录 Windows 后自动运行</span></div>
          <button class="toggle ${s.autoStart ? 'on' : ''}" type="button" data-toggle="autoStart" aria-label="切换开机启动"></button>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-heading"><strong>AI 文件解析</strong><span>${ai.hasKey ? '已配置' : '未配置'}</span></div>
        <div class="setting-row">
          <div class="setting-copy">
            <strong>${ai.hasKey ? 'AI 已启用' : '尚未配置 AI'}</strong>
            <span>${ai.hasKey ? `${escapeHtml(ai.model || 'deepseek-chat')} · ${escapeHtml(ai.keyHint || '')}` : '文件拖入和文字解析需要先配置 AI'}</span>
          </div>
          <button class="btn" type="button" id="open-ai-settings">配置 AI</button>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-heading"><strong>数据</strong><span>${escapeHtml(state.tasks.length)} 条任务</span></div>
        <div class="modal-actions" style="margin-top:0;flex-wrap:wrap">
          <button class="btn" type="button" id="data-folder">${ICON.open}数据目录</button>
          <button class="btn" type="button" id="data-export">导出备份</button>
          <button class="btn" type="button" id="window-reset">重置位置</button>
          <button class="btn" type="button" id="data-trash">回收站 (${state.trashCount || 0})</button>
          <button class="btn danger" type="button" id="data-clear-demo">清除示例</button>
        </div>
        <p class="settings-note">${state.dataMode === 'portable'
          ? '便携模式：数据保存在程序目录的 data/ 中，复制整个程序文件夹到另一台电脑即可带走任务。'
          : state.dataMode === 'appdata'
            ? '程序目录不可写，数据暂时保存在 AppData。把程序放到可写目录即可启用便携数据。'
            : '每天自动保留最近 7 份备份。不要将正在使用的 data.json 直接放进 OneDrive 同步。'}</p>
      </div>
    `,
    footer: `
      <div class="modal-actions">
        <span class="spacer"></span>
        <button class="btn ghost" type="button" data-close="1">关闭</button>
      </div>
    `
  });
}

function trashProjects() {
  const names = [];
  for (const task of [...state.tasks, ...state.trash]) {
    const project = String(task.project || '').trim();
    if (project && !names.includes(project)) names.push(project);
  }
  return names.slice(0, 80);
}

function trashFilteredTasks() {
  const query = state.trashView.query.trim().toLowerCase();
  return state.trash.filter((task) => {
    if (state.trashView.project && String(task.project || '').trim() !== state.trashView.project) return false;
    if (!query) return true;
    return [task.title, task.project, task.notes, task.completion, task.sourceName]
      .filter(Boolean).join('\n').toLowerCase().includes(query);
  });
}

function trashDeletedLabel(value) {
  if (!value) return '删除时间未知';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '删除时间未知';
  return `删除于 ${date.toLocaleString('zh-CN', { hour12: false })}`;
}

function trashItemHtml(task) {
  const status = overviewStatus(task);
  const selected = state.trashView.selected.has(task.id);
  const project = String(task.project || '').trim();
  return `
    <div class="trash-item ${selected ? 'is-selected' : ''}" data-trash-id="${escapeAttr(task.id)}">
      <input class="trash-check" type="checkbox" data-trash-select aria-label="选择任务" ${selected ? 'checked' : ''}>
      <div class="trash-copy">
        <strong class="trash-title">${escapeHtml(task.title)}</strong>
        <span class="trash-meta">${project ? `#${escapeHtml(project)} · ` : ''}原状态：${overviewStatusLabel(status)}${task.dueDate ? ` · 截止 ${escapeHtml(task.dueDate)}` : ''}</span>
        <span class="trash-meta">${escapeHtml(trashDeletedLabel(task.deletedAt))}</span>
      </div>
      <div class="trash-actions">
        <button class="btn" type="button" data-trash-restore>恢复</button>
        <button class="btn danger" type="button" data-trash-delete>彻底删除</button>
      </div>
    </div>
  `;
}

function trashTableHtml(tasks) {
  if (!tasks.length) return '';
  const rows = tasks.map((task) => {
    const project = String(task.project || '').trim();
    return `
      <tr class="trash-table-row" data-trash-id="${escapeAttr(task.id)}">
        <td><input class="trash-check" type="checkbox" data-trash-select aria-label="选择任务" ${state.trashView.selected.has(task.id) ? 'checked' : ''}></td>
        <td class="trash-table-title">${escapeHtml(task.title)}</td>
        <td>${project ? `<span class="ov-project">#${escapeHtml(project)}</span>` : '<span class="ov-muted">—</span>'}</td>
        <td>${overviewStatusLabel(overviewStatus(task))}</td>
        <td>${escapeHtml(trashDeletedLabel(task.deletedAt).replace('删除于 ', ''))}</td>
        <td class="trash-table-actions">
          <button class="btn" type="button" data-trash-restore>恢复</button>
          <button class="btn danger" type="button" data-trash-delete>彻底删除</button>
        </td>
      </tr>
    `;
  }).join('');
  return `
    <div class="trash-table-wrap">
      <table class="trash-table">
        <thead>
          <tr><th></th><th>任务</th><th>项目</th><th>原状态</th><th>删除时间</th><th>操作</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function trashListHtml() {
  const tasks = trashFilteredTasks();
  if (!tasks.length) {
    return `<div class="trash-empty">
      <strong>${state.trash.length ? '没有符合条件的任务' : '回收站是空的'}</strong>
      <span>${state.trash.length ? '调整搜索或项目筛选。' : '删除的任务会先放在这里，可以恢复。'}</span>
    </div>`;
  }
  return state.trashView.mode === 'table'
    ? trashTableHtml(tasks)
    : tasks.map(trashItemHtml).join('');
}

function trashHtml() {
  return modalShell({
    eyebrow: 'RECYCLE BIN',
    title: '回收站',
    extraClass: 'trash-modal',
    sub: `共 ${state.trash.length} 项。${state.trash.length ? '恢复后回到原状态；彻底删除后不可恢复。' : '这里会暂存删除的任务。'}`,
    body: `
      <div class="trash-toolbar">
        <input id="trash-search" class="trash-search" type="search" value="${escapeAttr(state.trashView.query)}" placeholder="搜索已删除任务…">
        <select id="trash-project" class="trash-select">
          <option value="">全部项目</option>
          ${trashProjects().map((project) => `<option value="${escapeAttr(project)}" ${project === state.trashView.project ? 'selected' : ''}>${escapeHtml(project)}</option>`).join('')}
        </select>
      </div>
      <div class="trash-view-row">
        <div class="trash-view-switch" role="group" aria-label="回收站显示模式">
          <button type="button" data-trash-mode="card" class="${state.trashView.mode === 'card' ? 'is-active' : ''}">卡片</button>
          <button type="button" data-trash-mode="table" class="${state.trashView.mode === 'table' ? 'is-active' : ''}">表格</button>
        </div>
      </div>
      <div class="trash-bulk">
        <strong><span id="trash-selected-count">${state.trashView.selected.size}</span> 项已选</strong>
        <button class="btn" type="button" data-trash-bulk="restore">恢复</button>
        <button class="btn danger" type="button" data-trash-bulk="delete">彻底删除</button>
        <button class="ov-link" type="button" data-trash-bulk="clear">取消选择</button>
      </div>
      <div id="trash-list" class="trash-list">${trashListHtml()}</div>
    `,
    footer: `
      <div class="modal-actions">
        <button class="btn ghost" type="button" id="trash-restore-all" ${state.trash.length ? '' : 'disabled'}>全部恢复</button>
        <button class="btn danger" type="button" id="trash-empty" ${state.trash.length ? '' : 'disabled'}>清空回收站</button>
        <span class="spacer"></span>
        <button class="btn ghost" type="button" data-close="1">关闭</button>
      </div>
    `
  });
}

function openTrash() {
  state.modal = { type: 'trash' };
  const root = $('#modal-root');
  root.classList.add('is-active');
  root.innerHTML = trashHtml();
  bindTrash();
}

function renderTrashList() {
  const list = $('#trash-list');
  if (list) list.innerHTML = trashListHtml();
  const count = $('#trash-selected-count');
  if (count) count.textContent = String(state.trashView.selected.size);
  const bulk = $('.trash-bulk');
  if (bulk) bulk.classList.toggle('is-active', state.trashView.selected.size > 0);
}

async function refreshTrashModal(message) {
  state.trashView.selected.clear();
  await refresh();
  openTrash();
  if (message) toast(message);
}

function bindTrash() {
  const search = $('#trash-search');
  search?.addEventListener('input', () => {
    state.trashView.query = search.value;
    renderTrashList();
  });
  $('#trash-project')?.addEventListener('change', (event) => {
    state.trashView.project = event.target.value;
    renderTrashList();
  });

  $$('[data-trash-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      state.trashView.mode = button.dataset.trashMode === 'table' ? 'table' : 'card';
      try {
        localStorage.setItem('todayblock.trash.mode', state.trashView.mode);
      } catch {
        /* ignore */
      }
      $$('[data-trash-mode]').forEach((item) => {
        item.classList.toggle('is-active', item.dataset.trashMode === state.trashView.mode);
      });
      renderTrashList();
    });
  });

  const list = $('#trash-list');
  list?.addEventListener('click', async (event) => {
    const item = event.target.closest('[data-trash-id]');
    if (!item) return;
    const id = item.dataset.trashId;
    if (event.target.closest('[data-trash-select]')) {
      if (state.trashView.selected.has(id)) state.trashView.selected.delete(id);
      else state.trashView.selected.add(id);
      renderTrashList();
      return;
    }
    try {
      if (event.target.closest('[data-trash-restore]')) {
        await window.today.restoreTrash([id]);
        await refreshTrashModal('已恢复任务');
      } else if (event.target.closest('[data-trash-delete]')) {
        if (!window.confirm('彻底删除这个任务？删除后不可恢复。')) return;
        await window.today.deleteTrash([id]);
        await refreshTrashModal('已彻底删除');
      }
    } catch (error) {
      toast(friendlyError(error, '操作失败'), 'err');
    }
  });

  $$('[data-trash-bulk]').forEach((button) => {
    button.addEventListener('click', async () => {
      const action = button.dataset.trashBulk;
      if (action === 'clear') {
        state.trashView.selected.clear();
        renderTrashList();
        return;
      }
      const ids = [...state.trashView.selected];
      if (!ids.length) return;
      try {
        if (action === 'restore') {
          await window.today.restoreTrash(ids);
          await refreshTrashModal(`已恢复 ${ids.length} 项`);
        } else if (action === 'delete') {
          if (!window.confirm(`彻底删除选中的 ${ids.length} 个任务？删除后不可恢复。`)) return;
          await window.today.deleteTrash(ids);
          await refreshTrashModal(`已彻底删除 ${ids.length} 项`);
        }
      } catch (error) {
        toast(friendlyError(error, '操作失败'), 'err');
      }
    });
  });

  $('#trash-restore-all')?.addEventListener('click', async () => {
    if (!state.trash.length) return;
    if (!window.confirm(`恢复回收站里的 ${state.trash.length} 个任务？`)) return;
    try {
      await window.today.restoreAllTrash();
      await refreshTrashModal('已恢复全部任务');
    } catch (error) {
      toast(friendlyError(error, '恢复失败'), 'err');
    }
  });

  $('#trash-empty')?.addEventListener('click', async () => {
    if (!state.trash.length) return;
    if (!window.confirm(`彻底删除回收站里的 ${state.trash.length} 个任务？删除后不可恢复。`)) return;
    try {
      await window.today.emptyTrash();
      await refreshTrashModal('回收站已清空');
    } catch (error) {
      toast(friendlyError(error, '清空失败'), 'err');
    }
  });
}

function aiSettingsHtml() {
  const ai = state.settings?.ai || {};
  return modalShell({
    eyebrow: 'AI settings',
    title: 'AI 文件解析',
    sub: '文件和文字解析只使用 AI。配置后，提取出的文字会发送到你指定的服务。',
    body: `
      <div class="field">
        <label for="ai-base">Base URL</label>
        <input id="ai-base" value="${escapeAttr(ai.baseUrl || 'https://api.deepseek.com/v1')}" placeholder="https://api.deepseek.com/v1">
      </div>
      <div class="field">
        <label for="ai-model">模型</label>
        <input id="ai-model" value="${escapeAttr(ai.model || 'deepseek-chat')}" placeholder="deepseek-chat">
      </div>
      <div class="field">
        <label for="ai-key">API Key ${ai.hasKey ? '（留空则不修改）' : ''}</label>
        <input id="ai-key" type="password" placeholder="${ai.hasKey ? '已保存，输入新 key 可替换' : 'sk-...'}" autocomplete="off">
      </div>
      <div class="modal-actions" style="margin-top:2px">
        <button class="btn primary" type="button" id="ai-save">保存 AI 配置</button>
        <button class="btn" type="button" id="ai-test">测试连接</button>
        <span class="spacer"></span>
        ${ai.hasKey ? '<button class="btn ghost" type="button" id="ai-clear">清除 key</button>' : ''}
      </div>
      <div id="ai-status" class="ai-status"><span class="dot"></span><span>${ai.hasKey ? '已配置，文件解析和文字解析都会使用 AI。' : '未配置 key：拖入文件和粘贴文字暂时不可用，请先配置 AI。'}</span></div>
      <p class="settings-note">兼容 OpenAI Chat Completions 接口。密钥使用 Windows 凭据加密后保存在本机；不会写入任务数据。</p>
    `,
    footer: `
      <div class="modal-actions">
        <button class="btn ghost" type="button" id="ai-back">返回设置</button>
        <span class="spacer"></span>
        <button class="btn ghost" type="button" data-close="1">关闭</button>
      </div>
    `
  });
}

function openAISettings() {
  state.modal = { type: 'ai-settings' };
  const root = $('#modal-root');
  root.classList.add('is-active');
  root.innerHTML = aiSettingsHtml();
  bindAISettings();
}

function bindAISettings() {
  $('#ai-back')?.addEventListener('click', () => openSettings());

  $('#ai-save')?.addEventListener('click', async () => {
    const patch = {
      ai: {
        baseUrl: $('#ai-base').value.trim(),
        model: $('#ai-model').value.trim()
      }
    };
    const key = $('#ai-key').value.trim();
    if (key) patch.ai.apiKey = key;
    await saveSettings(patch);
    const status = $('#ai-status');
    if (status) {
      status.className = 'ai-status ok';
      status.innerHTML = `<span class="dot"></span><span>已保存。文件和文字解析都会使用 AI。</span>`;
    }
    toast('AI 配置已保存');
  });

  $('#ai-test')?.addEventListener('click', async () => {
    const button = $('#ai-test');
    const status = $('#ai-status');
    button.disabled = true;
    button.textContent = '测试中…';
    if (status) {
      status.className = 'ai-status';
      status.innerHTML = '<span class="dot"></span><span>正在连接…</span>';
    }
    try {
      const result = await window.today.testAI();
      if (status) {
        status.className = `ai-status ${result.ok ? 'ok' : 'err'}`;
        status.innerHTML = `<span class="dot"></span><span>${escapeHtml(result.message)}</span>`;
      }
    } finally {
      button.disabled = false;
      button.textContent = '测试连接';
    }
  });

  $('#ai-clear')?.addEventListener('click', async () => {
    await saveSettings({ ai: { clearKey: true } });
    toast('API Key 已清除');
  });
}

function bindSettings() {
  $('#open-ai-settings')?.addEventListener('click', () => openAISettings());

  $$('[data-theme-choice]').forEach((button) => {
    button.addEventListener('click', async () => {
      await saveSettings({ theme: button.dataset.themeChoice });
    });
  });

  $$('[data-ui-scale]').forEach((button) => {
    button.addEventListener('click', async () => {
      await saveSettings({ uiScale: button.dataset.uiScale });
    });
  });

  $$('[data-toggle]').forEach((button) => {
    button.addEventListener('click', async () => {
      const key = button.dataset.toggle;
      const next = !(state.settings?.[key]);
      await saveSettings({ [key]: next });
    });
  });

  $('#data-folder').addEventListener('click', () => window.today.openDataFolder());
  $('#data-export').addEventListener('click', async () => {
    const result = await window.today.exportBackup();
    if (result.ok) toast(`已导出到 ${result.path}`);
    else if (result.message) toast(result.message, 'err');
  });
  $('#window-reset').addEventListener('click', async () => {
    await window.today.resetPosition();
    toast('悬浮块已回到右上角');
  });
  $('#data-trash')?.addEventListener('click', () => openTrash());
  $('#data-clear-demo').addEventListener('click', async () => {
    if (!window.confirm('删除所有示例任务？你自己创建的任务不会受影响。')) return;
    await window.today.clearDemo();
    await refresh();
    openSettings();
    toast('示例任务已清除');
  });
}

async function saveSettings(patch) {
  try {
    const snapshot = await window.today.updateSettings(patch);
    applyState(snapshot);
    renderAll();
    if (state.modal?.type === 'settings') openSettings();
    else if (state.modal?.type === 'ai-settings') openAISettings();
  } catch (error) {
    toast(friendlyError(error), 'err');
  }
}

/* ------------------------------------------------------------------ */
/* modal: preview                                                      */
/* ------------------------------------------------------------------ */

function showPreview(result) {
  const tasks = Array.isArray(result.tasks) ? result.tasks : [];
  state.preview = {
    files: result.files || [],
    warnings: result.warnings || [],
    engine: result.engine || 'ai',
    tasks,
    selected: new Set(tasks.map((_, index) => index))
  };
  state.modal = { type: 'preview' };
  const root = $('#modal-root');
  root.classList.add('is-active');
  root.innerHTML = previewHtml();
  bindPreview();
}

function previewHtml() {
  const preview = state.preview;
  if (!preview) return '';
  const fileNames = preview.files.map((file) => file.name).join('、');
  const engineLabel = 'AI 解析';
  const warnings = preview.warnings.length
    ? `<div class="ai-status err" style="margin:0 0 8px"><span class="dot"></span><span>${escapeHtml(preview.warnings.join('；'))}</span></div>`
    : '';

  const list = preview.tasks.length
    ? preview.tasks.map((task, index) => {
      const selected = preview.selected.has(index);
      const date = task.dueDate || '';
      const time = task.dueTime || '';
      return `
        <div class="candidate ${selected ? 'selected' : ''}" data-index="${index}">
          <button class="candidate-check" type="button" data-action="select" aria-label="选择任务">${ICON.check}</button>
          <div class="candidate-body">
            <input class="candidate-title" data-field="title" value="${escapeAttr(task.title)}" maxlength="120" aria-label="任务标题">
            <div class="candidate-meta">
              <input type="date" data-field="dueDate" value="${escapeAttr(date)}" aria-label="日期">
              <input type="time" data-field="dueTime" value="${escapeAttr(time)}" aria-label="时间">
              <select data-field="priority" aria-label="优先级">${priorityOptions(task.priority)}</select>
              <span class="confidence">${Math.round((task.aiConfidence || 0) * 100)}%</span>
            </div>
            ${task.sourceQuote ? `<span class="candidate-quote">“${escapeHtml(task.sourceQuote)}”</span>` : ''}
          </div>
        </div>
      `;
    }).join('')
    : `<div class="preview-empty">没有识别到明确任务。<br>可以关闭后手动添加，或换一份文字版文件再试。</div>`;

  const footer = `
    <div class="preview-foot">
      <button class="btn ghost" type="button" data-close="1">取消</button>
      <span class="spacer"></span>
      <button class="btn primary" type="button" id="preview-confirm" ${preview.tasks.length ? '' : 'disabled'}>
        添加选中 (${preview.selected.size})
      </button>
    </div>
  `;

  return modalShell({
    eyebrow: 'AI extracted',
    title: preview.tasks.length ? `拆出 ${preview.tasks.length} 项任务` : '没有识别到任务',
    sub: `${escapeHtml(fileNames)} · ${engineLabel}${preview.files.length > 1 ? ` · ${preview.files.length} 个文件` : ''}`,
    body: `
      <div class="preview-summary">
        <span class="badge ai">${engineLabel}</span>
        <span class="badge">${preview.selected.size} / ${preview.tasks.length} 已选</span>
      </div>
      ${warnings}
      <div class="candidate-list">${list}</div>
    `,
    footer
  });
}

function bindPreview() {
  const root = $('#modal-root');

  root.addEventListener('click', (event) => {
    const candidate = event.target.closest('.candidate');
    if (!candidate) return;
    const index = Number(candidate.dataset.index);
    if (!Number.isInteger(index)) return;
    const action = event.target.closest('[data-action="select"]');
    if (action) {
      if (state.preview.selected.has(index)) state.preview.selected.delete(index);
      else state.preview.selected.add(index);
      candidate.classList.toggle('selected', state.preview.selected.has(index));
      const button = $('#preview-confirm');
      if (button) button.textContent = `添加选中 (${state.preview.selected.size})`;
    }
  });

  root.addEventListener('input', (event) => {
    const field = event.target.dataset.field;
    const candidate = event.target.closest('.candidate');
    if (!field || !candidate) return;
    const index = Number(candidate.dataset.index);
    if (!Number.isInteger(index) || !state.preview.tasks[index]) return;
    if (field === 'title') state.preview.tasks[index].title = event.target.value;
  });

  root.addEventListener('change', (event) => {
    const field = event.target.dataset.field;
    const candidate = event.target.closest('.candidate');
    if (!field || !candidate) return;
    const index = Number(candidate.dataset.index);
    if (!Number.isInteger(index) || !state.preview.tasks[index]) return;
    if (field === 'dueDate') state.preview.tasks[index].dueDate = event.target.value || null;
    if (field === 'dueTime') state.preview.tasks[index].dueTime = event.target.value || null;
    if (field === 'priority') state.preview.tasks[index].priority = Number(event.target.value || 0);
  });

  $('#preview-confirm').addEventListener('click', async () => {
    const selected = [...state.preview.selected]
      .sort((a, b) => a - b)
      .map((index) => state.preview.tasks[index])
      .filter((task) => task && String(task.title || '').trim());
    if (!selected.length) {
      toast('至少选择一项任务', 'err');
      return;
    }

    const button = $('#preview-confirm');
    button.disabled = true;
    button.textContent = '写入中…';
    try {
      const earliest = selected
        .map((task) => task.dueDate)
        .filter(Boolean)
        .sort()[0];
      await window.today.bulkCreate({ tasks: selected });
      closeModal();
      if (earliest) setSelectedDate(earliest);
      await refresh();
      toast(`已加入 ${selected.length} 项任务`);
    } catch (error) {
      toast(friendlyError(error), 'err');
      button.disabled = false;
      button.textContent = `添加选中 (${selected.length})`;
    }
  });
}

/* ------------------------------------------------------------------ */
/* drag & drop                                                         */
/* ------------------------------------------------------------------ */

function hasFiles(event) {
  if (!event.dataTransfer) return false;
  const types = Array.from(event.dataTransfer.types || []);
  if (types.includes('Files')) return true;
  return Array.from(event.dataTransfer.items || []).some((item) => item.kind === 'file');
}

function showDropOverlay(show) {
  const overlay = $('#drop-overlay');
  if (overlay) overlay.hidden = !show;
}

async function handleDrop(event) {
  event.preventDefault();
  state.dragDepth = 0;
  showDropOverlay(false);

  const files = Array.from(event.dataTransfer?.files || []);
  const paths = [];
  for (const file of files) {
    try {
      const filePath = window.today.getPathForFile(file);
      if (filePath) paths.push(filePath);
    } catch {
      /* ignore */
    }
  }

  if (!paths.length) {
    toast('没有读到文件路径，请从资源管理器拖入文件', 'err');
    return;
  }

  if (VIEW === 'bubble') {
    await window.today.openFilesInPanel(paths);
    return;
  }

  if (!hasAIConfig()) {
    toast('文件解析需要先在设置中配置 AI', 'err');
    openSettings();
    return;
  }

  await parseDroppedPaths(paths);
}

async function parseDroppedPaths(paths) {
  setBusy(true);
  try {
    const result = await window.today.parseFiles(paths);
    setBusy(false);
    showPreview(result);
  } catch (error) {
    setBusy(false);
    showParseError(friendlyError(error, '文件解析失败'), paths);
  }
}

function showParseError(message, paths) {
  state.modal = { type: 'parse-error' };
  const root = $('#modal-root');
  root.classList.add('is-active');
  root.innerHTML = modalShell({
    eyebrow: 'AI error',
    title: '文件解析失败',
    sub: '没有生成任务，也没有使用本地规则。你可以重试，或把文件作为附件手动创建任务。',
    body: `<div class="ai-status err"><span class="dot"></span><span>${escapeHtml(message)}</span></div>`,
    footer: `
      <div class="modal-actions">
        <button class="btn" type="button" id="parse-retry">重试</button>
        <button class="btn" type="button" id="parse-manual">创建附件任务</button>
        <span class="spacer"></span>
        <button class="btn ghost" type="button" data-close="1">取消</button>
      </div>
    `
  });

  $('#parse-retry').addEventListener('click', () => {
    closeModal();
    parseDroppedPaths(paths);
  });

  $('#parse-manual').addEventListener('click', async () => {
    const tasks = paths.map((filePath) => {
      const name = filePath.split(/[\\/]/).pop() || '文件';
      const title = name.replace(/\.[^.]+$/, '') || '处理文件';
      return {
        title,
        dueDate: null,
        dueTime: null,
        priority: 1,
        notes: '从附件手动创建',
        sourceName: name,
        sourcePath: filePath,
        sourceQuote: 'AI 解析失败后创建'
      };
    });
    try {
      await window.today.bulkCreate({ tasks });
      closeModal();
      await refresh();
      toast(tasks.length > 1 ? `已创建 ${tasks.length} 个附件任务` : '已创建附件任务');
    } catch (error) {
      toast(friendlyError(error), 'err');
    }
  });
}

function bindDrop() {
  window.addEventListener('dragenter', (event) => {
    // Always accept the drag. Some Windows/Electron combinations expose an
    // empty dataTransfer.types during dragenter, which would otherwise leave
    // the cursor as a forbidden sign.
    event.preventDefault();
    if (!hasFiles(event)) return;
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    state.dragDepth += 1;
    showDropOverlay(true);
  });

  window.addEventListener('dragover', (event) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  });

  window.addEventListener('dragleave', (event) => {
    event.preventDefault();
    if (!hasFiles(event)) return;
    state.dragDepth = Math.max(0, state.dragDepth - 1);
    if (state.dragDepth === 0) showDropOverlay(false);
  });

  window.addEventListener('dragend', () => {
    state.dragDepth = 0;
    showDropOverlay(false);
  });

  window.addEventListener('drop', handleDrop);
}

/* ------------------------------------------------------------------ */
/* bubble drag & open                                                  */
/* ------------------------------------------------------------------ */

function bindBubble() {
  const bubble = $('#bubble');
  let drag = null;

  bubble.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    drag = {
      x: event.screenX,
      y: event.screenY,
      pointerId: event.pointerId,
      moved: false
    };
    bubble.setPointerCapture(event.pointerId);
    window.today.dragStart();
  });

  bubble.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.screenX - drag.x;
    const dy = event.screenY - drag.y;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
    if (drag.moved) window.today.dragTo({ x: event.screenX, y: event.screenY });
  });

  bubble.addEventListener('pointerup', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const moved = drag.moved;
    drag = null;
    window.today.dragEnd();
    if (!moved) openPanel();
  });

  bubble.addEventListener('pointercancel', () => {
    if (!drag) return;
    drag = null;
    window.today.dragEnd();
  });

  bubble.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPanel();
    }
  });
}

function bindPanelDrag() {
  const header = $('.panel-header');
  if (!header) return;
  let drag = null;

  header.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    if (event.target.closest('button, input, select, textarea, a')) return;
    event.preventDefault();
    drag = {
      x: event.screenX,
      y: event.screenY,
      pointerId: event.pointerId,
      moved: false
    };
    header.setPointerCapture(event.pointerId);
    window.today.dragStart();
  });

  header.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.screenX - drag.x;
    const dy = event.screenY - drag.y;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    if (drag.moved) window.today.dragTo({ x: event.screenX, y: event.screenY });
  });

  header.addEventListener('pointerup', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag = null;
    window.today.dragEnd();
  });

  header.addEventListener('pointercancel', () => {
    if (!drag) return;
    drag = null;
    window.today.dragEnd();
  });
}

/* ------------------------------------------------------------------ */
/* events                                                              */
/* ------------------------------------------------------------------ */

function bindEvents() {
  if (VIEW === 'overview') {
    bindOverview();
  } else {
    bindBubble();
    bindPanelDrag();
    bindDrop();
  }

  $('#btn-overview').addEventListener('click', () => window.today.openOverview());

  $('#btn-today').addEventListener('click', () => {
    const date = new Date();
    state.viewYear = date.getFullYear();
    state.viewMonth = date.getMonth();
    state.selectedDate = localKey(date);
    renderPanel();
  });

  $('#prev-month').addEventListener('click', () => {
    state.viewMonth -= 1;
    if (state.viewMonth < 0) {
      state.viewMonth = 11;
      state.viewYear -= 1;
    }
    if (!isSameMonth(state.selectedDate, state.viewYear, state.viewMonth)) {
      state.selectedDate = localKey(startOfMonth(state.viewYear, state.viewMonth));
    }
    renderPanel();
  });

  $('#next-month').addEventListener('click', () => {
    state.viewMonth += 1;
    if (state.viewMonth > 11) {
      state.viewMonth = 0;
      state.viewYear += 1;
    }
    if (!isSameMonth(state.selectedDate, state.viewYear, state.viewMonth)) {
      state.selectedDate = localKey(startOfMonth(state.viewYear, state.viewMonth));
    }
    renderPanel();
  });

  $('#calendar').addEventListener('click', (event) => {
    const day = event.target.closest('.day');
    if (!day) return;
    setSelectedDate(day.dataset.date);
  });

  $('#task-list').addEventListener('click', async (event) => {
    const row = event.target.closest('.task-row');
    if (!row) return;
    const id = row.dataset.taskId;
    const action = event.target.closest('[data-action="toggle"]');
    if (action) {
      event.stopPropagation();
      try {
        await window.today.toggleTask(id);
        await refresh();
        toast('任务状态已更新');
      } catch (error) {
        toast(friendlyError(error), 'err');
      }
      return;
    }
    openDetail(id);
  });

  $('#btn-settings').addEventListener('click', openSettings);
  $('#btn-close').addEventListener('click', closePanel);
  $('#btn-text-ai').addEventListener('click', openTextParse);

  $('#quick-add').addEventListener('submit', async (event) => {
    event.preventDefault();
    const titleInput = $('#quick-title');
    const dateInput = $('#quick-date');
    const title = titleInput.value.trim();
    if (!title) return;
    try {
      await window.today.createTask({
        title,
        dueDate: dateInput.value || state.selectedDate,
        dueTime: null,
        priority: 0
      });
      titleInput.value = '';
      await refresh();
      toast('已添加');
      titleInput.focus();
    } catch (error) {
      toast(friendlyError(error), 'err');
    }
  });

  $('#modal-root').addEventListener('click', (event) => {
    if (event.target.closest('[data-close]')) {
      closeModal();
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (state.modal) closeModal();
      else if (state.expanded) closePanel();
    }
  });

  window.today.onStateChanged((snapshot) => {
    applyState(snapshot);
    renderAll();
  });

  window.today.onExpanded(() => {
    if (VIEW === 'panel') renderPanel();
  });

  window.today.onOpenSettings(() => openSettings());

  window.today.onShowPreview((result) => {
    if (VIEW === 'panel') showPreview(result);
  });

  window.today.onShowParseError((payload) => {
    if (VIEW === 'panel' && payload) {
      showParseError(payload.message || '文件解析失败', payload.paths || []);
    }
  });

  window.today.onFocusTask((id) => {
    if (!state.expanded) {
      state.expanded = true;
      renderAll();
    }
    openDetail(id);
  });
}

/* ------------------------------------------------------------------ */
/* boot                                                                */
/* ------------------------------------------------------------------ */

async function boot() {
  if (!window.today) {
    document.body.innerHTML = '<div style="padding:24px;color:#e8eef7;font-family:Segoe UI">请通过 Electron 启动 TodayBlock。</div>';
    return;
  }
  bindEvents();
  try {
    const snapshot = await window.today.getState();
    applyState(snapshot);
    state.selectedDate = snapshot.today;
    const date = parseKey(snapshot.today);
    state.viewYear = date.getFullYear();
    state.viewMonth = date.getMonth();
    renderAll();
    const dateInput = $('#quick-date');
    if (dateInput) dateInput.value = state.selectedDate;
  } catch (error) {
    toast(`启动失败：${friendlyError(error)}`, 'err');
  }
}

window.__todayApp = {
  state,
  openPanel,
  closePanel,
  openSettings,
  openTextParse,
  openDetail,
  openBulkProject,
  openTrash,
  closeModal,
  showPreview,
  refresh
};

boot();
