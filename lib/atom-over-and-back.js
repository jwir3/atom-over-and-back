'use babel';

import AtomOverAndBackView from './atom-over-and-back-view';
import { CompositeDisposable } from 'atom';

export default {

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
        self.createWaypointIfNecessary(event);
      }));
    });

    self.didOpen = atom.workspace.onDidOpen((event) => {
      self.createWaypointIfNecessary(event);
    });
  },

  toggle() {
    let self = this;
    self.enabled = !self.enabled;
  },

  isEnabled() {
    let self = this;
    return self.enabled;
  },

  createWaypointIfNecessary(event) {
    let self = this;

    // Don't do anything if we're disabled.
    if (!self.isEnabled()) {
      return;
    }

    if (self.shouldCreateWaypoint(event)) {
      self.createWaypointForItem(event);
    }
  },

  shouldCreateWaypoint(event) {
    let self = this;

    // We want to create a waypoint if this item represents a new file, or if
    // the distance between lines is > 5, but only if this wasn't triggered by
    // a navigation event.
    if (self.navigationActivated) {
      self.navigationActivated = false;
      return false;
    }

    if (event.oldBufferPosition) {
      return Math.abs(event.oldBufferPosition.row - event.newBufferPosition.row) > 5;
    } else if (event.uri) {
      return true;
    }
  },

  createWaypointForItem(event) {
    var self = this;

    var workspace = atom.workspace;

    let oldPositionWaypoint = self.currentWaypoint;
    let newPositionWaypoint = null;
    if (event.uri && !event.uri.startsWith('atom:')) {
      let line = event.item.getCursorBufferPosition().row;
      newPositionWaypoint = new Waypoint(event.uri, line);
    }

    if (event.oldBufferPosition) {
      let line = event.oldBufferPosition.row;
      let path = event.cursor.editor.getPath();
      oldPositionWaypoint = new Waypoint(path, line);
      newPositionWaypoint = new Waypoint(path, event.newBufferPosition.row);
    }

    if (oldPositionWaypoint) {
      self.addWaypoint(oldPositionWaypoint);
    }

    self.currentWaypoint = newPositionWaypoint;
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
      // self.displayWaypoints('backward', self.waypointsBack);
      if (self.waypointsBack.length == 0) {
        reject('no waypoints backward');
      }

      self.navigationActivated = true;

      let waypoint = self.waypointsBack.pop();
      let uri = waypoint.fileName

      self.didOpen.dispose();
      if (self.currentWaypoint) {
        self.waypointsForward.push(self.currentWaypoint);
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
    self.waypointsForward = [];
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

  setEnabled(aEnabled) {
    let self = this;
    self.enabled = aEnabled;
  },

  getNumWaypoints() {
    let self = this;
    return self.waypointsBack.length + self.waypointsForward.length;
  }
};

class Waypoint {
  constructor(fileName, lineNumber) {
    this.lineNumber = lineNumber;
    this.fileName = fileName;
  }
}
