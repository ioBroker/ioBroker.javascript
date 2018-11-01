// @flow
import BTLeaf from './bt_leaf';
import BTNode from './bt_node';
import Row from './row';
import { indexOf } from '../util';


export default class BTRoot extends BTNode {
  constructor(data: Array<Row> = []) {
    super([new BTLeaf([])]);

    this.insert(0, data);
  }

  insert(at: number, rows: Array<Row>) {
    let height = 0
    for (let i = 0; i < rows.length; ++i) {
      height += rows[i].getHeight();
    }
    super.insertInner(at, rows, height);
  }

  remove(at: number, n: number) {
    super.removeInner(at, n);
  }

  getRow(index: number): Row {
    if (index < 0 || index >= this.getSize()) {
      throw new Error('Invalid index! No row at index: ' + index);
    }
    let node = this;
    while (node instanceof BTNode) {
      for (let i = 0;; i++) {
        let child = node.children[i], sz = child.getSize();
        if (index < sz) {
          node = child;
          break;
        }
        index -= sz;
      }
    }
    return node.rows[index];
  }

  getRowIndex(row: Row): number {
    if (row.parent == null) {
      throw new Error('Invalid row object! No parent node: (row.parent == null)');
    }
    let cur = row.parent, index = indexOf(row, cur.rows);
    for (let chunk = cur.parent; chunk; cur = chunk, chunk = chunk.parent) {
      for (let i = 0;; i++) {
        if (chunk.children[i] === cur) {
          break;
        }
        index += chunk.children[i].getSize();
      }
    }
    return index;
  }

  getIndexAtY(y: number): number {
    if (y < 0 || y > this.getHeight()) {
      throw new Error('Invalid y position! No row at y: ' + y);
    }

    let n = 0, height = y;
    let node = this;
    do {
      let ch = 0;
      for (let i = 0; i < node.children.length; i++) {
        let child = node.children[i];
        ch = child.getHeight();
        if (height < ch) {
          node = child;
          break;
        }
        height -= ch;
        n += child.getSize();
      }
      if (height >= ch) {
        return n;
      }
    } while (!node.rows);

    let i = 0;
    if (node instanceof BTLeaf) {
      for (; i < node.getSize(); i++) {
        let row = node.rows[i], rHeight = row.getHeight();
        if (height < rHeight) {
          break;
        }
        height -= rHeight;
      }
    }
    return n + i;
  }
  
  getYAtIndex(index: number): number {
    let row = this.getRow(index);
    if (row.parent == null) {
      throw new Error('Invalid row object! No parent node: (row.parent == null)');
    }

    let height = 0, chunk = row.parent;
    for (let i = 0; i < chunk.rows.length; i++) {
      let rowObj = chunk.rows[i];
      if (rowObj === row) {
        break;
      } else {
        height += rowObj.getHeight();
      }
    }
    for (let p = chunk.parent; p; chunk = p, p = chunk.parent) {
      for (let i = 0; i < p.children.length; i++) {
        let cur = p.children[i];
        if (cur === chunk) {
          break
        } else {
          height += cur.getHeight();
        }
      }
    }
    return height;
  }
}
