// @flow
import * as React from 'react';
import classnames from 'classnames';
import { DARK_THEME, LIGHT_THEME } from 'constants/settings';

type Props = {
  dark?: boolean, // always a dark spinner
  light?: boolean, // always a light spinner
  theme: string,
};

const Spinner = (props: Props) => {
  const { dark, light, theme } = props;

  return (
    <div
      className={classnames('spinner', {
        'spinner--dark': !light && (dark || theme === LIGHT_THEME),
        'spinner--light': !dark && (light || theme === DARK_THEME),
      })}
    >
      <div className="rect rect1" />
      <div className="rect rect2" />
      <div className="rect rect3" />
      <div className="rect rect4" />
      <div className="rect rect5" />
    </div>
  );
};

Spinner.defaultProps = {
  dark: false,
  light: false,
};

export default Spinner;
