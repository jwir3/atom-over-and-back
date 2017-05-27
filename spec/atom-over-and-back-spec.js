'use babel';

import AtomOverAndBack from '../lib/atom-over-and-back';
import { FixtureLoader } from './utils';

function getEditorWithGreekLetters() {
  for (let teIdx in atom.workspace.getTextEditors()) {
    let nextEditor = atom.workspace.getTextEditors()[teIdx];
    if (nextEditor.getTitle() == 'greek-letters.txt') {
      return nextEditor;
    }
  }

  return null;
}

// Use the command `window:run-package-specs` (cmd-alt-ctrl-p) to run specs.
//
// To run a specific `it` or `describe` block add an `f` to the front (e.g. `fit`
// or `fdescribe`). Remove the `f` to unfocus the block.

describe('when the test framework is set up', () => {
  let workspaceElement, activationPromise, fixtureLoader, fixtureFileData;

  beforeEach(() => {
    workspaceElement = atom.views.getView(atom.workspace);
    activationPromise = atom.packages.activatePackage('atom-over-and-back');
    fixtureLoader = new FixtureLoader((fileData) => {
      fixtureFileData = fileData;
    });

    waitsForPromise(() => {
      return fixtureLoader.getPromise().then(() => {
        let keys = Object.keys(fixtureFileData);
        let paths = [];
        for (let keyIdx in keys) {
          paths.push(fixtureFileData[keys[keyIdx]].path);
        }

        for (let pathIdx in paths) {
          let nextPath = paths[pathIdx];
          let numOpenTabs = 0;
          waitsForPromise(() => {
            return atom.workspace.open(nextPath);
          });
        }
      });
    });

    waitsForPromise(() => {
      return activationPromise;
    });
  });

  it ('should open each of the files in the fixtures directory as a new text editor', () => {
    jasmine.attachToDOM(workspaceElement);

    expect(atom.workspace.getTextEditors().length).toBe(1);

    expect(getEditorWithGreekLetters()).not.toBe(null);
    expect(getEditorWithGreekLetters().getLineCount()).toBe(11);
  });

  it ('should not add a waypoint when navigating if the plugin is disabled', () => {
    jasmine.attachToDOM(workspaceElement);

    let overAndBack = atom.packages.getActivePackage('atom-over-and-back');
    expect(overAndBack).toBeDefined();
    expect(overAndBack.mainModule.isEnabled()).toBe(true);

    atom.commands.dispatch(workspaceElement, 'atom-over-and-back:toggle');
    expect(overAndBack.mainModule.isEnabled()).toBe(false);
    expect(overAndBack.mainModule.getNumWaypoints()).toBe(0);

    var greekLetterEditor = getEditorWithGreekLetters();
    greekLetterEditor.moveDown(6);
    expect(overAndBack.mainModule.getNumWaypoints()).toBe(0);
  });

  it ('should add a waypoint when navigating > 5 lines if the plugin is enabled', () => {
    jasmine.attachToDOM(workspaceElement);

    let overAndBack = atom.packages.getActivePackage('atom-over-and-back');
    overAndBack.mainModule.setEnabled(true);
    expect(overAndBack).toBeDefined();
    expect(overAndBack.mainModule.isEnabled()).toBe(true);

    var greekLetterEditor = getEditorWithGreekLetters();
    greekLetterEditor.moveDown(6);

    expect(overAndBack.mainModule.getNumWaypoints()).toBe(1);
  });

  it ("should not navigate backwards if there are no waypoints", () => {
    jasmine.attachToDOM(workspaceElement);

    let overAndBack = atom.packages.getActivePackage('atom-over-and-back');
    overAndBack.mainModule.setEnabled(true);
    expect(overAndBack).toBeDefined();
    expect(overAndBack.mainModule.isEnabled()).toBe(true);

    var greekLetterEditor = getEditorWithGreekLetters();
    var originalPosition = greekLetterEditor.getCursorBufferPosition();
    waitsForPromise(() => {
      return overAndBack.mainModule.navigateBackward().catch((reason) => {
        expect(reason).toBe('no waypoints backward');
      });
    });
  });

  it ("should navigate backwards if there is a valid waypoint and it's requested", () => {
    jasmine.attachToDOM(workspaceElement);

    let overAndBack = atom.packages.getActivePackage('atom-over-and-back');
    overAndBack.mainModule.setEnabled(true);
    expect(overAndBack).toBeDefined();
    expect(overAndBack.mainModule.isEnabled()).toBe(true);

    var greekLetterEditor = getEditorWithGreekLetters();
    var originalPosition = greekLetterEditor.getCursorBufferPosition();
    greekLetterEditor.moveDown(10);
    expect(greekLetterEditor.getCursorBufferPosition().row).toBe(10);
    expect(overAndBack.mainModule.getNumWaypoints()).toBe(1);
    waitsForPromise(() => {
      return overAndBack.mainModule.navigateBackward().then(() => {
        expect(originalPosition.row).toBe(greekLetterEditor.getCursorBufferPosition().row);
      });
    });
  });

  it ("should not be able to navigate forward if there are no waypoints", () => {
    jasmine.attachToDOM(workspaceElement);

    let overAndBack = atom.packages.getActivePackage('atom-over-and-back');
    overAndBack.mainModule.setEnabled(true);
    expect(overAndBack).toBeDefined();
    expect(overAndBack.mainModule.isEnabled()).toBe(true);

    var greekLetterEditor = getEditorWithGreekLetters();
    var originalPosition = greekLetterEditor.getCursorBufferPosition();
    waitsForPromise(() => {
      return overAndBack.mainModule.navigateForward().catch((reason) => {
        expect(reason).toBe('no waypoints forward');
      });
    });
  });

  it ("should be able to navigate forward after having navigated backward", () => {
    jasmine.attachToDOM(workspaceElement);

    let overAndBack = atom.packages.getActivePackage('atom-over-and-back');
    overAndBack.mainModule.setEnabled(true);
    expect(overAndBack).toBeDefined();
    expect(overAndBack.mainModule.isEnabled()).toBe(true);

    var greekLetterEditor = getEditorWithGreekLetters();
    var originalPosition = greekLetterEditor.getCursorBufferPosition();
    greekLetterEditor.moveDown(10);
    expect(greekLetterEditor.getCursorBufferPosition().row).toBe(10);
    expect(overAndBack.mainModule.getNumWaypoints()).toBe(1);
    waitsForPromise(() => {
      return overAndBack.mainModule.navigateBackward().then(() => {
        expect(originalPosition.row).toBe(greekLetterEditor.getCursorBufferPosition().row);
        expect(overAndBack.mainModule.getNumWaypoints()).toBe(1);
        waitsForPromise(() => {
            return overAndBack.mainModule.navigateForward().then(() => {
              expect(greekLetterEditor.getCursorBufferPosition().row).toBe(10);
            });
        });
      });
    });
  });
});
