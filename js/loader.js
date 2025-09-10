(async function() {
  try {
    const [varsRes, questionRes, charRes] = await Promise.all([
      fetch('../data/variables.json'),
      fetch('../data/questions.json'),
      fetch('../data/characters.json')
    ]);
    const varsData = await varsRes.json();
    const questionData = await questionRes.json();
    const charactersData = await charRes.json();
    if (!varsData.missions) varsData.missions = {};
    if (!varsData.missions.Walkthrough) varsData.missions.Walkthrough = {};
    varsData.missions.Walkthrough.questions = questionData || [];
    varsData.characters = charactersData || {};
    window.preloadedData = varsData;
    document.dispatchEvent(new Event('data-loaded'));
  } catch (e) {
    console.error('Failed to load data', e);
    window.preloadedData = {};
    document.dispatchEvent(new Event('data-loaded'));
  }
})();
