'use babel';

import AtomOverAndBack from '../lib/atom-over-and-back';
import { FixtureLoader } from './utils';

let workspaceElement, activationPromise, fixtureLoader, fixtureFileData;

function getEditorForFile(filename) {
  let overAndBack = atom.packages.getActivePackage('atom-over-and-back').mainModule;
  let wasEnabled = overAndBack.isEnabled();
  overAndBack.setEnabled(false);
  for (let teIdx in atom.workspace.getTextEditors()) {
    let nextEditor = atom.workspace.getTextEditors()[teIdx];
    if (nextEditor.getTitle() == filename) {
      overAndBack.setEnabled(wasEnabled);
      return nextEditor;
    }
  }

  overAndBack.setEnabled(wasEnabled);
  return null;
}

function getEditorWithGreekLetters(forceEnable) {
  return getEditorForFile('greek-letters.txt');
}

function getEditorWithOzymandias() {
  return getEditorForFile('ozymandias.txt');
}

function getEditorWithTheRaven() {
  return getEditorForFile('the-raven.txt');
}

function setupTestFramework() {
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

      let numOpenTabs = 0;
      for (let pathIdx in paths) {
        let overAndBack = atom.packages.getActivePackage('atom-over-and-back').mainModule;
        // Disable the package for initial loading.
        overAndBack.setEnabled(false);
        let nextPath = paths[pathIdx];
        waitsForPromise(() => {
          return atom.workspace.open(nextPath).then(() => {
            numOpenTabs++;
            if (numOpenTabs == paths.length) {
              overAndBack.clearWaypoints();
              overAndBack.setEnabled(true);
            }
          });
        });
      }
    });
  });

  waitsForPromise(() => {
    return activationPromise;
  });
}
// Use the command `window:run-package-specs` (cmd-alt-ctrl-p) to run specs.
//
// To run a specific `it` or `describe` block add an `f` to the front (e.g. `fit`
// or `fdescribe`). Remove the `f` to unfocus the block.

describe('when the test framework is set up', () => {
  beforeEach(() => {
    setupTestFramework();
  });

  it ('should open each of the files in the fixtures directory as a new text editor', () => {
    jasmine.attachToDOM(workspaceElement);

    expect(atom.workspace.getTextEditors().length).toBe(3);

    expect(getEditorWithGreekLetters()).not.toBe(null);
    expect(getEditorWithGreekLetters().getLineCount()).toBe(11);

    expect(getEditorWithOzymandias()).not.toBe(null);
    expect(getEditorWithOzymandias().getLineCount()).toBe(15);

    expect(getEditorWithTheRaven()).not.toBe(null);
    expect(getEditorWithTheRaven().getLineCount()).toBe(126);
  });
});

