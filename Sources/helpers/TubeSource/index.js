import macro from 'vtk.js/Sources/macro';
import vtkDataArray from 'vtk.js/Sources/Common/Core/DataArray';
import vtkPoints from 'vtk.js/Sources/Common/Core/Points';
import vtkPolyData from 'vtk.js/Sources/Common/DataModel/PolyData';
import vtkAppendPolyData from 'vtk.js/Sources/Filters/General/AppendPolyData';
import vtkTubeFilter from 'vtk.js/Sources/Filters/General/TubeFilter';
import { VaryRadius } from 'vtk.js/Sources/Filters/General/TubeFilter/Constants';
import { VtkDataTypes } from 'vtk.js/Sources/Common/Core/DataArray/Constants';

// const { vtkErrorMacro } = macro;

function createTubePolyData(tube) {
  const { points, radii } = tube;

  const pd = vtkPolyData.newInstance();
  const pts = vtkPoints.newInstance({
    dataType: VtkDataTypes.FLOAT,
    numberOfComponents: 3,
  });
  pts.setNumberOfPoints(points.length);

  const pointData = new Float32Array(3 * points.length);
  const lines = new Uint32Array(points.length + 1);

  lines[0] = points.length;
  for (let i = 0; i < points.length; ++i) {
    pointData[3 * i + 0] = points[i][0];
    pointData[3 * i + 1] = points[i][1];
    pointData[3 * i + 2] = points[i][2];
    lines[i + 1] = i;
  }

  const scalarsData = new Float32Array(radii);
  const scalars = vtkDataArray.newInstance({
    name: 'Radius',
    values: scalarsData,
  });

  pts.setData(pointData);
  pd.setPoints(pts);
  pd.getLines().setData(lines);
  pd.getPointData().setScalars(scalars);

  const filter = vtkTubeFilter.newInstance({
    capping: true,
    radius: 1, // scaling factor
    varyRadius: VaryRadius.VARY_RADIUS_BY_ABSOLUTE_SCALAR,
    numberOfSides: 50,
  });

  filter.setInputArrayToProcess(0, 'Radius', 'PointData', 'Scalars');
  filter.setInputData(pd);

  return filter.getOutputData();
}

// Used as the dummy 0th input into vtkAppendPolyData
const dummyPolyData = vtkPolyData.newInstance();
dummyPolyData.setPoints(
  vtkPoints.newInstance({
    dataType: VtkDataTypes.FLOAT,
    numberOfComponents: 3,
  })
);

// ----------------------------------------------------------------------------
// vtkTubeSource methods
// ----------------------------------------------------------------------------

function vtkTubeSource(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkTubeSource');

  model.tubes = model.tubes.slice();
  // keyed by tube.uid
  model.polyData = {};

  publicAPI.setTubes = (tubes) => {
    if (tubes === model.tubes) {
      return;
    }

    model.tubes = tubes;

    for (let i = 0; i < tubes.length; ++i) {
      const tube = tubes[i];
      if (!(tube.uid in model.polyData)) {
        model.polyData[tube.uid] = createTubePolyData(tube);
      }
    }

    publicAPI.modified();
  };

  publicAPI.requestData = (inData, outData) => {
    const appendPolyDataFilter = vtkAppendPolyData.newInstance();
    // Set first input data to an empty polydata as a default.
    appendPolyDataFilter.setInputData(dummyPolyData, 0);

    const uids = Object.keys(model.polyData);
    for (let i = 0; i < uids.length; ++i) {
      if (model.tubes[i].visible) {
        const pd = model.polyData[model.tubes[i].uid];
        appendPolyDataFilter.addInputData(pd);
      }
    }

    const outpd = appendPolyDataFilter.getOutputData();
    model.output[0] = outpd;
  };
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  tubes: [],
};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  macro.obj(publicAPI, model);
  macro.algo(publicAPI, model, 0, 1);
  macro.get(publicAPI, model, ['tubes']);

  // Object specific methods
  vtkTubeSource(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(extend, 'vtkTubeSource');

// ----------------------------------------------------------------------------

export default { newInstance, extend };
