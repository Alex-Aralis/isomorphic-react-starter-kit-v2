import gulp from 'gulp';
import babel from 'gulp-babel';
import gulpWebpack from 'gulp-webpack';
import browserSync from 'browser-sync';
import path from 'path';
import changed from 'gulp-changed';
import del from 'del';
import webpackDevConfig from './webpack.config.dev.js';
import webpackProdConfig from './webpack.config.prod.js';
import nodemon from 'gulp-nodemon';
import nodemonConfig from './nodemon';
import webpack from 'webpack';
import webpackMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import gutil from 'gulp-util';
import eslint from 'gulp-eslint';
import plumber from 'gulp-plumber';
import { spawn, spawnSync } from 'child_process';

// browserSync = browserSyncImport.create();

// utility functions
const projPath = (...postfix) => path.join(__dirname, ...postfix);
const buildPath = (...postfix) => projPath('build', ...postfix);
const libPath = (...postfix) => buildPath('lib', 'node_modules', ...postfix);
const files = prefix => path.join(prefix, '**', '*');


//////////////////////////////////////////////////////
// path config
//////////////////////////////////////////////////////

const paths =
	{
		src: {
			src: projPath('src'),
			dest: {
				babel: libPath(),
				hmr: buildPath('src', 'node_modules'),
			},
		},
		assets: {
			src: projPath('assets'),
			dest: buildPath('assets'),
		},
		env: {
			src: projPath('.env*'),
			dest: buildPath(),
		},
		package: {
			src: projPath('package.json'),
			dest: buildPath(),
		},
		procfile: {
			src: projPath('Procfile'),
			dest: buildPath(),
		},
		server: {
			dir: libPath('server'),
			index: libPath('server', 'index.js'),
			dev: libPath('server', 'devServer.js'),
		},
		client: {
			dir: libPath('client'),
			index: libPath('client', 'index.js'),
		},
		app: buildPath('app.js'),
	}
;

nodemonConfig.watch = [paths.server.dir];
var nodemonStream;
var nodemonState = 'down';

//////////////////////////////////////////////////////
// composite tasks
//////////////////////////////////////////////////////

const browserSyncWatch =
	gulp.parallel(
		watchSrc,
		watchAssets,
		watchDotenv,
		watchHMR,
		watchNodemon,
	)
;

const browserSyncBuild =
	gulp.parallel(
		buildLib,
		buildAssets,
		buildDotenv,
		buildHMR,
	)
;

export const build =
	gulp.series(
		clean,
		gulp.parallel(
			gulp.series(
				buildLib,
				buildApp,
			),
			buildAssets,
			buildDotenv,
			buildPackage,
			buildProcfile,
		)
	)
;

export const prod =
	gulp.series(
		build,
		server
	)
;
export const watch =
	gulp.parallel(
		browserSyncWatch,
		watchLib,
	)
;

//////////////////////////////////////////////////////
// pure tasks
//////////////////////////////////////////////////////

export function server(done) {
	// { stdio: [0,1,2] }
	spawnSync('node', [paths.server.index], { stdio: [0,1,2] });

	done();
}

function devServer(done) {
	  nodemonConfig.script = paths.server.dev;
	  nodemonConfig.stdout = false;

		nodemonStream = nodemon(nodemonConfig);

	  return nodemonStream
			.on('start', () => {
				nodemonState = 'up';
			})
			.on('restart', () => {
				nodemonState = 'up';
			})
			.on('crash', () => {
				nodemonState = 'down';
			})
			.on('exit', () => {
				nodemonState = 'down';
			})
		  .on('stdout', data => {
		    var str = data.toString().trim();

		    str.split(/\r\n|\r|\n/g).forEach(line => {
		      gutil.log(`[srv]: ${line}`);
		      if(line === '* LISTENING *') browserSync.reload();
		    });
		  })
		  .on('stderr', data => {
		    var str = data.toString().trim();

		    str.split(/\r\n|\r|\n/g).forEach(line => {
		      gutil.log(`[srv stderr]: ${line}`);
		      if(line === '* LISTENING *') browserSync.reload();
		    });
		  })
			.on('start', done);
}


