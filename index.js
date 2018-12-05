/* eslint-env node */
'use strict';
const fs = require('fs');
const path = require('path');
const Filter = require('broccoli-filter');
const listSelectors = require('list-selectors');
const bodyParser = require('body-parser').json({ limit: '50mb' });
const difference = require('lodash.difference');
const some = require('lodash.some');
const WRITE_COVERAGE = '/write-class-coverage';

let list = [];

class ListSelectors extends Filter {

  constructor(inputTree, options) {
    options = options || {};
    super(inputTree);
    this.inputTree = inputTree;
    this.filesToProcess = options.filesToProcess || ['vendor.css'];
  }

  processFile(srcDir, destDir, relativePath) {
    this._srcDir = srcDir;
    let file = fs.readFileSync(`${srcDir}/${relativePath}`, 'UTF-8');
    let self = this;
    let pathParts = relativePath.split('/');
    let fileName = pathParts[pathParts.length - 1];
    const writeFile = () => Promise.resolve().then(function() {
      let outputPath = self.getDestFilePath(relativePath);
      fs.writeFileSync(`${destDir}/${outputPath}`, file);
    });
    if (this.filesToProcess.includes(fileName)) {
      return new Promise((resolve) => listSelectors(
        [`${srcDir}/${relativePath}`],
        { include: ['classes'] },
        (myList) => resolve(myList)
      )).then((myList) => {
        list.concat(myList.classes);
        return writeFile();
      });
    } else {
      return writeFile();
    }
  }
}

function logError(err, req, res, next) {
  console.error(err.stack); /* eslint-disable-line no-console */
  next(err);
}

module.exports = {
  name: 'ember-cli-dead-class-finder',

  getDeadClassFinderOptions() {
    let { app } = this;
    return (app && app.options && app.options['ember-cli-dead-class-finder']) || {};
  },

  isDevelopingAddon() {
    return true;
  },

  postprocessTree(type, tree) {
    if (type === 'css') {
      return new ListSelectors(tree, this.getDeadClassFinderOptions());
    }

    return tree;
  },

  contentFor(type) {
    this._super(...arguments);
    if (type === 'test-body-footer') {
      return `<script>
      var REQUEST_ASYNC = !/PhantomJS/.test(window.navigator.userAgent);
      function sendCoverage(callback) {
        var request = new XMLHttpRequest();
        request.open('POST', '/write-class-coverage', REQUEST_ASYNC);
        request.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
        request.send(JSON.stringify(window.__class_coverage__));
        if (REQUEST_ASYNC) {
          request.responseType = 'json';
          request.onreadystatechange = function() {
            if (request.readyState === 4) {
              handleCoverageResponse(this, callback);
            }
          };
        } else {
          // The request is already done at this point, since it is synchronous
          if (request.status === 200) {
            handleCoverageResponse(request, callback);
          }
        }
      }
      if (typeof Testem !== "undefined" && Testem.afterTests) {
        Testem.afterTests(function(config, data, callback) {
          sendCoverage(callback);
        });
      } else if (typeof QUnit !== "undefined") {
        QUnit.done(function() {
          sendCoverage();
        });
      } else if (typeof Mocha !== "undefined" && typeof after !== "undefined") {
        console.warn('Only QUnit is currently supported. Sorry.');
      } else {
        console.warn('No testing framework found for ember-cli-code-coverage to integrate with.');
      }

      function handleCoverageResponse(xhr, callback) {
        // console.log(arguments);
        if (callback) {
          callback();
        }
      }
       </script>`;
    }
  },

  _processClasses(classesFound) {
    const options = this.getDeadClassFinderOptions();
    const flattenClasses = [];
    for (let key in classesFound) {
      classesFound[key].forEach((className) => {
        if (!flattenClasses.includes(className)) {
          flattenClasses.push(className);
        }
      });
    }
    const regExpressions = options
      .ignore.map(
        (stringExpression) => new RegExp(stringExpression)
      );
    const filterClasses = (className) =>
      !some(
        regExpressions
          .map(
            (expression) => expression.test(className)
          ),
        Boolean);
    const classesWithNoStyles = difference(flattenClasses, list);
    const stylesThatDoNotAppear = difference(list, flattenClasses);
    const filteredClassesWithNoStyles = classesWithNoStyles.filter(filterClasses);
    const filteredStylesThatDoNotAppear = stylesThatDoNotAppear.filter(filterClasses);
    const basePath = path.join(this.project.root, 'class-coverage');
    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath);
    }
    fs.writeFileSync(
      path.join(basePath, 'report.json'),
      JSON.stringify({
        classesWithNoStyles: filteredClassesWithNoStyles,
        unusedStyledClasses: filteredStylesThatDoNotAppear,
        // testMap: classesFound,
      }, null, '\t'),
      {
        encoding: 'UTF-8',
      }
    );
  },

  _isEnabled() {
    let value = process.env.FIND_DEAD_CLASSES && process.env.FIND_DEAD_CLASSES.toLowerCase();
    return ['true', true].includes(value);
  },

  serverMiddleware({ app }) {
    if (!this._isEnabled()) {
      return;
    }
    this._registerCustomMiddleware(app);
  },

  testemMiddleware(app) {
    if (process.argv.includes('--server') || process.argv.includes('-s')) {
      return this.serverMiddleware({ app });
    }
    if (!this._isEnabled()) {
      return;
    }
    this._registerCustomMiddleware(app);
  },

  _registerCustomMiddleware(app) {
    app.post(WRITE_COVERAGE,
      bodyParser,
      (req, res) => {
        try {
          const classesFound = req.body;
          this._processClasses(classesFound);
          res.send('Success');
        } catch(e) {
          res.send(`Failed: ${e}`);
        }
      },
      logError);
  },
};
