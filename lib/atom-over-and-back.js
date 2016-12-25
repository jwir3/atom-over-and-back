'use babel';

import AtomOverAndBackView from './atom-over-and-back-view';
import { CompositeDisposable } from 'atom';

export default {

  subscriptions: null,
  waypointsBack: [],
  currentWaypoint: null,
  waypointsForward: [],
  suppressWaypointConstruction: false,

  activate(state) {
    var self = this;

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      // 'tree-view:open-selected-entry': () => this.fileOpened(),
      // 'tree-view:expand-directory': () => this.fileOpened(),
      // 'atom-over-and-back:toggle': () => this.toggle(),
      'atom-over-and-back:navigate-forward': () => this.navigateForward(),
      'atom-over-and-back:navigate-backward': () => this.navigateBackward()
    }));

    self.didOpen = atom.workspace.onDidOpen((item) => {
      self.createWaypointForItem(item);
    });
  },

  createWaypointForItem(item) {
    var self = this;
    var waypointForItem = new Waypoint(item.uri, 0);
    self.addWaypoint(waypointForItem);
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.atomOverAndBackView.destroy();
    self.didOpen.dispose();
  },

  // serialize() {
  //   return {
  //     atomOverAndBackViewState: this.atomOverAndBackView.serialize()
  //   };
  // },

  navigateForward() {
    var self = this;

    if (self.waypointsForward.length == 0) {
      return;
    }

    var waypoint = this.waypointsForward.pop();
    var uri = waypoint.fileName

    self.didOpen.dispose();
    atom.workspace.open(uri)
      .then(() => {
        self.didOpen = atom.workspace.onDidOpen((item) => {
          self.createWaypointForItem(item);
        });
      });
    if (self.currentWaypoint) {
      self.waypointsBack.push(self.currentWaypoint);
    }

    self.currentWaypoint = waypoint;

    self.displayWaypoints('foward', this.waypointsForward);
    self.displayWaypoints('backward', this.waypointsBack);
  },

  navigateBackward() {
    let self = this;

    if (self.waypointsBack.length == 0) {
      return;
    }

    let waypoint = this.waypointsBack.pop();
    let uri = waypoint.fileName

    self.didOpen.dispose();
    atom.workspace.open(uri)
    .then(() => {
      self.didOpen = atom.workspace.onDidOpen((item) => {
        self.createWaypointForItem(item);
      });
    });

    if (self.currentWaypoint) {
      self.waypointsForward.push(self.currentWaypoint);
    }

    self.currentWaypoint = waypoint;

    self.displayWaypoints('foward', self.waypointsForward);
    self.displayWaypoints('backward', self.waypointsBack);
  },

  addWaypoint(waypoint) {
    var self = this;

    if (self.currentWaypoint) {
      self.waypointsBack.push(self.currentWaypoint);
    }

    self.currentWaypoint = waypoint;
    self.waypointsForward = [];
  },

  displayWaypoints(waypointStackName, waypointStack) {
    if (!waypointStack) {
      console.log(waypointStackName + " is empty");
      return;
    }

    for (var i = 0; i < waypointStack.length; i++) {
      console.log(`${waypointStackName}[${i}]: ${waypointStack[i].fileName}`);
    }
  }
};

class Waypoint {
  constructor(fileName, lineNumber) {
    this.lineNumber = lineNumber;
    this.fileName = fileName;
  }
}