function startBrowserSyncProxy(done) {
	const compiler = webpack(webpackDevConfig);

	const WPMW = webpackMiddleware(
		compiler,
		{
			publicPath: '/',
			stats: false,
			progress: true,
		}
	);

	const HMRMW = webpackHotMiddleware(compiler);

	browserSync.init({
		proxy: {
			target: 'localhost:3030',
			middleware: [HMRMW, WPMW],
		},
		open: false,
		reloadOnRestart: false,
		reloadDelay: 0,
		ws: true,
		// files: ['lib/**/*'],
	},
	done
	);
}


// watches
function watchSrc(done) {
	gulp.watch(files(paths.src.src), buildLib);
	done();
}

function watchAssets(done) {
	gulp.watch(files(paths.assets.src), buildAssets);
}

// unused in favor of webpackMiddleware with browser-sync
function watchLib(done) {
  webpackDevConfig.watch = true;

  gulp.watch(files(paths.src.src), () => {
    return gulp.src(paths.client.index)
      .pipe(gulpWebpack(webpackDevConfig))
      .pipe(gulp.dest(buildPath()));
	  });

	done();
}

function watchDotenv(done) {
  gulp.watch(paths.env.src, buildDotenv);
	done();
}

function watchHMR(done) {
	gulp.watch(files(paths.src.src), buildHMR);
	done();
}

// this watch will cause nodemon to start again after an error in the
// react code caused it to exit the restart loop.
function watchNodemon(done) {
	gulp.watch(files(paths.src.dest.babel), setServerUp);

	done();
}

///////////// builds

export function setServerUp(done) {
	if(nodemonState === 'down'){
		nodemonStream.emit('restart');
	}

	done();
}

function buildApp() {
  webpackProdConfig.watch = false;

  return gulp.src(paths.client.index)
    .pipe(gulpWebpack(webpackProdConfig))
    .pipe(gulp.dest(buildPath()));
}

function buildLib() {
  return gulp.src(files(paths.src.src) + '.js')
    .pipe(plumber((err) => {

      gutil.log('[babel] ' + gutil.colors.red('Babel failed to compile.'));
      gutil.log(`[babel] ${gutil.colors.red(err.message)}`);

      err.codeFrame.split(/\r\n|\r|\n/g).forEach(line => {
        gutil.log(`[babel]: ${line}`);
      });
    }))
    .pipe(changed(libPath()))
    // .pipe(eslint())
    // .pipe(eslint.format())
    // .pipe(eslint.failAfterError())
    .pipe(babel())
    .pipe(gulp.dest(libPath()));
}

function buildHMR() {
	return gulp.src(files(paths.src.src))
		.pipe(changed(paths.src.dest.hmr))
		.pipe(gulp.dest(paths.src.dest.hmr));
}

function buildAssets() {
	return gulp.src(files(paths.assets.src))
		.pipe(changed(paths.assets.dest))
		.pipe(gulp.dest(paths.assets.dest));
}

function buildDotenv() {
  return gulp.src(paths.env.src)
    .pipe(gulp.dest(paths.env.dest));
}

function buildPackage() {
  return gulp.src(paths.package.src)
    .pipe(gulp.dest(paths.package.dest));
}

function buildProcfile() {
  return gulp.src(paths.procfile.src)
    .pipe(gulp.dest(paths.procfile.dest));
}

// clean
export function clean() {
  return del(buildPath());
}


// lint [not used]
function lint() {
  return gulp.src([paths.srcFiles])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
}

//////////////////////////////////////////////////////
// default task
//////////////////////////////////////////////////////

function printDevMessage(done) {
	gutil.log(gutil.colors.red(
		'DEV SERVER RUNNING ON >>> http://localhost:3000 <<<'
	));

	done();
}

// start dev server
export default
	gulp.series(
		clean,
		browserSyncBuild,
		gulp.parallel(
			browserSyncWatch,
			devServer,
			startBrowserSyncProxy,
		),
		printDevMessage,
	)
;
