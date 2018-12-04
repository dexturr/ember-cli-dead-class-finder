import Ember from 'ember';
import { run, schedule, later } from '@ember/runloop';
import { findAll, getContext, settled } from '@ember/test-helpers';

window.__class_coverage__ = {}; /* eslint-disable-line camelcase */

function getTestName() {
  const { module: { name }, testName } = window.QUnit.config.current;
  return `${name}: ${testName}`;
}

const scrapeClasses = () => schedule('afterRender', async function() {
  // Wait until the state has settled (same as all ember test helpers do)
  // before looking into any of the classes
  await settled();
  const context = getContext();
  const testName = getTestName();
  // If the test context is not setup we cannot access the DOM
  if (context && context.owner) {
    if (!window.__class_coverage__[testName]) {
      window.__class_coverage__[testName] = [];
    }
    const elements = findAll('*');
    elements.forEach(
      (e) =>
        Array
          .from(e.classList)
          .forEach((className) => {
            if (!window.__class_coverage__[testName].includes(`.${className}`)) {
              window.__class_coverage__[testName].push(`.${className}`);
            }
          })
    );
  }
  const { testing } = Ember;
  // testing is set to false when each test is over
  if (testing) {
    later(() => scrapeClasses());
  }
});

export default function registerCssClasses(hooks) {
  hooks.beforeEach(function() {
    // Wrap in run for testing purposes
    run(() =>
      // Wrap in later to move to next tick
      later(
        () => scrapeClasses()
      )
    );
  });
}