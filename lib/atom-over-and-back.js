'use babel';

import AtomOverAndBackView from './atom-over-and-back-view';
import { CompositeDisposable } from 'atom';
import Waypoint from './Waypoint';

export default {

  debug: false,
  enabled: true,
  subscriptions: null,
  waypointsBack: [],
  currentWaypoint: null,
  waypointsForward: [],
  suppressWaypointConstruction: false,
  navigationActivated: false,

  activate(state) {
    var self = this;

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'atom-over-and-back:toggle': () => this.toggle(),
      'atom-over-and-back:navigate-forward': () => this.navigateForward(),
      'atom-over-and-back:navigate-backward': () => this.navigateBackward()
    }));

    atom.workspace.observeTextEditors((editor) => {
      self.subscriptions.add(editor.onDidChangeCursorPosition((event) => {
        if (self.shouldCreateWaypoint(event)) {
          self.createWaypointForItem(event);
        }
      }));
    });

    self.didOpen = atom.workspace.onDidOpen((event) => {
      if (event.uri && event.uri.startsWith('atom://')) {
        return;
      }

      if (self.shouldCreateWaypoint(event)) {
        self.createWaypointForItem(event);
      }
    });

    // Register for tab closures and opens so that we can make sure that we
    // clean up our history for tabs that are beyond the tab that was closed
    // or opened.
    self.subscriptions.add(atom.workspace.getActivePane().onDidRemoveItem((event) => {
      self.updateWaypointsForTabChange(event.index, -1);
    }));

    self.subscriptions.add(atom.workspace.getActivePane().onDidAddItem((event) => {
      self.updateWaypointsForTabChange(event.index, 1);
    }));
  },

  toggle() {
    let self = this;
    self.enabled = !self.enabled;
  },

  setDebugEnabled(d) {
    this.debug = d;
  },

  isEnabled() {
    let self = this;
    return self.enabled;
  },

  setEnabled(aEnabled) {
    let self = this;
    // Dump all of our waypoints if we're switched off then back on.
    if (self.isEnabled() && !aEnabled) {
      self.clearWaypoints();
    }
    self.enabled = aEnabled;
  },

  shouldCreateWaypoint(event) {
    let self = this;

    // console.log("oAB enabled? " + self.isEnabled());
    if (!self.isEnabled()) {
      return false;
    }

    // We want to create a waypoint if this item represents a new file, or if
    // the distance between lines is > 5, but only if this wasn't triggered by
    // a navigation event.
    if (self.navigationActivated) {
      self.navigationActivated = false;
      return false;
    }

    let path = null;
    let lineNo = 0;
    let tabIndex = -1;
    if (event.uri) {
      path = event.uri;
      lineNo = event.item.getCursorBufferPosition().row;
    } else {
      tabIndex = event.tabIndex;
    }

    if (event.newBufferPosition) {
      lineNo = event.newBufferPosition.row;
      if (self.currentWaypoint) {
        path = self.currentWaypoint.fileName;
      }
    }

    if (!self.currentWaypoint
      || self.currentWaypoint.fileName !== path
      || self.currentWaypoint.tabIndex !== tabIndex
      || Math.abs(self.currentWaypoint.lineNumber - lineNo) > 0) {
      return true;
    }

    return false;
  },

  createWaypointForItem(event) {
    var self = this;

    var workspace = atom.workspace;

    var tabIndex = -1;

    let oldPositionWaypoint = self.currentWaypoint;
    let newPositionWaypoint = null;
    if (event.uri) {
      if (event.item && event.item.getCursorBufferPosition === 'function') {
        let line = event.item.getCursorBufferPosition().row;
        newPositionWaypoint = new Waypoint(event.uri, tabIndex, line);
      }
    } else {
      // If the event doesn't have a URI, then it's not a saved file on the
      // filesystem, yet. As such, we should save the tab index so we know
      // which tab to go back _to_.
      tabIndex = event.index;
    }

    if (event.oldBufferPosition) {
      let line = event.oldBufferPosition.row;
      let path = event.cursor.editor.getPath();
      let newTabIndex = -1;

      if (!path) {
        let activePane = atom.workspace.getActivePane();
        newTabIndex = activePane.getActiveItemIndex();
      }

      newPositionWaypoint = new Waypoint(path, newTabIndex, event.newBufferPosition.row);
    } else {
      // This is the case where a new tab was opened but nothing actually changed
      // within it. Once changes are made, this waypoint will be updated.
      newPositionWaypoint = new Waypoint(null, event.index, 0);
    }

    if (oldPositionWaypoint) {
      self.addWaypoint(oldPositionWaypoint);
    }

    self.currentWaypoint = newPositionWaypoint;

    self.coalesceWaypoints();
  },

  coalesceWaypointArray(waypointArray) {
    var coalesced;
    var initialElement;
    var nextCheckedElement;
    var mergedWaypointArray;

    if (waypointArray.length <= 1) {
      return waypointArray;
    }

    coalesced = [];
    initialElement = waypointArray[0];
    coalesced.push(initialElement);

    nextCheckedElement = 1;

    while (nextCheckedElement < waypointArray.length) {
      mergedWaypointArray = Waypoint.merge(coalesced[coalesced.length - 1],
        waypointArray[nextCheckedElement]);
      if (coalesced.length > 1) {
        coalesced.pop();
      }

      mergedWaypointArray.forEach((a) => {
        if (!coalesced[coalesced.length - 1].equals(a)) {
          coalesced.push(a);
        }
      });

      nextCheckedElement++;
    }

    return coalesced;
  },

  coalesceWaypoints() {
    let self = this;

    if (self.waypointsBack.length <= 1) {
      // Nothing to coalesce
      return;
    }

    let allWaypoints = [];
    if (self.waypointsBack) {
      allWaypoints = Array.from(self.waypointsBack);
    }

    if (self.currentWaypoint) {
      allWaypoints.push(self.currentWaypoint);
    }

    let coalescedWaypoints = self.coalesceWaypointArray(allWaypoints);

    if (coalescedWaypoints.length > 0) {
      self.currentWaypoint = coalescedWaypoints.pop();
    }

    self.waypointsBack = coalescedWaypoints;
  },

  deactivate() {
    let self = this;

    self.currentWaypoint = null;
    self.waypointsForward = [];
    self.waypointsBack = [];

    // this.modalPanel.destroy();
    if (self.subscriptions) {
      this.subscriptions.dispose();
    }
    // this.atomOverAndBackView.destroy();
    if (self.didOpen) {
      self.didOpen.dispose();
    }
  },

  navigateForward() {
    var self = this;

    return new Promise((resolve, reject) => {
      if (self.waypointsForward.length == 0) {
        reject("no waypoints forward");
      }

      self.navigationActivated = true;

      var waypoint = self.waypointsForward.pop();
      var uri = waypoint.fileName

      self.didOpen.dispose();

      if (self.currentWaypoint) {
        self.waypointsBack.push(self.currentWaypoint);
      }

      self.currentWaypoint = waypoint;

      let callback = () => {
        self.didOpen = atom.workspace.onDidOpen((item) => {
          self.createWaypointForItem(item);
        });

        resolve();
      };

      if (uri) {
        atom.workspace.open(uri, {
          'initialLine': waypoint.lineNumber
        }).then(callback);
        } else {
          atom.workspace.getActivePane().activateItemAtIndex(waypoint.tabIndex);
          callback();
        }
    });
  },

  navigateBackward() {
    let self = this;

    return new Promise((resolve, reject) => {
      if (self.waypointsBack.length == 0) {
        reject('no waypoints backward');
      }

      self.navigationActivated = true;

      let waypoint = self.waypointsBack.pop();
      if (self.debug) {
        console.log("Popped backward waypoint is: " + waypoint);
      }

      let uri = waypoint.fileName

      self.didOpen.dispose();
      if (self.currentWaypoint) {
        self.waypointsForward.push(self.currentWaypoint);
      }

      if (self.debug) {
        console.log("Setting current waypoint to: " + waypoint);
      }

      self.currentWaypoint = waypoint;

      let callback = () => {
        self.didOpen = atom.workspace.onDidOpen((item) => {
          self.createWaypointForItem(item);
        });

        resolve();
      };

      if (uri) {
        atom.workspace.open(uri, {
          'initialLine': waypoint.lineNumber
        }).then(callback);
      } else {
        atom.workspace.getActivePane().activateItemAtIndex(waypoint.tabIndex);
        callback();
      }
    });
  },

  addWaypoint(waypoint) {
    var self = this;

    self.waypointsBack.push(waypoint);
  },

  clearWaypoints() {
    var self = this;
    self.currentWaypoint = null;
    self.waypointsForward = [];
    self.waypointsBack = [];
    self.navigationActivated = false;
  },

  displayAllWaypoints() {
    console.log("total waypoints: " + this.getNumWaypoints());
    this.displayWaypoints('forward', this.waypointsForward);
    if (this.currentWaypoint) {
      console.log(`current: ${this.currentWaypoint.toString()}`);
    }
    this.displayWaypoints('backward', this.waypointsBack);
  },

  displayWaypoints(waypointStackName, waypointStack) {
    if (!waypointStack) {
      console.log(waypointStackName + " is empty");
      return;
    }

    for (var i = 0; i < waypointStack.length; i++) {
      console.log(`${waypointStackName}[${i}]: ${waypointStack[i].toString()}`);
    }
  },

  peekWaypoint() {
    let self = this;

    if (!self.waypointsBack || self.waypointsBack.length == 0) {
      return null;
    }

    return self.waypointsBack[self.waypointsBack.length - 1];
  },

  updateWaypointsForTabChange(tabIndex, changeDirection=-1) {
    let self = this;

    if (self.waypointsBack) {
      let newWaypointsBackward = [];
      for (let i = 0; i < self.waypointsBack.length; i++) {
        let wp = self.waypointsBack[i];
        if ((changeDirection < 0 && wp.tabIndex !== tabIndex)
            || changeDirection > 0) {
          wp.adjustForChangedTab(tabIndex, changeDirection);
          newWaypointsBackward.push(wp);
        }
      }

      self.waypointsBack = newWaypointsBackward;
    }

    if (self.waypointsForward) {
      let newWaypointsForward = [];
      for (let i = 0; i < self.waypointsForward.length; i++) {
        let wp = self.waypointsForward[i]
        if ((changeDirection < 0 && wp.tabIndex !== tabIndex)
            || changeDirection > 0) {
          wp.adjustForChangedTab(tabIndex, changeDirection);
          newWaypointsForward.push(wp);
        }
      }

      self.waypointsForward = newWaypointsForward;
    }

    if (self.currentWaypoint) {
      // If the current waypoint was the tab that was closed, we should navigate
      // backwards if we can.
      if (changeDirection < 0 && self.currentWaypoint.tabIndex === tabIndex) {
        self.currentWaypoint = null;
        self.navigateBackward();
      } else {
        self.currentWaypoint.adjustForChangedTab(tabIndex, changeDirection);
      }

    }
  },

  getNumWaypoints() {
    let self = this;
    let count = 0;
    if (self.currentWaypoint) {
      count++;
    }

    return count + self.waypointsBack.length + self.waypointsForward.length;
  }
};
