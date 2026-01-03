# Regression Scenarios

## String Current Level Normalization

This scenario verifies that stored progress using a string current level still loads the correct level assets.

1. Run the site locally and open the Math Monsters battle page in a browser.
2. Open the developer console and seed battle progress with a string value:
   ```js
   localStorage.setItem('mathmonstersProgress', JSON.stringify({
     currentLevel: '2',
   }));
   ```
3. Refresh the page. Confirm the hero and monster sprites correspond to level 2 (e.g., the level selector highlights "2" and the level 2 art assets are displayed).
4. Clear the seeded value after verification:
   ```js
   localStorage.removeItem('mathmonstersProgress');
   ```

This protects against regressions where string-based current level progress prevented level-specific sprites from loading.

## Level 1 Landing Routing With Experience

This scenario ensures Level 1 players only see the intro when they have zero experience.

1. Clear stored progress: `localStorage.clear();` then refresh. Confirm the Level 1 intro/egg experience appears.
2. Seed a Level 1 profile with experience and reload:
   ```js
   localStorage.setItem('mathmonstersPlayerProfile', JSON.stringify({
     progress: { experienceTotal: 1, currentLevel: 1 },
   }));
   ```
   Refresh the homepage and confirm the standard landing (actions and battle button visible) is shown instead of the intro.
3. Clear the seeded profile after verification:
   ```js
   localStorage.removeItem('mathmonstersPlayerProfile');
   localStorage.removeItem('mathmonstersProgress');
   ```
