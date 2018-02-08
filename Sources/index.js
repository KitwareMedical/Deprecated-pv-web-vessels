import * as Glance from 'paraview-glance';

import itkExtensionToIO from 'itk/extensionToIO';

import Controls from './controls';
import Rpc from './Rpc';
import SegmentTubeApi from './api/SegmentTube';
import { getBackendHostAndPort } from './ElectronUtils';

import vtkITKImageReader from './helpers/ITKImageReader';

import glanceConfig from './config/glanceProxyConfig';

const { ElectronFileLoader } = Controls;

function registerITKReader() {
  // ReaderFactory will lowercase all input filenames, so remove duplicate
  // extensions here.
  new Set(
    Object.keys(itkExtensionToIO).map((ext) => ext.toLowerCase())
  ).forEach((extension) =>
    Glance.registerReader({
      extension,
      name: `${extension.toUpperCase()} Reader`,
      vtkReader: vtkITKImageReader,
      readMethod: 'readAsArrayBuffer',
      parseMethod: 'parseArrayBuffer',
      fileNameMethod: 'setFileName',
    })
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

  // overwrite the existing FileLoader
  Glance.registerControlTab('files', ElectronFileLoader, 5, 'file-text', true);

  Glance.createViewer(mountPoint, glanceConfig);
}

main(document.querySelector('.root-container'));
