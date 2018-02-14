import React from 'react';
import PropTypes from 'prop-types';

import * as Glance from 'paraview-glance';

import { FILEPATH_KEY } from '../../Constants';
import style from './ElectronFileLoader.mcss';

export default class ElectronFileLoader extends React.Component {
  constructor(props) {
    super(props);
    this.loadFiles = this.loadFiles.bind(this);
    this.openFiles = this.openFiles.bind(this);

    if (props.initialFiles.length) {
      this.loadFiles(props.initialFiles);
    }
  }

  loadFiles(files) {
    Glance.loadFiles(files)
      .then((readers) => {
        for (let i = 0; i < readers.length; i++) {
          const { reader, sourceType, name, dataset } = readers[i];
          if (reader) {
            const source = this.props.proxyManager.createProxy(
              'Sources',
              'TrivialProducer',
              { name }
            );
            // annotate the source with the file path
            source.setKey(FILEPATH_KEY, files[i].path);

            if (dataset && dataset.isA && dataset.isA('vtkDataSet')) {
              source.setInputData(dataset, sourceType);
            } else {
              source.setInputAlgorithm(reader, sourceType);
            }

            this.props.proxyManager.createRepresentationInAllViews(source);
            this.props.proxyManager.renderAllViews();
          }
        }

        this.props.updateTab('pipeline');
      })
      .catch((error) => {
        console.error('[ElectronFileLoader]', error);
      });
  }

  openFiles() {
    Glance.openFiles(Glance.listSupportedExtensions(), this.loadFiles);
  }

  render() {
    return (
      <div className={style.content}>
        <button onClick={this.openFiles}>Load local file</button>
        <label className={style.supportedFiles}>
          {Glance.listSupportedExtensions()
            .map((ext) => `*.${ext}`)
            .join(', ')}
        </label>
      </div>
    );
  }
}

ElectronFileLoader.propTypes = {
  proxyManager: PropTypes.object.isRequired,
  updateTab: PropTypes.func,
  initialFiles: PropTypes.array,
};

ElectronFileLoader.defaultProps = {
  updateTab: () => {},
  initialFiles: [],
};
