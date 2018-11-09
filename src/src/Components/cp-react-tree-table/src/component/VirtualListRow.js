// @flow
import React, { Component, Children } from 'react';
import type { ChildrenArray, Element } from 'react';

import Column from './Column';
import ColumnWrapper from './ColumnWrapper';


type Props = {
  row: any,
  columns: ChildrenArray<Element<typeof Column>>,

  hasVisibleChildren: boolean, // Metadata
  classNameColumn?: string,
  classNameSelected?: string,
  classNameRow?: string,
  index: number,
  selected?: string,
  onToggle: () => void,
  onRowClick: (data: object) => void,
};

type State = {
  overscanHeight: number,
  height: number,
  topOffset: number,
};

export default class VirtualListRow extends Component<Props, State> {

  state = {
    overscanHeight: 100,
    height: 0,
    topOffset: 0,
  };

  render() {
    const { row, hasVisibleChildren, index, onToggle, columns, classNameRow, classNameColumn, selected, classNameSelected } = this.props;

    const metadata = { ...row.getMetadata(), hasVisibleChildren: hasVisibleChildren };

    const style = {...STYLE_ROW, height: row.getHeight() + 'px'};

    return (
      <div className={'cp_tree-table_row ' + (classNameRow || '') + (selected === row.data.id ? ' ' + classNameSelected : '')}
        style={style}
        data-rindex={index}
        onClick={() => this.props.onRowClick && this.props.onRowClick(row.data, metadata, onToggle)}
        onDoubleClick={() => this.props.onRowClick && this.props.onRowClick(row.data, metadata, onToggle, true)}
        data-depth={row.depth} >
      
        {Children.toArray(columns).map((column, index) => {
          return (
            <ColumnWrapper key={index}
              {...column.props}
              classNameColumn={classNameColumn}
              rowData={row.data}
              toggle={onToggle}
              rowMetadata={metadata}/>
          );
        })}
      </div>
    );
  }
}

const STYLE_ROW = {
  // display: 'flex',

  boxSizing: 'border-box',
  position: 'relative',
  overflow: 'hidden',
  width: '100%',
};
