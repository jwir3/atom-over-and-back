'use babel';

/**
 * This class represents the state of a navigation operation. It has granularity
 * to the line level (i.e. {Waypoint}s can't be distinguished yet between one
 * another if they represent the same line, but different columns within that
 * line).
 */
export default class Waypoint {
  constructor(fileName, lineNumber) {
    this.lineNumber = lineNumber;
    this.fileName = fileName;
  }

  toString() {
    return this.fileName + ":" + this.lineNumber;
  }

  equals(aOther) {
    return aOther !== null
           && this.fileName === aOther.fileName
           && this.lineNumber === aOther.lineNumber;
  }

  static merge(leastRecent, mostRecent) {
    let finalArray = [];

    if (leastRecent == null && mostRecent != null) {
      finalArray.push(mostRecent);
    } else if(leastRecent != null && mostRecent == null) {
      finalArray.push(leastRecent);
    } else if (leastRecent.fileName === mostRecent.fileName
               && Math.abs(leastRecent.lineNumber - mostRecent.lineNumber) <= 1) {
        finalArray.push(mostRecent);
    } else {
      finalArray.push(leastRecent);
      finalArray.push(mostRecent);
    }

    return finalArray;
  }
}
