// @flow
import React, { Component } from 'react';
import type { ChildrenArray, Element } from 'react';

import Column from './Column';
import VirtualListRow from './VirtualListRow';

import BTRoot from '../model/bt_root';
import Row from '../model/row';


type Props = {
  root: BTRoot,
  columns: ChildrenArray<Element<typeof Column>>,

  height: number,
  onToggle: (row: Row) => void,
  onRowClick: (data: object) => void,
  onScroll: (scrollTop: number) => void,
  className?: string,
  classNamePartlyVisible?: string,
  classNameColumn?: string,
  classNameMover?: string,
  classNameRow?: string,
  classNameInner?: string,
  selected?: string,
  classNameSelected?: string,
};

type State = {
  overscanHeight: number,
  height: number,
  topOffset: number,
};

type RowData = {
  row: Row,
  hasVisibleChildren: boolean,
};

export default class VirtualList extends Component<Props, State> {

  state = {
    overscanHeight: 100,
    height: 0,
    topOffset: 0,
  };

  container: ?HTMLElement;

  componentDidUpdate() {
    this._setHeight();
  }

  componentDidMount() {
    this._setHeight();
    window.addEventListener("resize", this._setHeight);
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this._setHeight);
  }

  render() {
    const { root, columns, onToggle, className, classNameColumn, onRowClick, classNamePartlyVisible, classNameMover, classNameRow, selected, classNameSelected, classNameInner} = this.props;
    const { overscanHeight, height, topOffset } = this.state;

    const startYMax = Math.max(0, root.getHeight() - height - (overscanHeight * 2));
    const startY = Math.min(startYMax, Math.max(0, topOffset - overscanHeight));
    let startIndex = root.getIndexAtY(startY);

    const endY = Math.min(root.getHeight(), topOffset + height + overscanHeight);
    let endIndex = root.getIndexAtY(endY);

    const contentTopOffset =  root.getYAtIndex(startIndex);

    let visibleRowsData: Array<RowData> = [], lastVisibleRowIndex;
    root.mapRange(startIndex, endIndex - startIndex, (row: Row) => {
      if (row.isVisible()) {
        if (lastVisibleRowIndex != null && !visibleRowsData[lastVisibleRowIndex].hasVisibleChildren) {
          const data = visibleRowsData[lastVisibleRowIndex];
          
          if (data != null && data.row.depth === row.depth - 1 && !data.hasVisibleChildren) {
            visibleRowsData[lastVisibleRowIndex].hasVisibleChildren = true;
          }
        }

        lastVisibleRowIndex = visibleRowsData.length;
        visibleRowsData.push({
          row: row,
          hasVisibleChildren: false,
        });
      }
    });

    let visibleRows = [];
    let relativeIndex = 0;
    visibleRowsData.forEach((data: RowData) => {
        (data.row.data.visible === undefined || data.row.data.visible || data.row.data.hasVisibleChildren) && visibleRows.push(
        <VirtualListRow
          row={data.row}
          columns={columns}
          selected={selected}
          onRowClick={onRowClick}
          classNameSelected={classNameSelected}
          classNameColumn={classNameColumn}
          classNameRow={classNameRow + (!data.row.data.visible && classNamePartlyVisible && data.row.data.hasVisibleChildren ? ' ' + classNamePartlyVisible : '')}
          hasVisibleChildren={data.hasVisibleChildren}
          index={relativeIndex}
          key={relativeIndex++}
          onToggle={() => onToggle(data.row)}/>
      );
    });

    return (
      <div className={className}
        style={{ ...STYLE_LIST, height: this.props.height + 'px', }}
        ref={elem => {this.container = elem}}
        onScroll={this._handleScroll}>

        <div style={{ ...STYLE_WRAPPER, height: (root.getHeight()) + 'px', }} className={classNameInner || ''}>
          <div style={{ ...STYLE_CONTENT, top: (contentTopOffset) + 'px' }}
            className={'cp_tree-table_mover ' + (classNameMover || '')}>
            {visibleRows}
          </div>
        </div>

      </div>
    );
  }

  scrollTop(posY: number = 0) {
    if (this.container) {
      this.container.parentNode.scrollTop = posY;
    }
  }

  // virtual scroll
  _handleScroll = () => {
    const { onScroll } = this.props;

    if (this.container) {
      const { scrollTop } = this.container;

      onScroll(scrollTop);

      this.setState({
        topOffset: scrollTop
      });
    }
  };

  // virtual scroll
  _setHeight = () => {
    const { height } = this.state;
    
    if (this.container) {
      const { offsetHeight } = this.container;

      if (height !== offsetHeight) {
        this.setState({
          height: offsetHeight
        });
      }
    }
  };
}

const STYLE_LIST = {
  overflow: 'auto',
  WebkitOverflowScrolling: 'touch',
};

const STYLE_WRAPPER = {
  position: 'relative',
  overflow: 'hidden',
  width: '100%',
  minHeight: '100%',
};

const STYLE_CONTENT = {
  position: 'absolute',
  overflow: 'visible',
  height: '100%',
  width: '100%',
  top: '0',
  left: '0',
};
