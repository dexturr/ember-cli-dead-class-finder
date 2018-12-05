ember-cli-dead-class-finder
==============================================================================

This addon finds classes that do not appear in your tests and warns you that they should be addressed in some way. It generates a report `./class-coverage/report.json` which will look something like:

```json
{
  "classesWithNoStyles": [ ".class-1", ".class-2" ],
  "unusedStyledClasses": [  ".class-3", ".class-4"]
}
```

This shows you the `classesWithNoStyles` (i.e. classes that appeared in your tests but do not appear in your .css files) and the `unusedStyledClasses` (i.e. the classes that appear in your .css files but are never rendered to the screen during your tests). Obviously this addon is only as good as your test suite, but can be used to improve your tests.


Installation
------------------------------------------------------------------------------

```
ember install ember-cli-dead-class-finder
```

You now need to register the CSS classes that appear during your tests. In order to do this you will need to call the `registerCssClasses` method before your acceptance and integration tests:

```js
import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';
import registerCssClasses from 'ember-cli-dead-css-finder/test-support';

module('Acceptance | Acceptance test', function(hooks) {
  setupApplicationTest(hooks);
  registerCssClasses(hooks);

  test('A test', function() {
  });
});
```

## Codemod

This is long and boring so there is a [codemod here](https://github.com/dexturr/dead-class-finder-codemod) which you can use to do this for you.

Changing every single acceptance & integration test file is really annoying in these situations [using this pattern for both acceptance and integration tests can help avoid this in the future](https://github.com/dexturr/acceptance-test-blueprint), or you can just run the codemod. Your choice.

Usage
------------------------------------------------------------------------------

Once you have added the `registerCssClasses` as above the coverage will only be generated when the `FIND_DEAD_CLASSES` enrvironment variable is set to true. The running either `FIND_DEAD_CLASSES=true ember s` or `FIND_DEAD_CLASSES=true ember test` will generate the coverage report in `./class-coverage/reort.json`.

Ideally you should aim for this report to be empty, either by removing classes (in css/hbs files) or by adding tests to ensure that all your classes are rendered to the screen (and extra points for visual regression testing these). 

Ideally you should not have any classes that are not styled however it's not always practical to test all cases, for example when including third party libraries. You can configure `ember-cli-dead-class-finder` in the following ways:

```js
// ember-cli-build.js
const app = new EmberApp(defaults, {
  'ember-cli-dead-class-finder': {
  // You can specify the files you wish to process here to ignore any files you do not care about
    filesToProcess: ['some-file.css'], 
  // RegEx patterns of classes to ignore
    ignore: [
      '^\\.flatpickr.*',
      '^\\.foo$',
      '^\\.bar$',
      '^\\.baz$',
    ],
  },
}
```

## Create a passthrough when intercepting all ajax requests in tests

To work, this addon has to post coverage results back to a middleware at `/write-class-coverage`.

If you are using [`ember-cli-mirage`](http://www.ember-cli-mirage.com) you should add the following:

```
// in mirage/config.js

  this.passthrough('/write-class-coverage');
  this.namespace = 'api';  // It's important that the passthrough for coverage is before the namespace, otherwise it will be prefixed.
```

If you are using [`ember-cli-pretender`](https://github.com/rwjblue/ember-cli-pretender) you should add the following:

```
// where ever you set up the Pretender Server

  var server = new Pretender(function () {
    this.post('/write-class-coverage', this.passthrough);
  });
```

## Inspiration

This addon was inspired by [`ember-cli-code-coverage`](https://github.com/kategengler/ember-cli-code-coverage).


Contributing
------------------------------------------------------------------------------

### Installation

* `git clone <repository-url>`
* `cd ember-cli-dead-class-finder`
* `npm install`

### Linting

* `npm run lint:js`
* `npm run lint:js -- --fix`

### Running tests

* `ember test` – Runs the test suite on the current Ember version
* `ember test --server` – Runs the test suite in "watch mode"
* `ember try:each` – Runs the test suite against multiple Ember versions

### Running the dummy application

* `ember serve`
* Visit the dummy application at [http://localhost:4200](http://localhost:4200).

For more information on using ember-cli, visit [https://ember-cli.com/](https://ember-cli.com/).

License
------------------------------------------------------------------------------

This project is licensed under the [MIT License](LICENSE.md).
