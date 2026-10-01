(() => {
  const historyKey = 'doubt-solver-history';
  const list = document.querySelector('#history-list');
  if (!list) return;

  const search = document.querySelector('#history-search');
  const clearAll = document.querySelector('#clear-history');
  const emptyState = document.querySelector('#history-empty');
  const noResults = document.querySelector('#history-no-results');
  const count = document.querySelector('#history-count');

  const getHistory = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(historyKey) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  };

  const saveHistory = (items) => {
    try {
      localStorage.setItem(historyKey, JSON.stringify(items));
      return true;
    } catch {
      count.textContent = 'This browser could not update saved history.';
      return false;
    }
  };

  const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  };

  const createCard = (item) => {
    const card = document.createElement('article');
    card.className = 'history-card';
    const main = document.createElement('div');
    main.className = 'history-card-main';
    const meta = document.createElement('div');
    meta.className = 'history-card-meta';
    const subject = document.createElement('span');
    subject.className = 'history-subject';
    subject.textContent = item.subject || 'General';
    const date = document.createElement('time');
    date.dateTime = item.date || '';
    date.textContent = formatDate(item.date);
    meta.append(subject, date);
    const title = document.createElement('h2');
    title.textContent = item.question || 'Untitled question';
    const preview = document.createElement('p');
    preview.className = 'history-card-preview';
    preview.textContent = item.answer || 'No saved answer.';
    main.append(meta, title, preview);

    const actions = document.createElement('div');
    actions.className = 'history-card-actions';
    const open = document.createElement('a');
    open.className = 'button button-outline';
    open.href = `/ask.html?history=${encodeURIComponent(item.id)}`;
    open.textContent = 'Open solution';
    const remove = document.createElement('button');
    remove.className = 'delete-history';
    remove.type = 'button';
    remove.setAttribute('aria-label', `Delete question: ${item.question || 'Untitled question'}`);
    remove.title = 'Delete this question';
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      saveHistory(getHistory().filter((entry) => entry.id !== item.id));
      render();
    });
    actions.append(open, remove);
    card.append(main, actions);
    return card;
  };

  const render = () => {
    const allItems = getHistory();
    const query = search.value.trim().toLocaleLowerCase();
    const filtered = allItems.filter((item) => `${item.question || ''} ${item.subject || ''} ${item.answer || ''}`.toLocaleLowerCase().includes(query));
    list.replaceChildren(...filtered.map(createCard));
    count.textContent = allItems.length ? `${filtered.length} of ${allItems.length} ${allItems.length === 1 ? 'question' : 'questions'}` : '';
    emptyState.hidden = allItems.length !== 0;
    noResults.hidden = allItems.length === 0 || filtered.length !== 0;
    clearAll.disabled = allItems.length === 0;
  };

  search.addEventListener('input', render);
  clearAll.addEventListener('click', () => {
    if (!getHistory().length || !window.confirm('Clear all saved questions from this browser?')) return;
    saveHistory([]);
    render();
  });
  window.addEventListener('storage', (event) => {
    if (event.key === historyKey) render();
  });
  render();
})();