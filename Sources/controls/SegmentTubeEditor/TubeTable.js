import React from 'react';
import PropTypes from 'prop-types';

import icons from '../../icons';
import style from './SegmentTubeEditor.mcss';

export default class TubeTable extends React.Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  render() {
    const rows = this.props.tubes.map((tube) => (
      <tr key={tube.uid} className={style.tubeRow}>
        <th>{tube.uid}</th>
        <th>{tube.parent === -1 ? '-' : tube.parent}</th>
        <th>{tube.points.length}</th>
        <th>
          <img className={style.actionIcon} src={icons.Eye} alt="" />
          <img className={style.actionIcon} src={icons.Trash} alt="" />
        </th>
      </tr>
    ));
    return (
      <div className={style.tubeTree}>
        <table className={style.tubeTreeTable}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Parent</th>
              <th>Points</th>
              <th />
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    );
  }
}

TubeTable.propTypes = {
  tubes: PropTypes.array.isRequired,
};
