// @flow
import Row from '../model/row';
import type { TreeDataRow  } from '../model/row';

export * from './search';


export const processData = (data: Array<TreeDataRow>, rowHeightDefault: ?number = null): Array<Row> => {
  return processLevel(data, rowHeightDefault, 0, true);
}

const processLevel = (data: Array<TreeDataRow>, rowHeightDefault: ?number, depth: number = 0, isVisible: boolean = false): Array<Row> => {
  let result: Array<Row> = [];
  for (var i = 0; i < data.length; i++) {
    const hasChildren: boolean = (data[i].children != null && data[i].children.length > 0);

    result.push(new Row(data[i].data, hasChildren, depth, isVisible, data[i].height || rowHeightDefault));

    if (data[i].children && data[i].children.length > 0) {
      processLevel(data[i].children, rowHeightDefault, depth + 1).forEach((row) => {
        result.push(row);
      });
    }
  }
  return result;
}

export const indexOf = (needle: any, haystack: Array<any>): number => {
  for (var i = 0; i < haystack.length; i++) {
    if (haystack[i] === needle) {
      return i;
    }
  }
  return -1;
}

export const noop = () => undefined;
