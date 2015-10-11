import gulp from 'gulp';
import gutil from 'gulp-util';
import sourcemaps from 'gulp-sourcemaps';
import del from 'del';
import sass from 'gulp-ruby-sass';
import postcss from 'gulp-postcss';
import autoprefixer from 'autoprefixer';
import rename from 'gulp-rename';
import browserSync from 'browser-sync';
import uglify from 'gulp-uglify';
import babel from 'gulp-babel';
import babelify from 'babelify';
import browserify from 'browserify';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';


const SRC = './src';
const EXAMPLE_SRC = './example';
const DIST = './dist';
const EXAMPLE_DIST = './';
const SCSS = '/scss';
const JS   = '/js';

const PROD_CONFIG = {
  sass: { style: 'compressed' },
  browserify: {},
};

const DEV_CONFIG = {
  sass: { style: 'expanded', sourcemap: true },
  browserify: { debug: true },
};


function styles(source, dist, isProd, isServer) {
  const config = isProd ? PROD_CONFIG : DEV_CONFIG;

  return sass(source, config.sass)
    .pipe(postcss([
      autoprefixer({
        browsers: ['last 2 version'],
      })
    ]))
    .pipe(isProd ? rename({ suffix: '.min' }) : gutil.noop())
    .pipe(!isProd && isServer ? sourcemaps.init({ loadMaps: true }) : gutil.noop())
    .pipe(!isProd && isServer ? sourcemaps.write('./') : gutil.noop())
    .pipe(gulp.dest(dist))
    .pipe(isServer ? browserSync.stream() : gutil.noop());
}

function scripts(isProd) {
  return gulp.src(SRC + JS + '/index.js')
    .pipe(babel())
    .pipe(isProd ? uglify() : gutil.noop())
    .pipe(isProd ? rename({ suffix: '.min' }) : gutil.noop())
    .pipe(gulp.dest(DIST));
}


gulp.task('clean', (callback) => {
  return del([DIST, EXAMPLE_DIST], callback);
});


gulp.task('styles', () => {
  const source = `${SRC}${SCSS}/react-buttons.scss`;

  styles(source, DIST, false, false);
  return styles(source, DIST, true, false);
});

gulp.task('scripts', () => {
  scripts(false);
  return scripts(true);
});

gulp.task('dist', ['clean', 'styles', 'scripts']);

gulp.task('default', ['dist']);




function bundle(isProd) {
  const config = isProd ? PROD_CONFIG : DEV_CONFIG;
  const bundle = browserify(config.browserify);
  bundle.add(EXAMPLE_SRC + JS + '/index.js');
  bundle.transform(babelify);

  return bundle.bundle()
    .on('error', function(err) {
      gutil.log(gutil.colors.red('ERROR'), err.message);
      this.emit('end');
    })
    .pipe(source('bundle.js'))
    .pipe(buffer())
    .pipe(isProd ? gutil.noop() : sourcemaps.init({ loadMaps: true }))
    .pipe(isProd ? gutil.noop() : sourcemaps.write('./'))
    .pipe(isProd ? uglify() : gutil.noop())
    .on('error', function(err) {
      gutil.log(gutil.colors.red('ERROR'), err.message);
      this.emit('end');
    })
    .pipe(isProd ? rename({ suffix: '.min' }) : gutil.noop())
    .pipe(gulp.dest(EXAMPLE_DIST));
}

gulp.task('statics:example', () => {
  gulp.src(`${EXAMPLE_SRC}/index.html`).pipe(gulp.dest(EXAMPLE_DIST));
});

gulp.task('styles:example', () => {
  return styles(`${EXAMPLE_SRC}${SCSS}/main.scss`, EXAMPLE_DIST, true, true);
});
gulp.task('styles-watch:example', ['styles:example']);


gulp.task('scripts:example', () => {
  return bundle(true);
});
gulp.task('scripts-watch:example', ['scripts:example'], browserSync.reload);

gulp.task('dist:example', ['styles:example', 'scripts:example', 'statics:example']);
gulp.task('serve', ['dist:example'], () => {
  browserSync({
    server: {
      baseDir: EXAMPLE_DIST
    }
  });

  gulp.watch(['./src/**/*.js', './example/**/*.js'], ['scripts-watch:example']);
  gulp.watch(['./src/**/*.scss', './example/**/*.scss'], ['styles-watch:example']);
});
