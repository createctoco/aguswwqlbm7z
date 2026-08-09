let token = '';
let lastLog = '';
const $ = (selector) => document.querySelector(selector);
const buttons = [...document.querySelectorAll('[data-action]')];

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value));
}

function setConfig(id, ready) {
  const element = $(id);
  element.textContent = ready ? '已配置' : '未配置';
  element.style.color = ready ? '#0b6848' : '#a33b32';
}

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  setTimeout(() => element.classList.remove('show'), 2800);
}

function render(data) {
  token = data.csrfToken;
  $('#product-count').textContent = data.catalog.products;
  $('#locale-count').textContent = data.catalog.locales;
  $('#catalog-time').textContent = data.catalog.generatedAt
    ? `生成于 ${formatDate(data.catalog.generatedAt)}`
    : '尚未生成';
  setConfig('#mecrt-state', data.config.mecrt);
  setConfig('#deepseek-state', data.config.deepseek);
  setConfig('#cloudflare-state', data.config.cloudflare);
  $('#git-state').textContent = data.git || '工作区干净';
  $('#queue-state').textContent = data.queue.sourceTotal
    ? `待处理 ${data.queue.pending} · 本批 ${data.queue.inflight} · 已完成 ${data.queue.processed}/${data.queue.sourceTotal}`
    : '尚未建立队列';

  const task = data.activeTask || data.latestTask;
  const running = Boolean(data.activeTask);
  const state = $('#system-state');
  state.className = `state-pill ${running ? 'running' : task?.status || ''}`;
  state.textContent = running
    ? `运行中 · ${task.step}`
    : task?.status === 'success'
      ? '上次任务成功'
      : task?.status === 'failed'
        ? '上次任务失败'
        : '系统待机';
  buttons.forEach((button) => (button.disabled = running));

  $('#task-label').textContent = task?.label || '暂无';
  $('#task-step').textContent = task?.step || '—';
  $('#task-started').textContent = formatDate(task?.startedAt);
  $('#task-log').textContent = task?.logFile || '—';
  const result = $('#task-result');
  result.className = `badge ${running ? 'running' : task?.status || 'neutral'}`;
  result.textContent = running
    ? '运行中'
    : task?.status === 'success'
      ? '成功'
      : task?.status === 'failed'
        ? '失败'
        : '待机';

  if (data.tail && data.tail !== lastLog) {
    lastLog = data.tail;
    const output = $('#log-output');
    output.textContent = data.tail;
    output.scrollTop = output.scrollHeight;
  }
}

async function refresh() {
  try {
    const response = await fetch('/api/status', { cache: 'no-store' });
    if (!response.ok) throw new Error(`状态请求失败：${response.status}`);
    render(await response.json());
  } catch {
    $('#system-state').className = 'state-pill failed';
    $('#system-state').textContent = '工作台连接失败';
  }
}

async function run(action) {
  const labels = {
    full: '处理并发布下一批（最多10个）',
    sync: '产品同步',
    enrich: 'DeepSeek加工',
    prepare: '目录生成',
    publishData: 'D1推送',
    deploy: '网站发布',
  };
  if (!confirm(`确认开始“${labels[action]}”？运行期间请不要关闭工作台。`)) return;
  try {
    const response = await fetch(`/api/tasks/${action}`, { method: 'POST', headers: { 'x-ouooo-token': token } });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || '无法启动任务');
    toast(`${labels[action]}已启动`);
    await refresh();
  } catch (error) {
    toast(error.message);
  }
}

buttons.forEach((button) => button.addEventListener('click', () => run(button.dataset.action)));
$('#copy-log').addEventListener('click', async () => {
  await navigator.clipboard.writeText($('#log-output').textContent);
  toast('日志已复制');
});
$('#clear-view').addEventListener('click', () => {
  lastLog = '';
  $('#log-output').textContent = '显示已清空，日志文件仍然保留。';
});

setInterval(() => ($('#clock').textContent = new Date().toLocaleString('zh-CN')), 1000);
setInterval(refresh, 2000);
refresh();
