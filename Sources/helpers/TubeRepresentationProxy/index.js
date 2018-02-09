import macro from 'vtk.js/Sources/macro';
import vtkActor from 'vtk.js/Sources/Rendering/Core/Actor';
import vtkTubeFilter from 'vtk.js/Sources/Filters/General/TubeFilter';
import vtkMapper from 'vtk.js/Sources/Rendering/Core/Mapper';
import { VaryRadius } from 'vtk.js/Sources/Filters/General/TubeFilter/Constants';

import vtkAbstractRepresentationProxy from 'vtk.js/Sources/Proxy/Core/AbstractRepresentationProxy';

// ----------------------------------------------------------------------------
// vtkTubeRepresentationProxy methods
// ----------------------------------------------------------------------------

function vtkTubeRepresentationProxy(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkTubeRepresentationProxy');

  model.filter = vtkTubeFilter.newInstance({
    capping: true,
    radius: 1, // scaling factor
    varyRadius: VaryRadius.VARY_RADIUS_BY_ABSOLUTE_SCALAR,
    numberOfSides: 50,
  });
  model.mapper = vtkMapper.newInstance();
  model.actor = vtkActor.newInstance();

  model.sourceDependencies.push(model.filter);

  model.filter.setInputArrayToProcess(0, 'Radius', 'PointData', 'Scalars');
  model.mapper.setInputConnection(model.filter.getOutputPort());
  model.actor.setMapper(model.mapper);

  // Add actors
  model.actors.push(model.actor);

  // API overrides ------------------------------------------------------------

  publicAPI.setColorBy = () => {};
  publicAPI.getColorBy = () => [];
  publicAPI.listDataArrays = () => [];
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Object methods
  vtkAbstractRepresentationProxy.extend(publicAPI, model);

  // Object specific methods
  vtkTubeRepresentationProxy(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(
  extend,
  'vtkTubeRepresentationProxy'
);

// ----------------------------------------------------------------------------

export default { newInstance, extend };
