const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const url = require('url');
const getPort = require('get-port');
const { spawn, exec } = require('child_process');

const appConfig = require('./Config');
const IpcConstants = require('./IpcConstants');

const DEBUG = process.env.DEBUG || false;

let mainWindow;
let server;

function startServer() {
  return getPort()
    .then((port) => {
      return appConfig.PORT || port;
    })
    .then((port) => {
      // this is accessed by the renderer process
      process.env.BACKEND_HOST = appConfig.HOST;
      process.env.BACKEND_PORT = port;

      const env = Object.assign({}, process.env);

      // setup TubeTK paths
      env.PYTHONPATH = [
        path.join(
          appConfig.ITK_TUBETK_ROOT,
          'ITK-build',
          'Wrapping',
          'Generators',
          'Python'
        ),
        path.join(appConfig.ITK_TUBETK_ROOT, 'ITK-build', 'lib'),
        path.join(appConfig.ITK_TUBETK_ROOT, 'TubeTK-build', 'lib'),
      ].join(path.delimiter);

      if (appConfig.VIRTUALENV) {
        env.PYTHONHOME = appConfig.VIRTUALENV;
        // use virtualenv python
        env.PATH = path.join(appConfig.VIRTUALENV, 'bin')
          + path.delimiter
          + env.PATH;
      }

      // https://stackoverflow.com/questions/107705/disable-output-buffering
      env.PYTHONUNBUFFERED = 1;

      server = spawn(
        appConfig.PYTHON,
        [
          path.join('Server', 'main.py'),
          '--host', process.env.BACKEND_HOST,
          '--port', process.env.BACKEND_PORT,
          '--timeout', 2*365*24*60*60, // please don't run this for 2 years...
        ],
        {
          cwd: path.join(__dirname, '..'),
          env,
          windowsHide: true,
        },
      );

      server.stdout.on('data', (data) => {
        if (mainWindow) {
          mainWindow.webContents.send(
            IpcConstants.ServerStdoutChannel, String(data)
          );
        }
        process.stdout.write(String(data));
      });

      server.stderr.on('data', (data) => {
        if (mainWindow) {
          mainWindow.webContents.send(
            IpcConstants.ServerStderrChannel, String(data)
          );
        }
        process.stderr.write(String(data));
      });

      server.on('close', (data) => {
        server = null;
      });
    });
}

function makeWindow() {
  mainWindow = new BrowserWindow({
    fullscreen: false,
  });

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, '..', 'Distribution', 'index.html'),
    protocol: 'file:',
    slashes: true,
  }));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (DEBUG) {
    mainWindow.openDevTools();
  }
}

// Quit when all windows are closed.
function exit() {
  if (server) {
    server.kill('SIGINT');
    server = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
  process.exit(0);
}

app.on('ready', () => {
  startServer().then(() => {
    makeWindow();
  }).catch((error) => {
    console.error(error);
    exit();
  });
});

app.on('window-all-closed', exit);

app.on('activate', () => {
  if (mainWindow === null) {
    makeWindow();
  }
});
