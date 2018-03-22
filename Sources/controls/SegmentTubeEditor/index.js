import React from 'react';
import PropTypes from 'prop-types';

import vtkCellPicker from 'vtk.js/Sources/Rendering/Core/CellPicker';

import CollapsibleWidget from 'paraviewweb/src/React/Widgets/CollapsibleWidget';

import vtkTubeSource from '../../helpers/TubeSource';
import { FILEPATH_KEY } from '../../Constants';
import {
  onServerStdout,
  onServerStderr,
  openSaveDialog,
} from '../../ElectronUtils';

import TubeTable from './TubeTable';
import style from './SegmentTubeEditor.mcss';

const NO_PROXY = -1;
const NO_TUBE = -1;
const DEFAULT_SCALE = 2.0;

function onViewClick(view, callback) {
  let clickPos = [0, 0];
  let time = 0;

  function press(ev) {
    clickPos = [ev.position.x, ev.position.y];
    time = +new Date();
  }

  function release(ev) {
    const [nx, ny] = [ev.position.x, ev.position.y];
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
      activeProxyId: NO_PROXY,
      serverLog: '',
      scaleText: String(DEFAULT_SCALE),
      segmentEnabled: false,
      tubes: [],
    };

    // keyed by proxy ID
    this.cachedStates = {};
    this.lifetimeUnsubscribes = [];
    this.viewUnsubscribe = null;
    this.picker = vtkCellPicker.newInstance();

    this.onActiveViewChanged = this.onActiveViewChanged.bind(this);
    this.onProxyRegistrationChange = this.onProxyRegistrationChange.bind(this);
    this.setScale = this.setScale.bind(this);
    this.appendServerLog = this.appendServerLog.bind(this);
    this.clearLog = this.clearLog.bind(this);
    this.logError = this.logError.bind(this);
    this.saveTubes = this.saveTubes.bind(this);
    this.deleteTube = this.deleteTube.bind(this);
    this.showHideTube = this.showHideTube.bind(this);
    this.segmentTube = this.segmentTube.bind(this);
    this.segmentAtClick = this.segmentAtClick.bind(this);
    this.selectProxy = this.selectProxy.bind(this);
  }

  componentDidMount() {
    const { proxyManager } = this.props;
    this.lifetimeUnsubscribes = [
      // TODO should there be events pertaining to addition/deletion of sources?
      // This also has the issue of not detecting when a non-active source is
      // deleted...
      proxyManager.onProxyRegistrationChange(this.onProxyRegistrationChange),
      proxyManager.onActiveViewChange(this.onActiveViewChanged),
      onServerStdout(this.appendServerLog),
      onServerStderr(this.appendServerLog),
    ];
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      this.state.activeProxyId !== NO_PROXY &&
      prevState.tubes !== this.state.tubes
    ) {
      const tubeProxy = this.cachedStates[this.state.activeProxyId].tubeProxy;
      tubeProxy.getAlgo().setTubes(this.state.tubes);
      this.props.proxyManager.renderAllViews();
    }
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

  onActiveViewChanged() {
    if (this.viewUnsubscribe) {
      this.viewUnsubscribe.unsubscribe();
      this.viewUnsubscribe = null;
    }

    const view = this.props.proxyManager.getActiveView();
    if (view.getClassName() === 'vtkView2DProxy') {
      this.viewUnsubscribe = onViewClick(view, this.segmentAtClick);
    }
  }

  onProxyRegistrationChange(changeInfo) {
    if (changeInfo.action === 'unregister') {
      if (this.cachedStates[changeInfo.proxyId]) {
        this.props.rpcClient
          .unloadImage(this.cachedStates[changeInfo.proxyId].serverImageId)
          .then(() => {
            if (this.state.activeProxyId === changeInfo.proxyId) {
              this.selectProxy(NO_PROXY);
            }
            delete this.cachedStates[changeInfo.proxyId];
          })
          .catch(this.logError);
      }
    }
  }

  setScale(scaleText) {
    // Matches empty string or a positive decimal
    if (/(^$)|(^[0-9]+\.?[0-9]*$)|(^\.[0-9]+$)/.test(scaleText)) {
      this.setState({ scaleText });
    }
  }

  // Logging

  appendServerLog(event, message) {
    console.log(message);
    this.setState(({ serverLog }) => ({
      serverLog: serverLog + message,
    }));
  }

  logError(error) {
    const message = error.data
      ? `${error.data.exception}\n${error.data.trace}`
      : error;
    this.appendServerLog(null, message);
  }

  clearLog() {
    this.setState({ serverLog: '' });
  }

  // Tube operations

  addTube(proxyId, tube) {
    if (proxyId in this.cachedStates) {
      const tubeObj = Object.assign(
        {
          points: [],
          radii: [],
          visible: true,
        },
        tube
      );

      if (proxyId === this.state.activeProxyId) {
        this.setState(({ tubes }) => ({
          tubes: [...tubes, tubeObj],
        }));
      } else {
        this.cachedStates[proxyId].tubes.push(tubeObj);
      }
    }
  }

  deleteTube(tubeUid) {
    const proxyId = this.state.activeProxyId;
    const serverImageId = this.cachedStates[proxyId].serverImageId;
    return this.props.rpcClient
      .deleteTube(serverImageId, tubeUid)
      .then(() => {
        if (proxyId === this.state.activeProxyId) {
          this.setState(({ tubes }) => ({
            tubes: tubes.filter((t) => t.uid !== tubeUid),
          }));
        } else {
          this.cachedStates[proxyId].tubes = this.cachedStates[
            proxyId
          ].tubes.filter((t) => t.uid !== tubeUid);
        }
      })
      .catch(this.logError);
  }

  saveTubes() {
    openSaveDialog()
      .then((filename) => {
        if (filename) {
          this.props.rpcClient.saveTubes(
            this.cachedStates[this.state.activeProxyId].serverImageId,
            filename
          );
        }
      })
      .catch(this.logError);
  }

  showHideTube(tubeUid) {
    this.setState(({ tubes }) => ({
      tubes: tubes.map((t) => {
        if (t.uid === tubeUid) {
          t.visible = !t.visible;
        }
        return t;
      }),
    }));
  }

  segmentTube(imgId, ijk) {
    const params = {
      scale: Number(this.state.scaleText),
    };
    return this.props.rpcClient.segmentTube(imgId, ijk, params);
  }

  segmentAtClick({ view, clickX, clickY }) {
    if (!this.state.segmentEnabled) {
      return;
    }

    const renderer = view.getRenderer();
    this.picker.pick([clickX, clickY, 0], renderer);

    const selectedSource = this.props.proxyManager
      .getSources()
      .find((s) => s.getProxyId() === this.state.activeProxyId);
    const representation = this.props.proxyManager.getRepresentation(
      selectedSource,
      view
    );
    // safely assume the first actor for slices, since we only listen on
    // slice views.
    const selectedActor = representation.getActors()[0];

    // TODO maybe utilize the pick list?
    const { actors, cellIJK } = this.picker.get('actors', 'cellIJK');

    if (actors.indexOf(selectedActor) >= 0) {
      // Cache the selected image b/c the active image proxy may be changed
      // during segmentation.
      const proxyId = this.state.activeProxyId;
      const imgId = this.cachedStates[proxyId].serverImageId;

      this.segmentTube(imgId, cellIJK)
        .then((tube) => {
          if (tube.uid !== NO_TUBE) {
            this.addTube(proxyId, tube);
          }
        })
        .catch(this.logError);
    }
  }

  createTubeProxy(name) {
    const tubeSource = vtkTubeSource.newInstance();
    const tubeProxy = this.props.proxyManager.createProxy(
      'Sources',
      'TrivialProducer',
      { name }
    );

    tubeProxy.setInputAlgorithm(tubeSource);
    this.props.proxyManager.createRepresentationInAllViews(tubeProxy);
    return tubeProxy;
  }

  selectProxy(proxyId) {
    if (proxyId === this.state.activeProxyId) {
      return;
    }

    // save state
    if (this.state.activeProxyId !== NO_PROXY) {
      Object.assign(this.cachedStates[this.state.activeProxyId], {
        tubes: this.state.tubes,
      });
    }

    const source = this.props.proxyManager
      .getSources()
      .find((s) => s.getProxyId() === proxyId);

    if (source) {
      const serverImageId =
        proxyId in this.cachedStates
          ? this.cachedStates[proxyId].serverImageId
          : this.props.rpcClient.loadFile(source.getKey(FILEPATH_KEY));

      Promise.resolve(serverImageId)
        .then((id) => {
          // create initial state for selected proxy
          if (!(proxyId in this.cachedStates)) {
            const tubeProxy = this.createTubeProxy(
              `Tubes for ${source.getName()}`
            );

            this.cachedStates[proxyId] = {
              serverImageId: id,
              tubes: [],
              tubeProxy,
            };
          }

          this.setState({
            activeProxyId: proxyId,
            segmentEnabled: true,
            tubes: this.cachedStates[proxyId].tubes,
          });
        })
        .catch(this.logError);
    } else {
      this.setState({
        activeProxyId: NO_PROXY,
        segmentEnabled: false,
        tubes: [],
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

    const options = [makeOption('(none)', NO_PROXY)].concat(
      sources.map((source) => makeOption(source.getName(), source.getProxyId()))
    );

    return (
      <div>
        <section>
          <label>Selected image: </label>
          <select
            value={this.state.activeProxyId}
            onChange={(ev) => this.selectProxy(ev.target.value)}
          >
            {options}
          </select>
        </section>
        <section>
          <label>Enable segmentation: </label>
          <input
            type="checkbox"
            disabled={this.state.activeProxyId === NO_PROXY}
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
            disabled={this.state.activeProxyId === NO_PROXY}
            value={this.state.scaleText}
            placeholder={DEFAULT_SCALE}
            onChange={(ev) => this.setScale(ev.target.value)}
          />
        </section>
        <CollapsibleWidget title="Tubes">
          <TubeTable
            tubes={this.state.tubes}
            onDeleteTube={this.deleteTube}
            onShowHideTube={this.showHideTube}
          />
          <input
            type="button"
            value="Save"
            disabled={this.state.activeProxyId === NO_PROXY}
            onClick={this.saveTubes}
          />
        </CollapsibleWidget>
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
