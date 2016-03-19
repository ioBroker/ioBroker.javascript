// To use this file in WebStorm, right click on the file name in the Project Panel (normally left) and select "Open Grunt Console"

/** @namespace __dirname */
/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";

function getAppName() {
    var parts = __dirname.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1].split('.')[0].toLowerCase();
}

module.exports = function (grunt) {

    var srcDir    = __dirname + '/';
    var pkg       = grunt.file.readJSON('package.json');
    var iopackage = grunt.file.readJSON('io-package.json');
    var version   = (pkg && pkg.version) ? pkg.version : iopackage.common.version;
    var appName   = getAppName();

    // Project configuration.
    grunt.initConfig({
        pkg: pkg,
        replace: {
            core: {
                options: {
                    patterns: [
                        {
                            match: /var version = *'[\.0-9]*';/g,
                            replacement: "var version = '" + version + "';"
                        },
                        {
                            match: /"version"\: *"[\.0-9]*",/g,
                            replacement: '"version": "' + version + '",'
                        }
                    ]
                },
                files: [
                    {
                        expand:  true,
                        flatten: true,
                        src:     [
                                srcDir + 'controller.js',
                                srcDir + 'package.json',
                                srcDir + 'io-package.json'
                        ],
                        dest:    srcDir
                    }
                ]
            },
            name: {
                options: {
                    patterns: [
                        {
                            match:       /iobroker/gi,
                            replacement: appName
                        }
                    ]
                },
                files: [
                    {
                        expand:  true,
                        flatten: true,
                        src:     [
                            srcDir + '*.*',
                            srcDir + '.travis.yml'
                        ],
                        dest:    srcDir
                    },
                    {
                        expand:  true,
                        flatten: true,
                        src:     [
                            srcDir + 'admin/*.*',
                            '!' + srcDir + 'admin/*.png'
                        ],
                        dest:    srcDir + 'admin'
                    },
                    {
                        expand:  true,
                        flatten: true,
                        src:     [
                            srcDir + 'lib/*.*'
                        ],
                        dest:    srcDir + 'lib'
                    },
                    {
                        expand:  true,
                        flatten: true,
                        src:     [
                            srcDir + 'example/*.*'
                        ],
                        dest:    srcDir + 'example'
                    },
                    {
                        expand:  true,
                        flatten: true,
                        src:     [
                            srcDir + 'www/*.*'
                        ],
                        dest:    srcDir + 'www'
                    }
                ]
            }
        },
        // Javascript code styler
        jscs:   require(__dirname + '/tasks/jscs.js'),
        // Lint
        jshint: require(__dirname + '/tasks/jshint.js'),
        http: {
            get_hjscs: {
                options: {
                    url: 'https://raw.githubusercontent.com/' + appName + '/' + appName + '.js-controller/master/tasks/jscs.js'
                },
                dest: 'tasks/jscs.js'
            },
            get_jshint: {
                options: {
                    url: 'https://raw.githubusercontent.com/' + appName + '/' + appName + '.js-controller/master/tasks/jshint.js'
                },
                dest: 'tasks/jshint.js'
            },
            get_gruntfile: {
                options: {
                    url: 'https://raw.githubusercontent.com/' + appName + '/' + appName + '.build/master/adapters/Gruntfile.js'
                },
                dest: 'Gruntfile.js'
            },
            get_utilsfile: {
                options: {
                    url: 'https://raw.githubusercontent.com/' + appName + '/' + appName + '.build/master/adapters/utils.js'
                },
                dest: 'lib/utils.js'
            },
            get_jscsRules: {
                options: {
                    url: 'https://raw.githubusercontent.com/' + appName + '/' + appName + '.js-controller/master/tasks/jscsRules.js'
                },
                dest: 'tasks/jscsRules.js'
            }
        }
    });

    grunt.registerTask('updateReadme', function () {
        var readme = grunt.file.read('README.md');
        var pos = readme.indexOf('## Changelog\n');
        if (pos != -1) {
            var readmeStart = readme.substring(0, pos + '## Changelog\n'.length);
            var readmeEnd   = readme.substring(pos + '## Changelog\n'.length);

            if (readme.indexOf(version) == -1) {
                var timestamp = new Date();
                var date = timestamp.getFullYear() + '-' +
                    ('0' + (timestamp.getMonth() + 1).toString(10)).slice(-2) + '-' +
                    ('0' + (timestamp.getDate()).toString(10)).slice(-2);

                var news = "";
                if (iopackage.common.whatsNew) {
                    for (var i = 0; i < iopackage.common.whatsNew.length; i++) {
                        if (typeof iopackage.common.whatsNew[i] == 'string') {
                            news += '* ' + iopackage.common.whatsNew[i] + '\n';
                        } else {
                            news += '* ' + iopackage.common.whatsNew[i].en + '\n';
                        }
                    }
                }

                grunt.file.write('README.md', readmeStart + '### ' + version + ' (' + date + ')\n' + (news ? news + '\n\n' : '\n') + readmeEnd);
            }
        }
    });

    grunt.loadNpmTasks('grunt-replace');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-jscs');
    grunt.loadNpmTasks('grunt-http');

    grunt.registerTask('default', [
        'http',
        'replace:core',
        'updateReadme',
        'jshint',
        'jscs'
    ]);

    grunt.registerTask('p', [
        'replace:core',
        'updateReadme'
    ]);
    grunt.registerTask('rename', [
        'replace:name'
    ]);
};