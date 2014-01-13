(function(){
  /*global require:false, module:false*/
  /*jshint maxstatements:100*/
  'use strict';

  /**
   * Basic configuration
   */

  var KingPin = function(){
    var grunt = require('grunt');

    var readJSON = function(path){
      return JSON.parse(grunt.file.read(path).
        replace(/(\/\/.*)/gm, '').
        replace(/([\/][*](?:[^*]*|[*](?=[^\/]))*[*][\/])/g, ''));
    };

    this.packageJson = grunt.file.readJSON('package.json');

    var bowerRc = grunt.file.readJSON('.bowerrc');

    var templatedFiles = /[.](?:html|js|css|txt|json)$/;
    this.config = {
      types: {
        processExclude: '**/*.{png,gif,jpg,ico,zip,tar,gz,pdf,psd,ttf,woff,eot}',
        avoid: '{xxx*,*min.*}',
        javascript: '*.js',
        html: '*.{htm,html}',
        css: '*.{css,scss}',
        hbs: '*.{hbs,handlebars}',
        images: '*.{png,gif,jpg}',
        web: '*.{js,css,scss,htm,html,php,txt,json,htc,svg,png,gif,jpg,ico,eot,ttf,woff}'
      },
      dirs: this.packageJson.directories
    };

      // Configuration directories remapped
    this.config.dirs.dependencies = bowerRc.directory;


    var banner = '/*\n' +
       ' * -------------------------------------------------------\n' +
       ' * Project:  ' + this.packageJson.name + '\n' +
       ' * Version:  ' + this.packageJson.version + '\n' +
       ' * Homepage: ' + this.packageJson.homepage + '\n' +
       ' *\n' +
       ' * Author:   ' + this.packageJson.author.name + '\n' +
       ' * Contact:  ' + this.packageJson.author.email + '\n' +
       ' * Homepage: ' + this.packageJson.author.url + '\n' +
       ' *\n' +
       ' * Copyright (c) ' + grunt.template.today('dd-mm-yyyy') + ' ' + this.packageJson.author.name + ' ' +
       'under ' + this.packageJson.license + ' all rights reserved.\n' +
       ' * -------------------------------------------------------\n' +
       ' */\n' +
       '\n';

    var sourceMapRoot = '/jsboot.js';

    this.plugins = function(){
      grunt.template.addDelimiters('es6', '${', '}');

      grunt.config('imagemin', {
        options: {
          optimizationLevel: 7
        }
      });

      grunt.config('htmlmin', {
        options: {
          removeComments: true,
          removeCommentsFromCDATA: true,
          collapseWhitespace: true,
          collapseBooleanAttributes: true,
          removeAttributeQuotes: true,
          removeRedundantAttributes: true,
          removeEmptyAttributes: true,
          useShortDoctype: true
        }
      });

      grunt.config('sass', {
        options: {
          trace: true,
          unixNewlines: true,
          cacheLocation: this.config.dirs.tmp + '/sass',
          compass: true,
          sourcemap: true,
          banner: banner,
          loadPath: 'assets', // XXX doesn't work?
          /*
          style: 'nested'
          style: 'compact'*/
          style: 'compressed'
        }
      });

      grunt.config('uglify', {
        options: {
          compress: false,
          report: 'min',
          beautify: true,

          mangle: false,
          sourceMappingURL: function(dest){
            return dest.split('/').pop() + '.map';
          },
          sourceMapPrefix: 1,
          sourceMapRoot: sourceMapRoot,
          sourceMap: function(dest){
            return dest + '.map';
          }
        }
      });

      grunt.config('copy', {
        options: {
          processContentExclude: [this.config.types.processExclude, '.*/' + this.config.types.processExclude],
          processContent: function (content, srcpath) {
            return templatedFiles.test(srcpath) ?
                grunt.template.process(content, {delimiters: 'es6'}) :
                content;
          }
        }
      });

      grunt.config('clean', {
        options: { 'no-write': false }
      });

      /**
       * Hinters
       */
      var jshintRc = readJSON('.jshintrc');
      jshintRc.reporter = require('jshint-stylish');

      grunt.config('jshint', {
        options: jshintRc
      });

      grunt.config('csslint', {
        options: {
          csslintrc: '.csslintrc'
        }
      });

      grunt.config('concat', {
        options: {
          separator: '\n\n'
        }
      });

    };
  };

  module.exports = function(grunt) {
    require('matchdep').filterDev(['grunt-*', '!grunt-template-*']).forEach(grunt.loadNpmTasks);

    require('time-grunt')(grunt);

    var kingPin = new KingPin();

    grunt.initConfig({
      pkg: kingPin.packageJson
    });

    kingPin.plugins();

    /**
     * Clean task
     */
    grunt.config('clean', {
      all: [
        kingPin.config.dirs.tmp,
        kingPin.config.dirs.build,
        kingPin.config.dirs.dist
      ]
    });

    /**
     * Hinting
     */
    grunt.config('jshint.all', {
      src: [
        kingPin.config.dirs.src + '/**/' + kingPin.config.types.javascript,
        kingPin.config.dirs.tests + '/**/' + kingPin.config.types.javascript,
        kingPin.config.types.javascript,
        '!' + kingPin.config.dirs.src + '/**/' + kingPin.config.types.avoid,
        '!' + kingPin.config.types.avoid
      ]
    });


    /**
     * Actual dependencies to extract
     */

    // site.dependencies
    grunt.config('copy.source-dependencies', {
      files: [{
        expand: true,
        flatten: true,
        filter: 'isFile',
        cwd: kingPin.config.dirs.dependencies,
        src: [
          'jasmine/lib/jasmine-core/jasmine.js',
          'jasmine/lib/jasmine-core/jasmine-html.js',
          'jasmine-reporters/src/jasmine.*.js',
          'jquery/jquery.js',
          'bootstrap/dist/**/*',
          'jasmine-bootstrap/src/jasmine-bootstrap.js',
          'jasmine/lib/jasmine-core/jasmine.css',
          'jasmine-bootstrap/src/jasmine-bootstrap.css',
          '!**/' + kingPin.config.types.avoid
        ],
        dest: kingPin.config.dirs.build + '/source.dependencies',
        rename: function(dest, src){
          var ext = src.split('.').pop();
          if(['eot', 'svg', 'ttf', 'woff'].indexOf(ext) != -1)
            ext = 'fonts';
          return dest + '/' + ext + '/' + src.toLowerCase().replace('-', '.');
        }
      }]
    });

    grunt.config('concat.source-dependencies', {
      files: [{
        src: [
          kingPin.config.dirs.build + '/source.dependencies/css/bootstrap.css',
          kingPin.config.dirs.build + '/source.dependencies/css/bootstrap.*.css',
          kingPin.config.dirs.build + '/source.dependencies/css/jasmine.css',
          kingPin.config.dirs.build + '/source.dependencies/css/jasmine.*.css'
        ],
        dest: kingPin.config.dirs.build + '/source.dependencies/css/tooling.testing.css'
      }, {
        src: [
          kingPin.config.dirs.build + '/source.dependencies/css/bootstrap.css',
          kingPin.config.dirs.build + '/source.dependencies/css/bootstrap.*.css'
        ],
        dest: kingPin.config.dirs.build + '/source.dependencies/css/tooling.demo.css'
      }]
    });


    grunt.config('uglify.build-dependencies', {
      files: [{
        src: [
          kingPin.config.dirs.build + '/source.dependencies/js/jquery.js',
          kingPin.config.dirs.build + '/source.dependencies/js/bootstrap.js',
          kingPin.config.dirs.build + '/source.dependencies/js/jasmine.js',
          kingPin.config.dirs.build + '/source.dependencies/js/jasmine.*.js'
        ],
        dest: kingPin.config.dirs.build + '/compounds/js/tooling.testing.js'
      }, {
        src: [
          kingPin.config.dirs.build + '/source.dependencies/js/jquery.js',
          kingPin.config.dirs.build + '/source.dependencies/js/bootstrap.js'
        ],
        dest: kingPin.config.dirs.build + '/compounds/js/tooling.demo.js'
      }]
    });

    grunt.config('sass.build-dependencies', {
      files: [{
        src: kingPin.config.dirs.build + '/source.dependencies/css/tooling.testing.css',
        dest: kingPin.config.dirs.build + '/compounds/css/tooling.testing.css'
      }, {
        src: kingPin.config.dirs.build + '/source.dependencies/css/tooling.demo.css',
        dest: kingPin.config.dirs.build + '/compounds/css/tooling.demo.css'
      }]
    });

    grunt.config('copy.build-dependencies', {
      files: [{
        cwd: kingPin.config.dirs.build + '/source.dependencies',
        expand: true,
        src: [
          '**/' + kingPin.config.types.web,
          '!**/' + kingPin.config.types.javascript,
          '!**/' + kingPin.config.types.images,
          '!**/' + kingPin.config.types.html,
          '!**/' + kingPin.config.types.css
        ],
        dest: kingPin.config.dirs.build + '/compounds'
      }]
    });


    /**
     * Watchers
     */
    grunt.config('watch.copy-source-dependencies', {
      files: [
        kingPin.config.dirs.dependencies + '/**/' + kingPin.config.types.web,
      ],
      tasks: ['copy:source-dependencies', 'concat:source-dependencies']
    });

    grunt.config('watch.uglify-build-dependencies', {
      files: [
        kingPin.config.dirs.build + '/source.dependencies/js/*',
      ],
      tasks: ['uglify:build-dependencies']
    });

    grunt.config('watch.sass-build-dependencies', {
      files: [
        kingPin.config.dirs.build + '/source.dependencies/css/*',
      ],
      tasks: ['sass:build-dependencies']
    });

    grunt.config('watch.copy-build-dependencies', {
      files: [
        kingPin.config.dirs.build + '/source.dependencies/**/' + kingPin.config.types.web,
        '!' + kingPin.config.dirs.build + '/source.dependencies/**/' + kingPin.config.types.javascript,
        '!' + kingPin.config.dirs.build + '/source.dependencies/**/' + kingPin.config.types.css
      ],
      tasks: ['copy:build-dependencies']
    });

    /**
     * Task definitions
     */
    grunt.registerTask('source', [
      'copy:source-dependencies', 'concat:source-dependencies'
    ]);

    grunt.registerTask('build', [
      'uglify:build-dependencies', 'copy:build-dependencies', 'sass:build-dependencies'
    ]);

    grunt.registerTask('default', ['source', 'build']);

    grunt.registerTask('hint', ['jshint']);
  };
})();

