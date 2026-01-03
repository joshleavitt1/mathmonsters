const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const INDEX_PATH = path.join(PROJECT_ROOT, 'js', 'index.js');
const INDEX_SOURCE = fs.readFileSync(INDEX_PATH, 'utf8');

const extractFunctionSource = (source, identifier) => {
  const declaration = `const ${identifier} = () => {`;
  const start = source.indexOf(declaration);
  assert.notStrictEqual(start, -1, `Could not find ${identifier} declaration`);

  const bodyStart = source.indexOf('{', start);
  assert.notStrictEqual(bodyStart, -1, `Could not locate ${identifier} body start`);

  let depth = 0;
  let end = -1;
  for (let i = bodyStart; i < source.length; i += 1) {
    const character = source[i];
    if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  assert.ok(end > -1, `Could not locate ${identifier} closing brace`);
  const trailingSemicolonIndex = source.indexOf(';', end);
  const sliceEnd = trailingSemicolonIndex === -1 ? end + 1 : trailingSemicolonIndex + 1;
  return source.slice(start, sliceEnd);
};

const createStyle = () => ({
  properties: {},
  width: '',
  setProperty(name, value) {
    this.properties[name] = String(value);
  },
});

const createContainer = () => ({
  hidden: true,
  attributes: { 'aria-hidden': 'true' },
  removeAttribute(name) {
    delete this.attributes[name];
  },
});

const createProgressElement = () => ({
  attributes: {},
  style: createStyle(),
  setAttribute(name, value) {
    this.attributes[name] = String(value);
  },
  removeAttribute(name) {
    delete this.attributes[name];
  },
});

test('home experience progress uses preview totals when provided', () => {
  const functionSource = extractFunctionSource(INDEX_SOURCE, 'updateHomeExperienceProgress');

  const homeExperienceContainer = createContainer();
  const homeExperienceProgress = createProgressElement();
  const homeExperienceProgressFill = createProgressElement();
  const homeExperienceCount = { textContent: '' };

  const previewData = {
    progressExperienceEarned: 7,
    progressExperienceTotal: 25,
  };

  const sandbox = {
    console,
    Math,
    Number,
    previewData,
    homeExperienceContainer,
    homeExperienceProgress,
    homeExperienceProgressFill,
    homeExperienceCount,
  };

  vm.runInNewContext(
    `${functionSource}\nupdateHomeExperienceProgress();`,
    sandbox,
    { filename: 'updateHomeExperienceProgress.js' }
  );

  assert.strictEqual(homeExperienceContainer.hidden, false, 'container should be shown');
  assert.ok(
    !('aria-hidden' in homeExperienceContainer.attributes),
    'container should clear aria-hidden'
  );
  assert.strictEqual(
    homeExperienceCount.textContent,
    '7/25',
    'label should reflect provided earned and total'
  );
  assert.strictEqual(
    homeExperienceProgress.attributes['aria-valuemax'],
    '25',
    'aria max should match provided total'
  );
  assert.strictEqual(
    homeExperienceProgress.attributes['aria-valuenow'],
    '7',
    'aria now should match provided earned'
  );
  assert.strictEqual(
    homeExperienceProgress.attributes['aria-valuetext'],
    '7 of 25 experience',
    'aria label should describe earned and total'
  );
  assert.strictEqual(
    homeExperienceProgress.style.properties['--progress-value'],
    `${7 / 25}`,
    'progress value should use provided total range'
  );
  assert.strictEqual(
    homeExperienceProgressFill.style.width,
    `${(7 / 25) * 100}%`,
    'fill width should match the computed ratio'
  );
});
