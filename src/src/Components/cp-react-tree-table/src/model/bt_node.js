// @flow
import BTLeaf from './bt_leaf';
import Row from './row';
import { indexOf } from '../util';


export default class BTNode {
  parent: ?BTNode = null;
  children: Array<BTNode | BTLeaf> = [];

  _size: number = 0;
  _height: number = 0;


  constructor(children: Array<BTNode | BTLeaf>) {
    this.children = children;

    let size = 0, height = 0;
    for (let i = 0; i < children.length; ++i) {
      let ch = children[i];
      size += ch.getSize();
      height += ch.getHeight();
      ch.parent = this;
    }

    this._size = size;
    this._height = height;
  }

  getSize(): number {
    return this._size;
  }

  getHeight(): number {
    return this._height;
  }

  // https://github.com/codemirror/CodeMirror/blob/e03ef21df390753eb35ff8426dd99b1be4d29d74/src/model/chunk.js#L79
  removeInner(at: number, n: number) {
    this._size -= n;
    for (let i = 0; i < this.children.length; i++) {
      let child = this.children[i], sz = child.getSize();
      if (at < sz) {
        let rm = Math.min(n, sz - at), oldHeight = child.getHeight();
        child.removeInner(at, rm);
        this._height -= oldHeight - child.getHeight();
        if (sz === rm) {
          this.children.splice(i--, 1);
          child.parent = null;
        }
        n -= rm;
        if (n === 0) {
          break;
        }
        at = 0;
      } else {
        at -= sz;
      }
    }
    // If the result is smaller than 25 rows, ensure that it is a
    // single leaf node.
    if (this.getSize() - n < 25 &&
       (this.children.length > 1 || !(this.children[0] instanceof BTLeaf))) {
      let rows = [];
      this.collapse(rows);
      this.children = [new BTLeaf(rows)];
      this.children[0].parent = this;
    }
  }

  collapse(rows: Array<Row>) {
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].collapse(rows);
    }
  }

  // https://github.com/codemirror/CodeMirror/blob/e03ef21df390753eb35ff8426dd99b1be4d29d74/src/model/chunk.js#L107
  insertInner(at: number, rows: Array<Row>, height: number) {
    this._size += rows.length;
    this._height += height;

    for (let i = 0; i < this.children.length; i++) {
      let child = this.children[i], sz = child.getSize();
      if (at <= sz) {
        child.insertInner(at, rows, height);
        if (child instanceof BTLeaf && child.getSize() > 50) {
          // To avoid memory thrashing when child.rows is huge (e.g. first view of a large file), it's never spliced.
          // Instead, small slices are taken. They're taken in order because sequential memory accesses are fastest.
          let remaining = child.getSize() % 25 + 25;
          for (let pos = remaining; pos < child.getSize();) {
            let leaf = new BTLeaf(child.rows.slice(pos, pos += 25));
            child._height -= leaf.getHeight();
            this.children.splice(++i, 0, leaf);
            leaf.parent = this;
          }
          child.rows = child.rows.slice(0, remaining);
          this.maybeSpill();
        }
        break;
      }
      at -= sz;
    }
  }

  // When a node has grown, check whether it should be split.
  maybeSpill() {
    if (this.children.length <= 10) {
      return;
    }
    let me: BTNode = this;
    do {
      let spilled = me.children.splice(me.children.length - 5, 5);
      let sibling = new BTNode(spilled);
      if (!me.parent) { // Become the parent node
        let copy = new BTNode(me.children);
        copy.parent = me;
        me.children = [copy, sibling];
        me = copy;
     } else {
        me._size -= sibling.getSize();
        me._height -= sibling.getHeight();

        let parent: ?BTNode = me.parent;
        if (parent && parent.children) {
          let myIndex = indexOf(me, parent.children);
          parent.children.splice(myIndex + 1, 0, sibling);
        }
      }
      sibling.parent = me.parent;
    } while (me.children.length > 10)
    if (me.parent) {
      me.parent.maybeSpill();
    }
  }

  mapRange(at: number, n: number, op: (data: Row) => ?boolean): ?boolean {
    for (let i = 0; i < this.children.length; i++) {
      let child = this.children[i], sz = child.getSize();
      if (at < sz) {
        let used = Math.min(n, sz - at);
        if (child.mapRange(at, used, op)) {
          return true;
        }
        n -= used;
        if (n === 0) {
          break;
        }
        at = 0;
      } else {
        at -= sz;
      }
    }
  }

  mapAll(op: (data: Row) => ?boolean): ?boolean {
    return this.mapRange(0, this._size, op);
  }
}
