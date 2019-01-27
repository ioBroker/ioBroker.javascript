// @flow
import BTLeaf from './bt_leaf';


export type TreeDataRow = {
  data: any,
  height?: number,
  children?: Array<TreeDataRow>,
};

export type RowMetadata = {
  depth: number;
  hasChildren: boolean;
  hasVisibleChildren: boolean;
};

export type PartialRowMetadata = {
  depth: number;
  hasChildren: boolean;
};

export default class Row {
  parent: ?BTLeaf = null;
  depth: number;      // tree depth
  data: any;          // row data

  _hasChildren: boolean;

  _height: number = 26;    // height in px (26px - fallback value)
  _cacheHeight: number = 26;

  constructor(data: any, hasChildren: boolean, depth: number = 0, isVisible: boolean, height: ?number) {
    this.data = data;
    this.depth = depth;
    this._hasChildren = hasChildren;

    if (height != null) {
      this._height = height;
      this._cacheHeight = height;
    }

    if (!isVisible) {
      this._height = 0;
    }
  }

  setHeight(value: number) {
    this._updateHeight(value);
    if (value > 0) {
      this._cacheHeight = value;
    }
  }

  getHeight(): number {
    return this._height;
  }

  isVisible(): boolean {
    return this._height > 0;
  }

  getMetadata(): PartialRowMetadata {
    return {
      depth: this.depth,
      hasChildren: this._hasChildren,
    };
  }

  toggle(): void {
    if (this._height > 0) {
      this.hide();
    } else {
      this.show();
    }
  }

  hide(): void {
    this._cacheHeight = this._height;
    this._updateHeight(0);
  }

  show(): void {
    this._updateHeight(this._cacheHeight);
  }

  _updateHeight(value: number) {
    let diff = value - this._height;
    if (diff) {
      for (let n = this; n; n = n.parent) {
        n._height += diff;
      }
    }
  }
}
