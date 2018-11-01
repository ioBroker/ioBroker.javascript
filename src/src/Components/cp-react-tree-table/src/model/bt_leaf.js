// @flow
import BTNode from './bt_node';
import Row from './row';


export default class BTLeaf {
  parent: ?BTNode = null;
  rows: Array<Row> = [];

  _height: number = 0;

  constructor(rows: Array<Row> = []) {
    this.rows = rows;

    let height = 0;
    for (let i = 0; i < rows.length; ++i) {
      rows[i].parent = this;
      height += rows[i].getHeight();
    }
    this._height = height;
  }

  getSize(): number {
    return this.rows.length;
  }

  getHeight(): number {
    return this._height;
  }

  // Remove n rows at offset 'at'.
  removeInner(at: number, n: number) {
    for (let i = at, e = at + n; i < e; ++i) {
      let row = this.rows[i];
      this._height -= row.getHeight();

      row.parent = null;
    }
    this.rows.splice(at, n);
  }

  collapse(rows: Array<Row>) {
    rows.push.apply(rows, this.rows)
  }

  // Insert the given array of rows at offset 'at', count them as
  // having the given height.
  insertInner(at: number, rows: Array<Row>, height: number) {
    this._height += height
    this.rows = this.rows.slice(0, at).concat(rows).concat(this.rows.slice(at))
    for (let i = 0; i < rows.length; ++i) {
      rows[i].parent = this;
    }
  }

  mapRange(at: number, n: number, op: (data: Row) => ?boolean): ?boolean {
    for (let e = at + n; at < e; ++at) {
      if (op(this.rows[at])) {
        return true;
      }
    }
  }
}
