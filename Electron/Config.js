module.exports = {

// NOTE: For all paths specified, if on Windows please use backslashes.

/**
 * This is your python executable. If the entry is not a full path, then
 * the PATH environment variable is searched.
 */
PYTHON: 'python',

// If you have a custom python install on on Windows, specify the path like so:
//PYTHON: 'c:\Python\bin\python.exe',

/**
 * (OPTIONAL) The path to the python virtualenv root that has the
 * server dependencies.
 */

// If not using a virtualenv, set to the empty string.
// Do not use ~ on a non-Windows OS.
VIRTUALENV: '',

// if using a virtualenv, set to the root dir of the virtualenv
//VIRTUALENV: '/path/to/virtualenv/',

/**
 * The path to the ITKTubeTK build root.
 * Do not use ~ on a non-Windows OS.
 */

ITK_TUBETK_ROOT: '/path/to/ITKTubeTK/build',

/**
 * (OPTIONAL) Host and port for the server to bind to. If port is 0, then a
 * random port will be chosen. You shouldn't have to change this value,
 * unless you are debugging the network connection between the backend and
 * the frontend.
 */

HOST: '127.0.0.1',
PORT: 0,

};
