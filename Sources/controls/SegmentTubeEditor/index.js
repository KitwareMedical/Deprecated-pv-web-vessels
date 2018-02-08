import React from 'react';
import PropTypes from 'prop-types';

import vtkCellPicker from 'vtk.js/Sources/Rendering/Core/CellPicker';

import CollapsibleWidget from 'paraviewweb/src/React/Widgets/CollapsibleWidget';

import { FILEPATH_KEY } from '../../Constants';
import { onServerStdout, onServerStderr } from '../../ElectronUtils';

import style from './SegmentTubeEditor.mcss';

const NO_IMAGE = -999;
const NO_TUBE = -1;
const DEFAULT_SCALE = 2.0;

// TODO this will be deprecated in a future vtkjs release
function get2DPosition(interactor) {
  const pos = interactor.getEventPosition(interactor.getPointerIndex());
  const bounds = interactor.getCanvas().getBoundingClientRect();
  return [pos.x - bounds.left, pos.y + bounds.top];
}

function onViewClick(view, callback) {
  let clickPos = [0, 0];
  let time = 0;

  function press() {
    clickPos = get2DPosition(view.getInteractor());
    time = +new Date();
  }

  function release() {
    const [nx, ny] = get2DPosition(view.getInteractor());
    const [ox, oy] = clickPos;
    if (
      (nx - ox) ** 2 + (ny - oy) ** 2 <= 3 * 3 &&
      new Date() - time <= 500 // 500 milliseconds
    ) {
      callback({
        view,
        clickX: ox,
        clickY: oy,
      });
    }
  }

  const unsubPress = view.getInteractor().onLeftButtonPress(press);
  const unsubRelease = view.getInteractor().onLeftButtonRelease(release);

  function unsubscribe() {
    unsubPress.unsubscribe();
    unsubRelease.unsubscribe();
  }

  return Object.freeze({
    unsubscribe,
  });
}

