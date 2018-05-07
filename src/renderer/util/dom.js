// @flow
import * as React from 'react';

// is a child component being rendered?
export const isShowingChildren = (children: React.Node) => {
  if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i += 1) {
      const child = children[i];
      if (child) {
        return true;
      }
    }
    return false;
  }
  return !!children;
};
