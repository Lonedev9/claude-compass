'use strict';

const build = require('@microsoft/sp-build-web');

build.addSuppression(`Warning - [sass] The local CSS class 'ms-Grid' is not camelCase and will not be type-safe.`);
// src/styles/breakpoints.scss is an intentional shared partial (mixins/variables only,
// imported by every *.module.scss) - it is never itself loaded as a CSS module.
build.addSuppression(/Warning - \[sass\] .*breakpoints\.scss: filename should end with module\.sass or module\.scss/);

build.initialize(require('gulp'));
