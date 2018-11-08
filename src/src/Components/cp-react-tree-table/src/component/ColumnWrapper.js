// @flow
import React, { Component } from 'react';
import type { Node } from 'react';

import type { RowMetadata } from '../model/row';


type Props = {
  //grow?: number,
  //basis?: string, // <length> | auto
  width: string,  // <length> | auto

  rowData: any,
  rowMetadata: RowMetadata,
  toggle: () => void,
  renderCell: (rowData: any, rowMetadata: RowMetadata, toggleChildren: () => void) => Node,
  className?: string,
  classNameColumn?: string,
};

type State = {
  width: string
  //_grow: number,
  //_basis: string,
};

export default class ColumnWrapper extends Component<Props, State> {
  state = {
    //_grow: 1,
    //_basis: 'auto',
      width: 'auto'
  };

  render() {
    const { width, rowData, toggle, rowMetadata, renderCell, className, classNameColumn} = this.props;
    const { _width } = this.state;

    //const flexGrow = (grow != null) ? grow : _grow;
    //const flexBasis = (basis != null) ? basis : _basis;
    const cWidth = (width != null) ? width : _width;

    const baseClass = (className ? `cp_tree-table_column ${className || ''}`: 'cp_tree-table_column') + ' ' + (classNameColumn || '');
    return (
      <div className={baseClass}
        style={{ ...STYLE_COLUMN, width: cWidth/*flexGrow: flexGrow, flexBasis: flexBasis */}}>
        { renderCell(rowData, rowMetadata, toggle) }
      </div>
    );
  }
}

const STYLE_COLUMN = {
  boxSizing: 'border-box',
  position: 'relative',
  overflow: 'hidden',
};
