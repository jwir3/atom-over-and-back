'use babel';

/**
 * This class represents the state of a navigation operation. It has granularity
 * to the line level (i.e. {Waypoint}s can't be distinguished yet between one
 * another if they represent the same line, but different columns within that
 * line).
 */
export default class Waypoint {
  /**
   * Create a new Waypoint object.
   *
   * @param {String} fileName The name of the file, if it's an existing file.
   *        May be null for newly opened files.
   * @param {int} tabIndex The index of the tab in the editor, if this is a new
   *        file. May be -1 to indicate there is no index.
   * @param {int} lineNumber The line number that the cursor was last positioned
   *        at.
   */
  constructor(fileName, tabIndex, lineNumber) {
    this.lineNumber = lineNumber;
    this.fileName = fileName;
    this.tabIndex = tabIndex;
  }

  toString() {
    let descriptor = this.fileName;
    if (typeof descriptor === 'undefined' || descriptor === null) {
      descriptor = "Unsaved Tab @ " + this.tabIndex;
    }
    return descriptor + ":" + this.lineNumber;
  }

  equals(aOther) {
    return aOther !== null
           && this.fileName === aOther.fileName
           && this.tabIndex === aOther.tabIndex
           && this.lineNumber === aOther.lineNumber;
  }

  /**
   * Potentially adjust this Waypoint's tab index for a closed tab.
   *
   * If this `Waypoint` has a tabIndex that is greater than the index of a
   * closed tab, then this method will adjust the tab index of this Waypoint
   * to account for the tab to the left of it now being closed.
   *
   * @param  {int} tabIndexClosed The index of the tab that was closed.
   */
  adjustForChangedTab(tabIndex, changeAmount = -1) {
    let self = this;

    // NOTE: The tab added event happens BEFORE the waypoint is added for the
    //       new file. This means we don't have to worry about multiple tabs
    //       having the same index.
    if (self.tabIndex >= 0 && self.tabIndex >= tabIndex) {
      self.tabIndex = self.tabIndex + changeAmount;
    }
  }

  static merge(leastRecent, mostRecent) {
    let finalArray = [];

    if (leastRecent == null && mostRecent != null) {
      finalArray.push(mostRecent);
    } else if(leastRecent != null && mostRecent == null) {
      finalArray.push(leastRecent);
    } else if (leastRecent.fileName === mostRecent.fileName
               && leastRecent.tabIndex === mostRecent.tabIndex
               && Math.abs(leastRecent.lineNumber - mostRecent.lineNumber) <= 1) {
        finalArray.push(mostRecent);
    } else {
      finalArray.push(leastRecent);
      finalArray.push(mostRecent);
    }

    return finalArray;
  }
}