describe('basic functionality', () => {
  beforeEach(() => {
    setupTestFramework();
  });

  it ('should not add a waypoint when navigating if the plugin is disabled', () => {
    jasmine.attachToDOM(workspaceElement);

    let overAndBack = atom.packages.getActivePackage('atom-over-and-back').mainModule;
    expect(overAndBack.isEnabled()).toBe(true);
    expect(overAndBack.getNumWaypoints()).toBe(0);

    atom.commands.dispatch(workspaceElement, 'atom-over-and-back:toggle');
    expect(overAndBack.isEnabled()).toBe(false);
    expect(overAndBack.getNumWaypoints()).toBe(0);

    var greekLetterEditor = getEditorWithGreekLetters();
    greekLetterEditor.moveDown(6);
    expect(overAndBack.getNumWaypoints()).toBe(0);
  });

  it ('should add a waypoint when navigating > 5 lines if the plugin is enabled', () => {
    jasmine.attachToDOM(workspaceElement);

    let overAndBack = atom.packages.getActivePackage('atom-over-and-back').mainModule;
    overAndBack.setEnabled(true);
    expect(overAndBack.isEnabled()).toBe(true);

    var greekLetterEditor = getEditorWithGreekLetters();
    greekLetterEditor.moveDown(6);

    expect(overAndBack.getNumWaypoints()).toBe(1);
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

    let overAndBack = atom.packages.getActivePackage('atom-over-and-back').mainModule;
    overAndBack.setEnabled(true);
    expect(overAndBack.isEnabled()).toBe(true);

    var greekLetterEditor = getEditorWithGreekLetters();
    greekLetterEditor.moveToTop();
    greekLetterEditor.moveDown(10);
    greekLetterEditor.moveUp(6);
    greekLetterEditor.moveDown(6);
    expect(greekLetterEditor.getCursorBufferPosition().row).toBe(10);
    expect(overAndBack.getNumWaypoints()).toBe(3);
    waitsForPromise(() => {
      return overAndBack.navigateBackward().then(() => {
        expect(greekLetterEditor.getCursorBufferPosition().row).toBe(4);
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

    let overAndBack = atom.packages.getActivePackage('atom-over-and-back').mainModule;
    overAndBack.setEnabled(true);
    expect(overAndBack).toBeDefined();
    expect(overAndBack.isEnabled()).toBe(true);

    var ravenEditor = getEditorWithTheRaven();
    ravenEditor.moveToTop();
    ravenEditor.moveDown(6);
    ravenEditor.moveDown(10);
    expect(ravenEditor.getCursorBufferPosition().row).toBe(16);
    expect(overAndBack.getNumWaypoints()).toBe(2);
    waitsForPromise(() => {
      return overAndBack.navigateBackward().then(() => {
        expect(ravenEditor.getCursorBufferPosition().row).toBe(6);
        expect(overAndBack.getNumWaypoints()).toBe(2);
        waitsForPromise(() => {
            return overAndBack.navigateForward().then(() => {
              expect(ravenEditor.getCursorBufferPosition().row).toBe(16);
            });
        });
      });
    });
  });

  it ('should be able to navigate forward and backward within a file multiple times', () => {
    jasmine.attachToDOM(workspaceElement);

    let overAndBack = atom.packages.getActivePackage('atom-over-and-back').mainModule;
    expect(overAndBack).toBeDefined();
    overAndBack.setEnabled(true);
    expect(overAndBack.isEnabled()).toBe(true);

    var ravenEditor = getEditorWithTheRaven();
    var originalPosition = ravenEditor.getCursorBufferPosition();
    ravenEditor.moveDown(20);
    ravenEditor.moveDown(24);
    ravenEditor.moveDown(34);

    waitsForPromise(() => {
      return overAndBack.navigateBackward().then(() => {
        expect(ravenEditor.getCursorBufferPosition().row).toBe(44);

        waitsForPromise(() => {
          return overAndBack.navigateForward().then(() => {
            expect(ravenEditor.getCursorBufferPosition().row).toBe(78);

            waitsForPromise(() => {
              return overAndBack.navigateBackward().then(() => {
                waitsForPromise(() => {
                  return overAndBack.navigateBackward().then(() => {
                    expect(ravenEditor.getCursorBufferPosition().row).toBe(20);
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  it ('should be able to navigate backward between files', () => {
    jasmine.attachToDOM(workspaceElement);

    let overAndBack = atom.packages.getActivePackage('atom-over-and-back').mainModule;
    expect(overAndBack).toBeDefined();

    overAndBack.setEnabled(false);

    let ravenEditor = getEditorWithTheRaven();
    let greekLetterEditor = getEditorWithGreekLetters();

    overAndBack.setEnabled(true);
    expect(overAndBack.isEnabled()).toBe(true);

    waitsForPromise(() => {
      return atom.workspace.open(greekLetterEditor.getPath(), {
        'initialLine': 7
      }).then((editor) => {
        expect(editor).toBe(atom.workspace.getActiveTextEditor());
        expect(overAndBack.getNumWaypoints()).toBe(1);

        waitsForPromise(() => {
          return atom.workspace.open(ravenEditor.getPath(), {
            'initialLine': 37
          }).then((secondEditor) => {
            expect(secondEditor).toBe(atom.workspace.getActiveTextEditor());
            expect(overAndBack.getNumWaypoints()).toBe(2);
            expect(atom.workspace.getActiveTextEditor().getCursorBufferPosition().row).toBe(37);
            waitsForPromise(() => {
              return overAndBack.navigateBackward().then(() => {
                expect(atom.workspace.getActiveTextEditor().getPath()).toBe(editor.getPath());
                expect(editor.getCursorBufferPosition().row).toBe(7);
              });
            });
          });
        });
      });
    });
  });

  it ('should be able to navigate forward between files', () => {
    jasmine.attachToDOM(workspaceElement);

    let overAndBack = atom.packages.getActivePackage('atom-over-and-back').mainModule;
    expect(overAndBack).toBeDefined();

    overAndBack.setEnabled(false);

    let ravenEditor = getEditorWithTheRaven();
    let greekLetterEditor = getEditorWithGreekLetters();

    overAndBack.setEnabled(true);
    expect(overAndBack.isEnabled()).toBe(true);

    waitsForPromise(() => {
      return atom.workspace.open(greekLetterEditor.getPath(), {
        'initialLine': 7
      }).then((editor) => {
        expect(editor).toBe(atom.workspace.getActiveTextEditor());
        expect(overAndBack.getNumWaypoints()).toBe(1);

        waitsForPromise(() => {
          return atom.workspace.open(ravenEditor.getPath(), {
            'initialLine': 37
          }).then((secondEditor) => {
            expect(secondEditor).toBe(atom.workspace.getActiveTextEditor());
            expect(overAndBack.getNumWaypoints()).toBe(2);
            expect(atom.workspace.getActiveTextEditor().getCursorBufferPosition().row).toBe(37);
            waitsForPromise(() => {
              return overAndBack.navigateBackward().then(() => {
                expect(atom.workspace.getActiveTextEditor().getPath()).toBe(editor.getPath());
                expect(editor.getCursorBufferPosition().row).toBe(7);

                waitsForPromise(() => {
                  return overAndBack.navigateForward().then(() => {
                    expect(atom.workspace.getActiveTextEditor().getPath()).toBe(secondEditor.getPath());
                    expect(atom.workspace.getActiveTextEditor().getCursorBufferPosition().row).toBe(37);
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});
