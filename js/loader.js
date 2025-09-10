(async function() {
  try {
    const [varsRes, questionsRes] = await Promise.all([
      fetch('../data/variables.json'),
      fetch('../data/questions.json')
    ]);
    const varsData = await varsRes.json();
    const questionsData = await questionsRes.json();
    if (!varsData.missions) varsData.missions = {};
    if (!varsData.missions.Walkthrough) varsData.missions.Walkthrough = {};
    varsData.missions.Walkthrough.questions = questionsData.questions || [];
    window.preloadedData = varsData;
    document.dispatchEvent(new Event('data-loaded'));
  } catch (e) {
    console.error('Failed to load data', e);
    window.preloadedData = {};
    document.dispatchEvent(new Event('data-loaded'));
  }
})();
