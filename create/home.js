document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('battle-list');
  const createBtn = document.getElementById('create-battle');

  createBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  fetch('/battles')
    .then(res => res.json())
    .then(battles => {
      battles.forEach(battle => {
        const item = document.createElement('div');
        item.className = 'subcard';

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';

        const name = document.createElement('h2');
        name.className = 'text-large';
        name.textContent = battle.name;
        header.appendChild(name);

        const buttons = document.createElement('div');
        buttons.style.display = 'flex';
        buttons.style.gap = '10px';

        const launch = document.createElement('button');
        launch.className = 'submit-btn text-small';
        launch.style.width = 'auto';
        launch.textContent = 'Launch';
        buttons.appendChild(launch);

        const edit = document.createElement('button');
        edit.className = 'submit-btn text-small';
        edit.style.width = 'auto';
        edit.textContent = 'Edit';
        edit.addEventListener('click', () => {
          window.location.href = `index.html?id=${battle.id}`;
        });
        buttons.appendChild(edit);

        header.appendChild(buttons);
        item.appendChild(header);

        const count = document.createElement('p');
        count.className = 'text-small';
        count.textContent = `${battle.questions.length} Questions`;
        item.appendChild(count);

        list.appendChild(item);
      });
    });
});
