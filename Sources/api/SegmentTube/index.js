export default (func, pubSub) => ({
  loadFile: func('app.load_file'),
  unloadImage: func('app.unload_image'),
  segmentTube: func('app.segment'),
  saveTubes: func('app.save_tubes'),
});