export default class SegmentTubeEditor extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedImage: NO_IMAGE,
      serverLog: '',
      scaleText: String(DEFAULT_SCALE),
      segmentEnabled: false,
    };

    // proxyId -> imageId
    this.loadedImageIds = {};
    this.lifetimeUnsubscribes = [];
    this.viewUnsubscribes = [];
    this.picker = vtkCellPicker.newInstance();

    this.selectImage = this.selectImage.bind(this);
    this.cleanupDeletedImages = this.cleanupDeletedImages.bind(this);
    this.appendServerLog = this.appendServerLog.bind(this);
    this.clearLog = this.clearLog.bind(this);
    this.setScale = this.setScale.bind(this);
    this.listenViewEvents = this.listenViewEvents.bind(this);
    this.segmentAtClick = this.segmentAtClick.bind(this);
  }

  componentDidMount() {
    const { proxyManager } = this.props;
    this.lifetimeUnsubscribes = [
      // TODO should there be events pertaining to addition/deletion of sources?
      // This also has the issue of not detecting when a non-active source is
      // deleted...
      proxyManager.onActiveSourceChange(this.cleanupDeletedImages),
      proxyManager.onActiveViewChange(this.listenViewEvents),
      onServerStdout(this.appendServerLog),
      onServerStderr(this.appendServerLog),
    ];
  }

  componentWillUnmount() {
    while (this.lifetimeUnsubscribes.length) {
      this.lifetimeUnsubscribes.pop().unsubscribe();
    }
    if (this.viewUnsubscribe) {
      this.viewUnsubscribe.unsubscribe();
      this.viewUnsubscribe = null;
    }
  }

  setScale(scaleText) {
    // Matches empty string or a positive decimal
    if (/(^$)|(^[0-9]+\.?[0-9]*$)|(^\.[0-9]+$)/.test(scaleText)) {
      this.setState({ scaleText });
    }
  }

  appendServerLog(event, message) {
    console.log(message);
    this.setState(({ serverLog }) => ({
      serverLog: serverLog + message,
    }));
  }

  cleanupDeletedImages() {
    const proxyIds = new Set(
      this.props.proxyManager.getSources().map((s) => s.getProxyId())
    );

    Object.keys(this.loadedImageIds).forEach((proxyId) => {
      if (!proxyIds.has(proxyId)) {
        this.props.rpcClient
          .unloadImage(this.loadedImageIds[proxyId])
          .then(() => {
            if (this.state.selectedImage === proxyId) {
              this.setState({
                selectedImage: NO_IMAGE,
                segmentEnabled: false,
              });
            }
            delete this.loadedImageIds[proxyId];
          })
          .catch((error) => {
            const message = `${error.data.exception}\n${error.data.trace}`;
            this.appendServerLog(null, message);
          });
      }
    });
  }

  clearLog() {
    this.setState({ serverLog: '' });
  }

  listenViewEvents() {
    if (this.viewUnsubscribe) {
      this.viewUnsubscribe.unsubscribe();
      this.viewUnsubscribe = null;
    }

    const view = this.props.proxyManager.getActiveView();
    if (view.getProxyName() === 'View2D') {
      this.viewUnsubscribe = onViewClick(view, this.segmentAtClick);
    }
  }

  segmentAtClick({ view, clickX, clickY }) {
    if (!this.state.segmentEnabled) {
      return;
    }

    const renderer = view.getRenderer();
    this.picker.pick([clickX, clickY, 0], renderer);

    const selectedSource = this.props.proxyManager
      .getSources()
      .find((s) => s.getProxyId() === this.state.selectedImage);
    const representation = this.props.proxyManager.getRepresentation(
      selectedSource,
      view
    );
    // safely assume the first actor for slices
    const selectedActor = representation.getActors()[0];

    // TODO maybe utilize the pick list?
    const { actors, cellIJK } = this.picker.get('actors', 'cellIJK');
    if (actors.indexOf(selectedActor) >= 0) {
      const imgId = this.loadedImageIds[this.state.selectedImage];
      this.segmentTube(imgId, cellIJK);
    }
  }

  segmentTube(imgId, ijk) {
    const params = {
      scale: Number(this.state.scaleText),
    };

    this.props.rpcClient
      .segmentTube(imgId, ijk, params)
      .then((result) => {
        if (result.uid !== NO_TUBE) {
          console.log(result);
        }
      })
      .catch((error) => {
        const message = `${error.data.exception}\n${error.data.trace}`;
        this.appendServerLog(null, message);
      });
  }

  selectImage(proxyId) {
    const source = this.props.proxyManager
      .getSources()
      .find((s) => s.getProxyId() === proxyId);

    if (source) {
      const imageId =
        source.getProxyId() in this.loadedImageIds
          ? this.loadedImageIds[source.getProxyId]
          : this.props.rpcClient.loadFile(source.getKey(FILEPATH_KEY));

      Promise.resolve(imageId)
        .then((id) => {
          this.loadedImageIds[proxyId] = id;
          this.setState({
            selectedImage: proxyId,
            segmentEnabled: true,
          });
        })
        .catch((error) => {
          const message = `${error.data.exception}\n${error.data.trace}`;
          this.appendServerLog(null, message);
        });
    } else {
      this.setState({
        selectedImage: NO_IMAGE,
        segmentEnabled: false,
      });
    }
  }

  render() {
    const makeOption = (name, index) => (
      <option key={name} value={index}>
        {name}
      </option>
    );

    const sources = this.props.proxyManager
      .getSources()
      .filter((s) => s.getType() === 'vtkImageData');

    const options = [makeOption('(none)', NO_IMAGE)].concat(
      sources.map((source) => makeOption(source.getName(), source.getProxyId()))
    );

    return (
      <div>
        <section>
          <label>Selected image: </label>
          <select
            value={this.state.selectedImage}
            onChange={(ev) => this.selectImage(ev.target.value)}
          >
            {options}
          </select>
        </section>
        <section>
          <label>Enable segmentation: </label>
          <input
            type="checkbox"
            disabled={this.state.selectedImage === NO_IMAGE}
            checked={this.state.segmentEnabled}
            onChange={(ev) =>
              this.setState({ segmentEnabled: ev.target.checked })
            }
          />
        </section>
        <section>
          <label>Scale: </label>
          <input
            type="text"
            disabled={this.state.selectedImage === NO_IMAGE}
            value={this.state.scaleText}
            placeholder={DEFAULT_SCALE}
            onChange={(ev) => this.setScale(ev.target.value)}
          />
        </section>
        <CollapsibleWidget title="Output log">
          <textarea className={style.outputLog} value={this.state.serverLog} />
          <input type="button" value="Clear log" onClick={this.clearLog} />
        </CollapsibleWidget>
      </div>
    );
  }
}

SegmentTubeEditor.propTypes = {
  proxyManager: PropTypes.object.isRequired,
  rpcClient: PropTypes.object.isRequired,
};
