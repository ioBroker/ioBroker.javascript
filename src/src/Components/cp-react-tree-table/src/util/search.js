// @flow
import Row from '../model/row';
import BTRoot from '../model/bt_root';
import type { TreeDataRow  } from '../model/row';


export const findNodeData = (root: BTRoot, dataNode: TreeDataRow): ?Row => {
  let result;

  root.mapAll((row: Row) => {
    if (dataNode.data === row.data) {
      result = row;
      return true;
    }
  });
  return result;
}
