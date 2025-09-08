document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('battle-list');
  const createBtn = document.getElementById('create-battle');

  createBtn.addEventListener('click', () => {
    window.location.href = 'create.html';
  });

  fetch('../data/battles.json')
    .then(res => res.json())
    .then(battles => {
      if (!Array.isArray(battles)) return;

      battles.forEach(battle => {
        // Guard against malformed battle data which previously caused the page
        // to fail rendering any battles.
        const questionCount = Array.isArray(battle.questions)
          ? battle.questions.length
          : 0;

        const item = document.createElement('div');
        item.className = 'battle-card';

        const info = document.createElement('div');
        info.className = 'battle-info';

        const name = document.createElement('h2');
        name.className = 'battle-name';
        name.textContent = battle.name;
        info.appendChild(name);

        const count = document.createElement('p');
        count.className = 'battle-count';
        count.textContent = `${questionCount} Questions`;
        info.appendChild(count);

        const edit = document.createElement('button');
        edit.className = 'submit-btn text-small';
        edit.style.width = 'auto';
        edit.textContent = 'Edit';
        edit.addEventListener('click', () => {
          window.location.href = `create.html?id=${battle.id}`;
        });

        item.appendChild(info);
        item.appendChild(edit);
        list.appendChild(item);
      });
    })
    .catch(() => {
      // If the request fails, avoid leaving the homepage blank.
      list.innerHTML = '<p class="text-small">No battles found.</p>';
    });
});
