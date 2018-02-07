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

export default {
  getBackendHostAndPort,
};
