document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('battle-list');
  const createBtn = document.getElementById('create-battle');

  createBtn.addEventListener('click', () => {
    window.location.href = 'create.html';
  });

  const renderBattles = (battles) => {
    if (!Array.isArray(battles)) return;

      battles.forEach((battle) => {
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

        const actions = document.createElement('div');
        actions.className = 'battle-actions';

        const view = document.createElement('button');
        view.className = 'submit-btn text-small';
        view.style.width = 'auto';
        view.textContent = 'View';
        view.addEventListener('click', () => {
          window.location.href = `../html/index.html?id=${battle.id}`;
        });

        const edit = document.createElement('button');
        edit.className = 'submit-btn text-small edit-btn';
        edit.style.width = 'auto';
        edit.textContent = 'Edit';
        edit.addEventListener('click', () => {
          window.location.href = `create.html?id=${battle.id}`;
        });

        actions.appendChild(view);
        actions.appendChild(edit);

        item.appendChild(info);
        item.appendChild(actions);
        list.appendChild(item);
      });
  };

  async function loadBattles() {
    if (!window.supabaseClient) {
      list.innerHTML = '<p class="text-small">No battles found.</p>';
      return;
    }

    const { data, error } = await window.supabaseClient
      .from('battles')
      .select('id, name, questions');

    if (error) {
      console.error('Error loading battles:', error);
      list.innerHTML = '<p class="text-small">No battles found.</p>';
      return;
    }

    renderBattles(data);
  }

  loadBattles();
});
