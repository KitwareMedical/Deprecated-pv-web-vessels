import macro from 'vtk.js/Sources/macro';
import vtkImageData from 'vtk.js/Sources/Common/DataModel/ImageData';
import vtkDataArray from 'vtk.js/Sources/Common/Core/DataArray';

import readImageArrayBuffer from 'itk/readImageArrayBuffer';
import Matrix from 'itk/Matrix';
import getMatrixElement from 'itk/getMatrixElement';

// ----------------------------------------------------------------------------

function convertItkToVtkImage(itkImage) {
  const array = {
    values: itkImage.data,
    numberOfComponents: itkImage.imageType.components,
  };

  const vtkImage = {
    origin: [0, 0, 0],
    spacing: [1, 1, 1],
  };

  const dimensions = [1, 1, 1];

  const direction = new Matrix(3, 3);
  direction.setIdentity();

  for (let idx = 0; idx < itkImage.imageType.dimension; ++idx) {
    vtkImage.origin[idx] = itkImage.origin[idx];
    vtkImage.spacing[idx] = itkImage.spacing[idx];
    dimensions[idx] = itkImage.size[idx];
    for (let col = 0; col < itkImage.imageType.dimension; ++col) {
      direction.setElement(
        idx,
        col,
        getMatrixElement(itkImage.direction, idx, col)
      );
    }
  }

  // Create VTK Image Data
  const imageData = vtkImageData.newInstance(vtkImage);
  const scalar = vtkDataArray.newInstance(array);
  imageData.setDirection(direction.data);
  imageData.setDimensions(...dimensions);
  imageData.getPointData().setScalars(scalar);

  return imageData;
}

// ----------------------------------------------------------------------------
// vtkITKImageReader methods
// ----------------------------------------------------------------------------

function vtkITKImageReader(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkITKImageReader');

  // Returns a promise to signal when image is ready
  publicAPI.parseArrayBuffer = (arrayBuffer) => {
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
    publicAPI.parseArrayBuffer(model.rawDataBuffer, model.fileName);
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
