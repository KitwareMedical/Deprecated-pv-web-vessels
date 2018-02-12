import React from 'react';
import PropTypes from 'prop-types';

import style from './SegmentTubeEditor.mcss';

export default function TubeTable({ tubes, onShowHideTube }) {
  const rows = tubes.map((tube) => (
    <tr key={tube.uid} className={style.tubeRow}>
      <th>{tube.uid}</th>
      <th>{tube.parent === -1 ? '-' : tube.parent}</th>
      <th>{tube.points.length}</th>
      <th>
        <button>V</button>
        <button onClick={() => onDeleteTube(tube.uid)}>D</button>
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

TubeTable.propTypes = {
  tubes: PropTypes.array.isRequired,
  onShowHideTube: PropTypes.func,
};

TubeTable.defaultProps = {
  onShowHideTube: () => {},
};
