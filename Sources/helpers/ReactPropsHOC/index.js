import React from 'react';

export function ReactPropsHOC(Component, otherProps) {
  return function ComponentWrapper(props) {
    return <Component {...otherProps} {...props} />;
  };
}

export default {
  ReactPropsHOC,
};
