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
