# ParaViewVessels

Visualize and segment vessels out of a volume.

## Setup

Currently there are no prebuilt binaries, so you will need to build the
application.

### Prerequisites

- git
- nodejs
- npm (if not bundled with nodejs)
- python3
- a build of [ITKTubeTK](https://github.com/KitwareMedical/ITKTubeTK)
  - this build must be compiled with python3 enabled

### Configuring

Edit the file `Electron/Config.js`. Inside you will need to specify the
location of your ITKTubeTK build. You may also optionally specify a python
virtual environment, python executable, and other configs. Refer to the file
for more info.

### Building

After cloning the repo, run the following commands to prepare and build the app.

```
$ git submodule init
$ git submodule update
$ npm install
$ npm run build
```

## Running

To run the application:

```
$ npm run start
```
