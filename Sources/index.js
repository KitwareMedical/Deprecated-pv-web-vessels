import * as Glance from 'paraview-glance';

import Rpc from './Rpc';
import SegmentTubeApi from './api/SegmentTube';
import { getBackendHostAndPort } from './ElectronUtils';

function main(mountPoint) {
  const [backendHost, backendPort] = getBackendHostAndPort();
  const rpc = new Rpc(SegmentTubeApi, {
    application: 'SegmentTubes',
    host: backendHost,
    port: backendPort,
  });
  rpc.connect();

  Glance.createViewer(mountPoint);
}

main(document.querySelector('.root-container'));
