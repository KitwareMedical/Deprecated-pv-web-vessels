import * as Glance from 'paraview-glance';

import itkExtensionToIO from 'itk/extensionToIO';

import Rpc from './Rpc';
import SegmentTubeApi from './api/SegmentTube';
import { getBackendHostAndPort } from './ElectronUtils';

import vtkITKImageReader from './helpers/ITKImageReader';

function registerITKReader() {
  // ReaderFactory will lowercase all input filenames, so remove duplicate
  // extensions here.
  new Set(
    Object.keys(itkExtensionToIO).map((ext) => ext.toLowerCase())
  ).forEach((ext) =>
    Glance.registerReader(
      ext,
      `${ext.toUpperCase()} Reader`,
      vtkITKImageReader,
      'readAsArrayBuffer',
      'parseArrayBuffer'
    )
  );
}

function main(mountPoint) {
  const [backendHost, backendPort] = getBackendHostAndPort();
  const rpc = new Rpc(SegmentTubeApi, {
    application: 'SegmentTubes',
    host: backendHost,
    port: backendPort,
  });
  rpc.connect();

  registerITKReader();

  Glance.createViewer(mountPoint);
}

main(document.querySelector('.root-container'));
