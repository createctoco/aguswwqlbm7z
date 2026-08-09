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

function setCloudflare(config) {
  const state = $('#cloudflare-state');
  const detail = $('#cloudflare-detail');
  if (config.status === 'verified') {
    state.textContent = '已验证';
    state.style.color = '#0b6848';
    detail.textContent = `API 验证于 ${formatDate(config.verifiedAt)}`;
  } else if (config.status === 'failed') {
    state.textContent = '授权失效';
    state.style.color = '#a33b32';
    detail.textContent = '请重新登录 Wrangler';
  } else if (config.credentials) {
    state.textContent = '待验证';
    state.style.color = '#805b1f';
    detail.textContent = '凭据存在，点击检查授权';
  } else {
    state.textContent = '未登录';
    state.style.color = '#a33b32';
    detail.textContent = '需要 Wrangler 登录';
  }
}

function renderLocales(catalog) {
  $('#locale-rows').replaceChildren(
    ...catalog.locales.map((locale) => {
      const row = document.createElement('tr');
      const values = [
        `${locale.label} (${locale.locale})`,
        String(locale.products),
        locale.pageCopyReady ? `${locale.pageCopyEntries} 条 · 就绪` : `${locale.pageCopyEntries} 条 · 待更新`,
        locale.backlog || locale.skipped ? `${locale.backlog} 待重试 · ${locale.skipped} 本次失败` : '0',
        formatDate(locale.generatedAt),
      ];
      for (const [index, value] of values.entries()) {
        const cell = document.createElement('td');
        cell.textContent = value;
        if (index === 2) cell.className = locale.pageCopyReady ? 'status-ready' : 'status-warning';
        if (index === 3 && (locale.backlog || locale.skipped)) cell.className = 'status-failed';
        row.append(cell);
      }
      return row;
    })
  );
  $('#translation-summary').textContent =
    `产品语言 ${catalog.readyProductLocales}/13 · 页面语言 ${catalog.readyPageLocales}/13 · ` +
    `失败积压 ${catalog.backlog}`;
}

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  setTimeout(() => element.classList.remove('show'), 2800);
}

function render(data) {
  token = data.csrfToken;
  $('#product-count').textContent = data.catalog.batchProducts;
  $('#total-product-count').textContent = data.catalog.totalProducts;
  $('#locale-count').textContent = `${data.catalog.readyProductLocales}/13`;
  $('#page-locale-count').textContent = `${data.catalog.readyPageLocales}/13`;
  $('#page-copy-count').textContent = `${data.catalog.pageCopyEntries} 条受控文案`;
  $('#catalog-time').textContent = data.catalog.generatedAt
    ? `生成于 ${formatDate(data.catalog.generatedAt)}`
    : '尚未生成';
  setConfig('#mecrt-state', data.config.mecrt);
  setConfig('#deepseek-state', data.config.deepseek);
  setCloudflare(data.config.cloudflare);
  renderLocales(data.catalog);
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
    retryTranslations: '失败翻译重试与补发',
    deploy: '网站发布',
    checkCloudflare: 'Cloudflare授权检查',
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
