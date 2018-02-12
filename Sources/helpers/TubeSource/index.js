import macro from 'vtk.js/Sources/macro';
import vtkDataArray from 'vtk.js/Sources/Common/Core/DataArray';
import vtkPoints from 'vtk.js/Sources/Common/Core/Points';
import vtkPolyData from 'vtk.js/Sources/Common/DataModel/PolyData';
import { VtkDataTypes } from 'vtk.js/Sources/Common/Core/DataArray/Constants';

const { vtkErrorMacro } = macro;

function makePolyData(publicAPI, model) {
  const visibleTubes = model.tubes.filter((tube) => tube.visible);

  const totalPointLength = visibleTubes.reduce(
    (length, tube) => length + tube.points.length,
    0
  );

  const pd = vtkPolyData.newInstance();
  const points = vtkPoints.newInstance({
    dataType: VtkDataTypes.FLOAT,
    numberOfComponents: 3,
  });
  points.setNumberOfPoints(totalPointLength);

  const pointData = new Float32Array(3 * totalPointLength);
  const lines = new Uint32Array(totalPointLength + visibleTubes.length);

  for (let i = 0, pi = 0, li = 0; i < visibleTubes.length; ++i) {
    lines[li++] = visibleTubes[i].points.length;
    for (let j = 0; j < visibleTubes[i].points.length; ++j, ++pi) {
      pointData[3 * pi + 0] = visibleTubes[i].points[j][0];
      pointData[3 * pi + 1] = visibleTubes[i].points[j][1];
      pointData[3 * pi + 2] = visibleTubes[i].points[j][2];
      lines[li++] = pi;
    }
  }

  const scalarsData = new Float32Array(
    visibleTubes.reduce((combined, tube) => tube.radii.concat(combined), [])
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

  model.tubes = model.tubes.slice();

  publicAPI.addTube = (tubeParam) => {
    const tube = Object.assign(
      {
        points: [],
        radii: [],
        visible: true,
      },
      tubeParam
    );

    if (tube.points.length !== tube.radii.length) {
      vtkErrorMacro('Added tube has mismatched points/radii lengths');
      return null;
    }
    model.tubes.push(tube);

    publicAPI.modified();
    return model.tubes.length - 1;
  };

  publicAPI.getTubeVisibility = (tubeUid) => {
    for (let i = 0; i < model.tubes.length; ++i) {
      if (model.tubes[i].uid === tubeUid) {
        return model.tubes[i].visible;
      }
    }
    return false;
  };

  publicAPI.setTubeVisibility = (tubeUid, visible) => {
    for (let i = 0; i < model.tubes.length; ++i) {
      if (
        model.tubes[i].uid === tubeUid &&
        model.tubes[i].visible !== visible
      ) {
        model.tubes[i].visible = visible;
        publicAPI.modified();
        break;
      }
    }
  };

  publicAPI.requestData = (inData, outData) => {
    model.output[0] = makePolyData(publicAPI, model);
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
