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
      // 'tree-view:open-selected-entry': () => this.fileOpened(),
      // 'tree-view:expand-directory': () => this.fileOpened(),
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
    if (event.uri) {
      path = event.uri;
      lineNo = event.item.getCursorBufferPosition().row;
    }

    if (event.newBufferPosition) {
      lineNo = event.newBufferPosition.row;
      if (self.currentWaypoint) {
        path = self.currentWaypoint.fileName;
      }
    }

    if (!self.currentWaypoint
        || self.currentWaypoint.fileName !== path
        || Math.abs(self.currentWaypoint.lineNumber - lineNo) > 0) {
      return true;
    }

    return false;
  },

  createWaypointForItem(event) {
    var self = this;

    var workspace = atom.workspace;

    let oldPositionWaypoint = self.currentWaypoint;
    let newPositionWaypoint = null;
    if (event.uri) {
      let line = event.item.getCursorBufferPosition().row;
      newPositionWaypoint = new Waypoint(event.uri, line);
    }

    if (event.oldBufferPosition) {
      let line = event.oldBufferPosition.row;
      let path = event.cursor.editor.getPath();
      // oldPositionWaypoint = new Waypoint(path, line);
      newPositionWaypoint = new Waypoint(path, event.newBufferPosition.row);
    }

    // Once in a while, we get a duplicate waypoint here, which is not optimal,
    // but should be ignored.
    // let backLength = self.waypointsBack.length;
    // let lastWaypoint = backLength != 0
      // ? self.waypointsBack[backLength - 1]
      // : null;
    if (oldPositionWaypoint) {
      // && lastWaypoint !== null
      // && !lastWaypoint.equals(self.currentWaypoint)) {
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
      iteration++;
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

  // serialize() {
  //   return {
  //     atomOverAndBackViewState: this.atomOverAndBackView.serialize()
  //   };
  // },

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

      atom.workspace.open(uri, {
        'initialLine': waypoint.lineNumber
      })
        .then(() => {
          self.didOpen = atom.workspace.onDidOpen((item) => {
            self.createWaypointForItem(item);
          });

          resolve();
        });
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

      atom.workspace.open(uri, {
        'initialLine': waypoint.lineNumber
      })
      .then(() => {
        self.didOpen = atom.workspace.onDidOpen((item) => {
          self.createWaypointForItem(item);
        });

        resolve();
      });
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
    console.log(`current: ${this.currentWaypoint.fileName}:${this.currentWaypoint.lineNumber}`);
    this.displayWaypoints('backward', this.waypointsBack);
  },

  displayWaypoints(waypointStackName, waypointStack) {
    if (!waypointStack) {
      console.log(waypointStackName + " is empty");
      return;
    }

    for (var i = 0; i < waypointStack.length; i++) {
      console.log(`${waypointStackName}[${i}]: ${waypointStack[i].fileName}:${waypointStack[i].lineNumber}`);
    }
  },

  peekWaypoint() {
    let self = this;

    if (!self.waypointsBack || self.waypointsBack.length == 0) {
      return null;
    }

    return self.waypointsBack[self.waypointsBack.length - 1];
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
