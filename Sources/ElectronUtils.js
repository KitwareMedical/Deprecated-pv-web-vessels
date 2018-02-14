import * as fs from 'fs';
import * as path from 'path';
import { ipcRenderer, remote } from 'electron';

import IpcConstants from '../Electron/IpcConstants';

/**
 * Backend
 */

export function getBackendHostAndPort() {
  return [remote.process.env.BACKEND_HOST, remote.process.env.BACKEND_PORT];
}

export function onServerStdout(callback) {
  ipcRenderer.on(IpcConstants.ServerStdoutChannel, callback);
  return {
    unsubscribe: () =>
      ipcRenderer.removeListener(IpcConstants.ServerStdoutChannel, callback),
  };
}

export function onServerStderr(callback) {
  ipcRenderer.on(IpcConstants.ServerStderrChannel, callback);
  return {
    unsubscribe: () =>
      ipcRenderer.removeListener(IpcConstants.ServerStderrChannel, callback),
  };
}

export function openSaveDialog() {
  return new Promise((resolve, reject) => {
    remote.dialog.showSaveDialog(
      { filters: [{ name: 'TRE', extensions: ['tre'] }] },
      resolve
    );
  });
}

export function getCommandLineArgs() {
  // ignore the first two args, which are "electron" and "."
  return remote.process.argv.slice(2);
}

// Need to disable transpilation for this to work.
// Electron supports class keywords, so don't want to
// transpile.
class CustomFile extends File {
  constructor(bits, name, options = {}) {
    super(bits, name, options);
    this.realpath = options.path || '';
  }

  // Override actual path with realpath
  get path() {
    return this.realpath;
  }
}

export function openAsFile(file) {
  return new CustomFile([fs.readFileSync(file).buffer], path.basename(file), {
    path: path.resolve(file),
  });
}

export default {
  getBackendHostAndPort,
  getCommandLineArgs,
  openAsFile,
};
