import macro from 'vtk.js/Sources/macro';
import ITKHelper from 'vtk.js/Sources/Common/DataModel/ITKHelper';

import readImageArrayBuffer from 'itk/readImageArrayBuffer';

const { convertItkToVtkImage } = ITKHelper;

// ----------------------------------------------------------------------------
// vtkITKImageReader methods
// ----------------------------------------------------------------------------

function vtkITKImageReader(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkITKImageReader');

  // Returns a promise to signal when image is ready
  publicAPI.parseAsArrayBuffer = (arrayBuffer) => {
    if (!arrayBuffer || arrayBuffer === model.rawDataBuffer) {
      return Promise.resolve();
    }

    model.rawDataBuffer = arrayBuffer;

    return readImageArrayBuffer(arrayBuffer, model.fileName).then(
      (itkImage) => {
        const imageData = convertItkToVtkImage(itkImage);
        model.output[0] = imageData;

        // TODO should this be here or outside the promise?
        publicAPI.modified();
      }
    );
  };

  publicAPI.requestData = (inData, outData) => {
    publicAPI.parseAsArrayBuffer(model.rawDataBuffer, model.fileName);
  };
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  fileName: '',
};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Build VTK API
  macro.obj(publicAPI, model);
  macro.algo(publicAPI, model, 0, 1);
  macro.setGet(publicAPI, model, ['fileName']);

  // vtkITKImageReader methods
  vtkITKImageReader(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(extend, 'vtkXMLImageDataReader');

// ----------------------------------------------------------------------------

export default { newInstance, extend };
