'use strict';
var gulp = require('gulp');
var shell = require('gulp-shell');
var githubRelease = require('gulp-github-release');
var runSequence = require('run-sequence');
var through = require('through2');

// settings
var owner = 'TasukuUno';
var repo = 'release-note-test';
var branch = 'master';
var file = './changelog.md';
var uploadAssets = './src/upload.txt';
var token = process.env.GITHUB_TOKEN;

// YYYYMMDD_HHmmss as tag name
var tag = (function(d) {
  return [
    d.getFullYear(),
    ('0' + (d.getMonth() + 1)).slice(-2),
    ('0' + d.getDate()).slice(-2),
    '_',
    ('0' + d.getHours()).slice(-2),
    ('0' + d.getMinutes()).slice(-2),
    ('0' + d.getSeconds()).slice(-2)
  ].join('');
})(new Date());

////////////////////////////////////////////////////////
//
//  main
//
////////////////////////////////////////////////////////
gulp.task('publish', function(done) {
  runSequence('changelog', 'release-note', done);
});

////////////////////////////////////////////////////////
//
//  generate changelog file
//
////////////////////////////////////////////////////////
gulp.task('changelog', function() {
  return gulp.src('')
    .pipe(shell([
      'node node_modules/github-changes/bin/index.js',
      '--owner ' + owner,
      '--repository ' + repo,
      '--branch ' + branch,
      '--token ' + token,
      '--tag-name ' + tag,
      '--file ' + file,
      '--only-pulls',
      '--use-commit-body'
    ].join(' ')));
});

////////////////////////////////////////////////////////
//
// read changelog file and publish github release
//
////////////////////////////////////////////////////////
gulp.task('release-note', function(done) {
  var notes = '';
  var parse = through.obj(function(file, enc, callback) {
    var text = file.contents.toString(enc);
    var matches = text.split(/\n\n/);
    if (matches[1]) {
      notes = matches[1].trim();
    }
    this.push(file);
    return callback();
  });

  return gulp.src(file)
    .pipe(parse)
    .on('end', function() {
      console.log('\n' + notes + '\n');

      gulp.src(uploadAssets)
        .pipe(githubRelease({
          token: token,           // or you can set an env var called GITHUB_TOKEN instead
          owner: owner,           // if missing, it will be extracted from manifest (the repository.url field)
          repo: repo,             // if missing, it will be extracted from manifest (the repository.url field)
          tag: tag,               // if missing, the version will be extracted from manifest and prepended by a 'v'
          name: 'release ' + tag, // if missing, it will be the same as the tag
          notes: notes,           // if missing it will be left undefined
          draft: false,           // if missing it's false
          prerelease: false       // if missing it's false
          //, manifest: require('./package.json') // package.json from which default values will be extracted if they're missing
        }))
        .on('error', function(e) {
          console.error(e.errors);
          throw new Error(e.message);
        });
    });
});
