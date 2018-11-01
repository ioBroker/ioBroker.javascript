// @flow
import React, { Component } from 'react';
import type { ChildrenArray, Element } from 'react';

import Column from './Column';
import VirtualList from './VirtualList';

import BTRoot from '../model/bt_root';
import Row from '../model/row';
import type { TreeDataRow  } from '../model/row';

import { processData, noop, findNodeData } from '../util';


type TreeChange = {
  root: BTRoot,
  hasChange: boolean,
};

type Props = {
  data: Array<TreeDataRow>,
  children: ChildrenArray<Element<typeof Column>>,
  classNameColumn?: string,
  classNameMover?: string,
  classNameInner?: string,
  classNameRow?: string,
  selected?: string,
  classNameSelected?: string,
  height?: number,
  rowHeight?: number,
  onScroll?: (scrollTop: number) => void,
  className?: string,
};

type State = {
  root: BTRoot,
};

export default class TreeDataTable extends Component<Props, State> {
  static Column = Column;

  virtualList: ?VirtualList;

  constructor(props: Props) {
    super(props);
    const { rowHeight } = props;

    this.state = {
      root: new BTRoot(processData(this.props.data, rowHeight)),
    };
  }

  render() {
    const { height, children, onScroll, className, classNameRow, classNameColumn, classNameMover, classNameInner, selected, classNameSelected } = this.props;
    
    const baseClass = className ? `cp_tree-table ${className}`: 'cp_tree-table';
    return (
      <VirtualList className={baseClass}
                   classNameSelected={classNameSelected}
                   selected={selected}
                   classNameRow={classNameRow}
                   classNameColumn={classNameColumn}
                   classNameMover={classNameMover}
                   classNameInner={classNameInner}
        ref={elem => {this.virtualList = elem}}

        columns={children}

        height={height || 200}
        root={this.state.root}
        
        onScroll={onScroll || noop}
        onToggle={(row) => this._handleOnToggle(row)}/>
    );
  }

  // Public API
  scrollIntoView(node: TreeDataRow, expandAncestors: boolean = true) {
    const { root } = this.state;

    const row = findNodeData(root, node);
    if (row) {
      const rowIndex = root.getRowIndex(row);
      if (expandAncestors && !row.isVisible()) {
        let ancestors: Array<Row> = [];
        for (let currentRowIndex = Math.max(rowIndex - 1, 0), previousDepth = row.depth; currentRowIndex >= 0; currentRowIndex--) {
          const currentRow = root.getRow(currentRowIndex);
          
          if (currentRow.depth === previousDepth - 1) {  // Parent
            ancestors.push(currentRow);
            previousDepth = currentRow.depth;

            if (currentRow.isVisible()) { // From here up, all the ancestors are visible
              break;
            }
          }

          if (currentRow.depth === 0) {
            break;
          }
        }

        // Batch changes
        let currentRoot = root;
        let hasChange: boolean = false;
        for (let i = 0; i < ancestors.length; i++) {
          const currentRow = ancestors[i];
          const delta = this._toggleRow(currentRoot, currentRow);

          if (!hasChange) {
            hasChange = delta.hasChange;
          }
        }

        if (hasChange) {
          this.setState({ root: currentRoot }, () => {
            const posY = root.getYAtIndex(rowIndex);
            this.scrollTo(posY);
          });
        }
      } else {
        const posY = root.getYAtIndex(rowIndex);
        this.scrollTo(posY);
      }
    }
  }

  // Public API
  scrollTo(posY: number) {
    if (this.virtualList) {
      this.virtualList.scrollTop(posY);
    }
  }

  // Makes rows in the given range that don't represent root nodes (row.depth == 0) visible
  _showRowsInRange(from?: number, to?: number) {
    const { root } = this.state;

    let _from = (from != null) ? from : 0;
    let _to = (to != null) ? to : root.getSize();

    // Validation
    if (!this._isOpRangeValid(_from, _to)) {
      return;
    }

    // Expand op
    let hasChange: boolean = false;
    root.mapRange(_from, _to, (row: Row) => {
      if (row.depth > 0 && !row.isVisible()) {
        row.show();
        hasChange = true;
      }
    });

    if (hasChange) {
      this.setState({ root: root });
    }
  }

  // Public API
  expandAll() { // _showRowsInRange alias with the default arguments
    this._showRowsInRange();
  }

  // Hides rows in the given range that don't represent root nodes (row.depth == 0)
  _hideRowsInRange(from?: number, to?: number) {
    const { root } = this.state;

    let _from = (from != null) ? from : 0;
    let _to = (to != null) ? to : root.getSize();

    // Validation
    if (!this._isOpRangeValid(_from, _to)) {
      return;
    }

    // Expand op
    let hasChange: boolean = false;
    root.mapRange(_from, _to, (row: Row) => {
      if (row.depth > 0 && row.isVisible()) {
        row.hide();
        hasChange = true;
      }
    });

    if (hasChange) {
      this.setState({ root: root });
    }
  }

  // Public API
  collapseAll() { // _hideRowsInRange alias with the default arguments
    this._hideRowsInRange();
  }

  _isOpRangeValid(from: number, to: number): boolean {
    const { root } = this.state;
    const maxTo = root.getSize();
    // Validation
    if (from < 0) {
      console.warn('Invalid range: from < 0');
      return false;
    }
    if (from > maxTo) {
      console.warn('Invalid range: from > max size');
      return false;
    }
    if (to > maxTo) {
      console.warn('Invalid range: to > max size');
      return false;
    }
    if (from > to) {
      console.warn('Invalid range: to > from');
      return false;
    }
    return true;
  }

  _handleOnToggle = (row: Row) => {
    const { root } = this.state;

    const delta = this._toggleRow(root, row);
    if (delta.hasChange) {
      this.setState({ root: delta.root });
    }
  }

  _toggleRow = (root: BTRoot, row: Row): TreeChange => {
    const currentDepth = row.depth;
    let rowIndex = Math.min(root.getRowIndex(row) + 1, root.getSize());

    let hasChange: boolean = false;
    let toggleOpen: ?boolean;
    root.mapRange(rowIndex, root.getSize() - rowIndex, (row: Row) => {
      if (toggleOpen == null) {
        toggleOpen = !row.isVisible();
      }

      if (row.depth >= currentDepth + 1) {
        if (row.depth === currentDepth + 1) {
          row.toggle();
          hasChange = true;
        } else if (!toggleOpen && row.isVisible()) { // Close all children
          row.toggle();
          hasChange = true;
        }
        
        return false;
      } else {
        return true;
      }
    });

    return {
      root: root,
      hasChange: hasChange,
    };
  }
}
