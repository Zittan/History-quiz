/* =========================================================
   ДВИЖОК ВИКТОРИНЫ

   Используется на всех страницах quiz-*.html.
   Читает данные из window.QUIZ_DATA, определённого в HTML
   до подключения этого скрипта.

   Формат window.QUIZ_DATA:
   {
     title: 'Название викторины',
     questions: [
       { type:'single', question:'...', options:['А','Б'], correct:0, explanation:'...' },
       { type:'tf',     question:'...', correct:true, explanation:'...' },
       { type:'text',   question:'...', keys:['ключ'], answer:'Полный ответ', explanation:'...' }
     ]
   }
   ========================================================= */

(function(){
  'use strict';

  const QUIZ = window.QUIZ_DATA;
  const app = document.getElementById('app');
  if (!QUIZ || !app) return;

  const LETTERS = ['А', 'Б', 'В', 'Г', 'Д', 'Е'];

  const state = {
    index: 0,
    answers: [],
    selected: null,
    checked: false
  };

  /* ---------- утилиты ---------- */

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => (
      { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
    ));
  }

  function norm(s){
    return String(s).toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]/g, '');
  }

  /* ---------- отрисовка вопроса ---------- */

  function renderQuizView(){
    if (state.index >= QUIZ.questions.length){
      renderResults();
      return;
    }

    const q = QUIZ.questions[state.index];
    const total = QUIZ.questions.length;
    const progress = Math.round(state.index / total * 100);

    app.innerHTML = `
      <div class="quiz-view">
        <div class="quiz-topbar">
          <a href="index.html" class="back-link">← Все викторины</a>
          <span class="quiz-crumb">${escapeHtml(QUIZ.title)}</span>
        </div>
        <div class="progress"><div class="progress-fill" style="width:${progress}%"></div></div>
        <div class="q-count">Вопрос ${state.index + 1} из ${total}</div>
        <div class="q-card">
          <h2 class="q-title">${escapeHtml(q.question)}</h2>
          <div id="qBody"></div>
          <div class="q-feedback" id="qFeedback"></div>
          <div class="q-footer">
            <button class="btn btn-primary" id="actionBtn" disabled>Ответить</button>
          </div>
        </div>
      </div>
    `;

    renderQuestionBody(q);
    document.getElementById('actionBtn').addEventListener('click', handleAction);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderQuestionBody(q){
    const body = document.getElementById('qBody');
    const btn = document.getElementById('actionBtn');
    state.selected = null;
    state.checked = false;
    btn.disabled = true;
    btn.textContent = 'Ответить';

    /* --- открытый ответ --- */
    if (q.type === 'text'){
      body.innerHTML = `<input type="text" class="text-input" id="textInput"
        placeholder="Введите ответ" autocomplete="off" spellcheck="false">`;
      const inp = document.getElementById('textInput');

      inp.addEventListener('input', () => {
        btn.disabled = inp.value.trim() === '';
      });
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !btn.disabled && !state.checked) handleAction();
      });
      inp.focus();
      return;
    }

    /* --- варианты (single / tf) --- */
    const options = q.type === 'tf'
      ? [{ label: 'Правда', value: 0 }, { label: 'Ложь', value: 1 }]
      : q.options.map((o, i) => ({ label: o, value: i }));

    body.innerHTML = `<div class="options">` + options.map(o => `
      <button type="button" class="option" data-value="${o.value}">
        <span class="option-letter">${LETTERS[o.value]}</span>
        <span class="option-text">${escapeHtml(o.label)}</span>
      </button>`).join('') + `</div>`;

    body.querySelectorAll('.option').forEach(el => {
      el.addEventListener('click', () => {
        if (state.checked) return;
        body.querySelectorAll('.option').forEach(b => b.classList.remove('selected'));
        el.classList.add('selected');
        state.selected = Number(el.dataset.value);
        btn.disabled = false;
      });
    });
  }

  /* ---------- проверка ответа ---------- */

  function handleAction(){
    const q = QUIZ.questions[state.index];
    const btn = document.getElementById('actionBtn');

    if (!state.checked){
      state.checked = true;
      btn.disabled = true;

      let correct = false;

      if (q.type === 'single'){
        correct = state.selected === q.correct;
      } else if (q.type === 'tf'){
        const userValue = state.selected === 0; // 0 = Правда
        correct = userValue === q.correct;
      } else {
        const inp = document.getElementById('textInput');
        const value = norm(inp.value);
        correct = q.keys.some(k => value.includes(norm(k)));
      }

      state.answers.push({ correct, q });
      showFeedback(correct, q);

      const isLast = state.index === QUIZ.questions.length - 1;
      btn.textContent = isLast ? 'Показать результат' : 'Далее →';
      btn.disabled = false;

    } else {
      state.index++;
      renderQuizView();
    }
  }

  function showFeedback(correct, q){
    const fb = document.getElementById('qFeedback');
    fb.className = 'q-feedback show ' + (correct ? 'ok' : 'bad');

    const correctText = answerText(q);
    const explanation = q.explanation
      ? `<div class="explanation">${escapeHtml(q.explanation)}</div>`
      : '';

    fb.innerHTML = correct
      ? `✔ Верно!${explanation}`
      : `✘ Неверно. Правильный ответ: <b>${escapeHtml(correctText)}</b>.${explanation}`;

    const opts = document.querySelectorAll('#qBody .option');
    opts.forEach(el => el.classList.add('locked'));

    if (q.type === 'single'){
      opts.forEach((el, i) => {
        if (i === q.correct) el.classList.add('correct');
        else if (i === state.selected) el.classList.add('wrong');
      });
    } else if (q.type === 'tf'){
      const correctIndex = q.correct ? 0 : 1;
      opts.forEach((el, i) => {
        if (i === correctIndex) el.classList.add('correct');
        else if (i === state.selected) el.classList.add('wrong');
      });
    } else {
      const inp = document.getElementById('textInput');
      if (inp){
        inp.classList.add(correct ? 'correct' : 'wrong');
        inp.disabled = true;
      }
    }
  }

  function answerText(q){
    if (q.type === 'single') return q.options[q.correct];
    if (q.type === 'tf') return q.correct ? 'Правда' : 'Ложь';
    return q.answer;
  }

  /* ---------- результаты ---------- */

  function renderResults(){
    const total = QUIZ.questions.length;
    const correctCount = state.answers.filter(a => a.correct).length;
    const percent = Math.round(correctCount / total * 100);

    let verdict;
    if (percent === 100)    verdict = 'Идеально! Вы настоящий знаток темы.';
    else if (percent >= 80) verdict = 'Отличный результат! Осталось совсем немного.';
    else if (percent >= 50) verdict = 'Хороший результат — есть куда расти.';
    else                    verdict = 'Стоит повторить материал и попробовать снова.';

    app.innerHTML = `
      <div class="quiz-view">
        <div class="quiz-topbar">
          <a href="index.html" class="back-link">← Все викторины</a>
          <span class="quiz-crumb">${escapeHtml(QUIZ.title)}</span>
        </div>

        <div class="results-card">
          <div class="score-ring" style="--p:${percent}">
            <div class="score-ring-inner">${percent}%</div>
          </div>
          <h2>${percent === 100 ? '🏆' : '📜'} Викторина завершена</h2>
          <p class="results-score">Правильных ответов: <b>${correctCount}</b> из <b>${total}</b></p>
          <p class="results-verdict">${verdict}</p>
          <div class="results-actions">
            <button class="btn btn-primary" id="retryBtn">Пройти заново</button>
            <a href="index.html" class="btn btn-ghost">К другим викторинам</a>
          </div>
        </div>

        <div class="review">
          <h3>Разбор ответов</h3>
          ${state.answers.map((a, i) => `
            <div class="review-item ${a.correct ? 'ok' : 'bad'}">
              <span class="review-mark">${a.correct ? '✔' : '✘'}</span>
              <div>
                <div class="review-q">${i + 1}. ${escapeHtml(a.q.question)}</div>
                ${a.correct ? '' : `<div class="review-a">Правильный ответ: <b>${escapeHtml(answerText(a.q))}</b></div>`}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.getElementById('retryBtn').addEventListener('click', () => {
      window.location.reload();
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- запуск ---------- */

  renderQuizView();
})();