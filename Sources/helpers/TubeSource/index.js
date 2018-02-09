import macro from 'vtk.js/Sources/macro';
import vtkDataArray from 'vtk.js/Sources/Common/Core/DataArray';
import vtkPoints from 'vtk.js/Sources/Common/Core/Points';
import vtkPolyData from 'vtk.js/Sources/Common/DataModel/PolyData';
import { VtkDataTypes } from 'vtk.js/Sources/Common/Core/DataArray/Constants';

function makePolyData(publicAPI, model) {
  const totalLength = model.points.reduce(
    (length, points) => length + points.length,
    0
  );

  const pd = vtkPolyData.newInstance();
  const points = vtkPoints.newInstance({
    dataType: VtkDataTypes.FLOAT,
    numberOfComponents: 3,
  });
  points.setNumberOfPoints(totalLength);

  const pointData = new Float32Array(3 * totalLength);
  const lines = new Uint32Array(totalLength + 1);

  for (let i = 0, pi = 0, li = 0; i < model.points.length; ++i) {
    lines[li++] = model.points[i].length;
    for (let j = 0; j < model.points[i].length; ++j, ++pi) {
      pointData[3 * pi + 0] = model.points[i][j][0];
      pointData[3 * pi + 1] = model.points[i][j][1];
      pointData[3 * pi + 2] = model.points[i][j][2];
      lines[li++] = pi;
    }
  }

  const scalarsData = new Float32Array(
    model.radii.reduce((combined, radii) => radii.concat(combined), [])
  );
  const scalars = vtkDataArray.newInstance({
    name: 'Radius',
    values: scalarsData,
  });

  points.setData(pointData);
  pd.setPoints(points);
  pd.getLines().setData(lines);
  pd.getPointData().setScalars(scalars);

  return pd;
}

// ----------------------------------------------------------------------------
// vtkTubeSource methods
// ----------------------------------------------------------------------------

function vtkTubeSource(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkTubeSource');

  model.points = model.points.slice();
  model.radii = model.radii.slice();

  publicAPI.addTube = (points, radii) => {
    model.points.push(points);
    model.radii.push(radii);

    publicAPI.modified();
    return model.points.length - 1;
  };

  publicAPI.requestData = (inData, outData) => {
    model.output[0] = makePolyData(publicAPI, model);
  };
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  points: [],
  radii: [],
};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  macro.obj(publicAPI, model);
  macro.algo(publicAPI, model, 0, 1);

  // Object specific methods
  vtkTubeSource(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(extend, 'vtkTubeSource');

// ----------------------------------------------------------------------------

export default { newInstance, extend };
