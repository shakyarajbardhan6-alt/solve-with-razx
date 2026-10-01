(() => {
  const form = document.querySelector('#solver-form');
  if (!form) return;

  const questionInput = document.querySelector('#question');
  const subjectInput = document.querySelector('#subject');
  const characterCount = document.querySelector('#question-count');
  const submitButton = document.querySelector('#solve-button');
  const errorMessage = document.querySelector('#solver-error');
  const answerPanel = document.querySelector('#answer-panel');
  const answerContext = document.querySelector('#answer-context');
  const answerContent = document.querySelector('#answer-content');
  const copyButton = document.querySelector('#copy-answer');
  const clearButton = document.querySelector('#clear-answer');
  const historyKey = 'doubt-solver-history';

  const readHistory = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(historyKey) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  };

  const appendInline = (parent, value) => {
    const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let position = 0;
    for (const match of value.matchAll(pattern)) {
      const start = match.index;
      if (start > position) parent.append(document.createTextNode(value.slice(position, start)));
      const token = match[0];
      const content = token.startsWith('`') ? token.slice(1, -1) : token.startsWith('**') ? token.slice(2, -2) : token.slice(1, -1);
      const element = document.createElement(token.startsWith('`') ? 'code' : token.startsWith('**') ? 'strong' : 'em');
      element.textContent = content;
      parent.append(element);
      position = start + token.length;
    }
    if (position < value.length) parent.append(document.createTextNode(value.slice(position)));
  };

  const renderAnswer = (answer) => {
    answerContent.replaceChildren();
    const lines = String(answer).replace(/\r\n?/g, '\n').split('\n');
    let paragraph = [];
    let list = null;
    let codeLines = null;

    const flushParagraph = () => {
      if (!paragraph.length) return;
      const element = document.createElement('p');
      paragraph.forEach((line, index) => {
        if (index) element.append(document.createElement('br'));
        appendInline(element, line);
      });
      answerContent.append(element);
      paragraph = [];
    };
    const flushList = () => {
      if (!list) return;
      answerContent.append(list);
      list = null;
    };
    const flushCode = () => {
      if (!codeLines) return;
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.textContent = codeLines.join('\n');
      pre.append(code);
      answerContent.append(pre);
      codeLines = null;
    };

    for (const line of lines) {
      if (line.trim().startsWith('```')) {
        if (codeLines) flushCode();
        else {
          flushParagraph();
          flushList();
          codeLines = [];
        }
        continue;
      }
      if (codeLines) {
        codeLines.push(line);
        continue;
      }
      if (!line.trim()) {
        flushParagraph();
        flushList();
        continue;
      }
      const heading = line.match(/^#{1,3}\s+(.+)$/);
      if (heading) {
        flushParagraph();
        flushList();
        const element = document.createElement(line.startsWith('###') ? 'h4' : 'h3');
        appendInline(element, heading[1]);
        answerContent.append(element);
        continue;
      }
      const item = line.match(/^\s*(?:[-*]|\d+[.)])\s+(.+)$/);
      if (item) {
        flushParagraph();
        const isOrdered = /^\s*\d+[.)]/.test(line);
        const tag = isOrdered ? 'ol' : 'ul';
        if (!list || list.tagName.toLowerCase() !== tag) {
          flushList();
          list = document.createElement(tag);
        }
        const listItem = document.createElement('li');
        appendInline(listItem, item[1]);
        list.append(listItem);
        continue;
      }
      flushList();
      paragraph.push(line);
    }
    flushParagraph();
    flushList();
    flushCode();
  };

  const showAnswer = (question, subject, answer, date) => {
    answerContext.replaceChildren();
    const subjectLabel = document.createElement('strong');
    subjectLabel.textContent = subject;
    const questionLabel = document.createElement('span');
    questionLabel.textContent = ` · ${question}`;
    answerContext.append(subjectLabel, questionLabel);
    renderAnswer(answer);
    answerPanel.hidden = false;
    answerPanel.dataset.answer = answer;
    answerPanel.dataset.question = question;
    answerPanel.dataset.subject = subject;
    answerPanel.dataset.date = date || new Date().toISOString();
  };

  const saveAnswer = (entry) => {
    try {
      const previous = readHistory().filter((item) => item.id !== entry.id);
      localStorage.setItem(historyKey, JSON.stringify([entry, ...previous].slice(0, 100)));
    } catch {
      errorMessage.textContent = 'The answer is ready, but this browser could not save it to history.';
      errorMessage.hidden = false;
    }
  };

  const setLoading = (loading) => {
    submitButton.disabled = loading;
    submitButton.classList.toggle('is-loading', loading);
    submitButton.setAttribute('aria-busy', String(loading));
    submitButton.querySelector('.button-label').textContent = loading ? 'Working through it…' : 'Solve my doubt';
  };

  questionInput.addEventListener('input', () => {
    characterCount.textContent = `${questionInput.value.length} / 3000`;
  });

  document.querySelectorAll('.example-question').forEach((button) => {
    button.addEventListener('click', () => {
      questionInput.value = button.querySelector('span:nth-child(2)').textContent;
      subjectInput.value = button.dataset.subject;
      characterCount.textContent = `${questionInput.value.length} / 3000`;
      questionInput.focus();
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorMessage.hidden = true;
    if (!form.reportValidity()) return;

    const question = questionInput.value.trim();
    const subject = subjectInput.value;
    if (!question || question.length > 3000) {
      errorMessage.textContent = 'Enter a question of 1 to 3000 characters.';
      errorMessage.hidden = false;
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ question, subject })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success || typeof payload.answer !== 'string' || !payload.answer.trim()) {
        throw new Error(payload.error || 'The solver could not complete that request. Please try again.');
      }

      const entry = {
        id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        question,
        subject: payload.subject,
        answer: payload.answer,
        date: new Date().toISOString()
      };
      showAnswer(entry.question, entry.subject, entry.answer, entry.date);
      saveAnswer(entry);
      answerPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      errorMessage.textContent = error instanceof TypeError
        ? 'Could not reach the solver. Check your connection and try again.'
        : error.message;
      errorMessage.hidden = false;
    } finally {
      setLoading(false);
    }
  });

  copyButton.addEventListener('click', async () => {
    const originalText = 'Copy answer';
    try {
      await navigator.clipboard.writeText(answerPanel.dataset.answer || answerContent.innerText);
      copyButton.textContent = 'Copied';
      window.setTimeout(() => { copyButton.textContent = originalText; }, 1500);
    } catch {
      errorMessage.textContent = 'Clipboard access was blocked. Select and copy the answer manually.';
      errorMessage.hidden = false;
    }
  });

  clearButton.addEventListener('click', () => {
    form.reset();
    characterCount.textContent = '0 / 3000';
    answerPanel.hidden = true;
    answerPanel.removeAttribute('data-answer');
    errorMessage.hidden = true;
    questionInput.focus();
  });

  const params = new URLSearchParams(window.location.search);
  const requestedSubject = params.get('subject');
  if (requestedSubject && Array.from(subjectInput.options).some((option) => option.value === requestedSubject)) {
    subjectInput.value = requestedSubject;
  }
  const historyId = params.get('history');
  if (historyId) {
    const saved = readHistory().find((item) => item.id === historyId);
    if (saved && typeof saved.answer === 'string') {
      questionInput.value = saved.question || '';
      subjectInput.value = Array.from(subjectInput.options).some((option) => option.value === saved.subject) ? saved.subject : 'General';
      characterCount.textContent = `${questionInput.value.length} / 3000`;
      showAnswer(saved.question || '', saved.subject || 'General', saved.answer, saved.date);
    }
  }
})();