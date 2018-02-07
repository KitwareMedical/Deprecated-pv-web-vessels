import * as Glance from 'paraview-glance';

function main(mountPoint) {
  Glance.createViewer(mountPoint);
}

main(document.querySelector('.root-container'));
