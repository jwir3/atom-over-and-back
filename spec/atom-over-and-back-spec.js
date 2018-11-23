'use babel';

import AtomOverAndBack from '../lib/atom-over-and-back';
import Waypoint from '../lib/Waypoint';
import { FixtureLoader } from './utils';

let workspaceElement, activationPromise, fixtureLoader, fixtureFileData;

function initAndCheckOverAndBackModule() {
  jasmine.attachToDOM(workspaceElement);

  let overAndBack = atom.packages.getActivePackage('atom-over-and-back').mainModule;
  expect(overAndBack).toBeDefined();
  expect(overAndBack.isEnabled()).toBe(true);
  expect(overAndBack.getNumWaypoints()).toBe(0);

  overAndBack.setEnabled(false);

  return overAndBack;
}

function getEditorForFile(filename) {
  let overAndBack = atom.packages.getActivePackage('atom-over-and-back').mainModule;
  let wasEnabled = overAndBack.isEnabled();
  overAndBack.setEnabled(false);
  for (let teIdx in atom.workspace.getTextEditors()) {
    let nextEditor = atom.workspace.getTextEditors()[teIdx];
    if (nextEditor.getTitle() == filename) {
      atom.workspace.getActivePane().activateItemAtIndex(teIdx);
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

describe('when overAndBack module is initialized', () => {
  let overAndBack = null;

  beforeEach(() => {
    setupTestFramework();

    waitsFor(() => {
      return atom.packages.getActivePackage('atom-over-and-back') !=  null;
    });

    runs (() => {
      overAndBack = initAndCheckOverAndBackModule();

      overAndBack.setEnabled(true);
      expect(overAndBack.isEnabled()).toBe(true);
    });
  });

  describe ('with a single editor containing The Raven', () => {
    let ravenEditor = null;

    beforeEach(() => {
      ravenEditor = getEditorWithTheRaven();
    });

    describe ('with 3 valid waypoints', () => {
      beforeEach(() => {
        ravenEditor.moveDown(20);
        ravenEditor.moveDown(24);
        ravenEditor.moveDown(34);

        expect(overAndBack.getNumWaypoints()).toBe(3);
      });

      describe ('with a single backwards navigation', () => {
        beforeEach(() => {
          waitsForPromise(() => {
            return overAndBack.navigateBackward();
          });
        });

        describe ('with a single forwards navigation', () => {
          beforeEach(() => {
            expect(ravenEditor.getCursorBufferPosition().row).toBe(44);

            waitsForPromise(() => {
              return overAndBack.navigateForward();
            });
          });

          describe ('with a single backwards navigation', () => {
            beforeEach(() => {
              expect(ravenEditor.getCursorBufferPosition().row).toBe(78);

              waitsForPromise(() => {
                return overAndBack.navigateBackward();
              });
            });

            describe ('with a single backwards navigation', () => {
              beforeEach(() => {
                waitsForPromise(() => {
                  return overAndBack.navigateBackward();
                });
              });

              it ('should report being on row 20 of the editor with The Raven', () => {
                expect(ravenEditor.getCursorBufferPosition().row).toBe(20);
              });
            });
          });
        });
      });
    });

    describe('with 2 valid waypoints', () => {
      beforeEach(() => {
        ravenEditor.moveToTop();
        ravenEditor.moveDown(6);
        ravenEditor.moveDown(10);
        expect(ravenEditor.getCursorBufferPosition().row).toBe(16);
        expect(overAndBack.getNumWaypoints()).toBe(2);
      });

      describe ('with a single backwards navigation', () => {
        beforeEach(() => {
          waitsForPromise(() => {
            return overAndBack.navigateBackward();
          });
        });

        describe ('with a single forwards navigation', () => {
          beforeEach(() => {
            expect(ravenEditor.getCursorBufferPosition().row).toBe(6);
            expect(overAndBack.getNumWaypoints()).toBe(2);
            waitsForPromise(() => {
                return overAndBack.navigateForward();
            });
          });

          it ('should show the cursor in its original starting position', () => {
            expect(ravenEditor.getCursorBufferPosition().row).toBe(16);
          });
        });
      });
    });
  });

  describe('with a single editor containing greek letters', () => {
    let reasonGiven = null;
    let greekLetterEditor = null;

    beforeEach(() => {
      greekLetterEditor = getEditorWithGreekLetters();
    });

    it ('should add a waypoint when navigating > 5 lines', () => {
      greekLetterEditor.moveDown(6);

      expect(overAndBack.getNumWaypoints()).toBe(1);
    });

    describe ('with 3 valid waypoints', () => {
      beforeEach(() => {
        greekLetterEditor.moveToTop();
        greekLetterEditor.moveDown(10);
        greekLetterEditor.moveUp(6);
        greekLetterEditor.moveDown(6);

        expect(greekLetterEditor.getCursorBufferPosition().row).toBe(10);
        expect(overAndBack.getNumWaypoints()).toBe(3);
      });

      describe ('with backwards navigation', () => {
        beforeEach(() => {
          waitsForPromise(() => {
            return overAndBack.navigateBackward();
          });
        });

        it ('should show the waypoint as having been navigated to', () => {
          expect(greekLetterEditor.getCursorBufferPosition().row).toBe(4);
        });
      });
    });

    describe ('with no waypoints and attempted forwards navigation', () => {
      beforeEach(() => {
        var originalPosition = greekLetterEditor.getCursorBufferPosition();
        waitsForPromise(() => {
          return overAndBack.navigateForward().catch((reason) => {
            reasonGiven = reason;
          });
        });
      });

      it ("should report that no waypoints are available forward", () => {
        expect(reasonGiven).toBe('no waypoints forward');
      });
    });

    describe ('with no waypoints and attempted backwards navigation', () => {
      beforeEach(() => {
        var originalPosition = greekLetterEditor.getCursorBufferPosition();
        waitsForPromise(() => {
          return overAndBack.navigateBackward().catch((reason) => {
            reasonGiven = reason;
          });
        });
      });

      it ("should report that no waypoints are available backward", () => {
        expect(reasonGiven).toBe('no waypoints backward');
      });
    });

    describe('when overAndBack module is disabled', () => {
      beforeEach(() => {
        atom.commands.dispatch(workspaceElement, 'atom-over-and-back:toggle');

        waitsFor(() => {
          return !overAndBack.isEnabled();
        });

        runs(() => {
          expect(overAndBack.isEnabled()).toBe(false);
        });
      });

      it ('should not add a waypoint when navigating', () => {
        greekLetterEditor.moveDown(6);
        expect(overAndBack.getNumWaypoints()).toBe(0);
      });
    });

    describe ('with another editor containing The Raven and the editor containing greek letters at line 7', () => {
      let ravenEditor = null;
      beforeEach(() => {
        ravenEditor = getEditorWithTheRaven();

        waitsForPromise(() => {
          return atom.workspace.open(greekLetterEditor.getPath(), {
            'initialLine': 7
          });
        });
      });

      describe ('with editor containing The Raven at line 37', () => {
        beforeEach(() => {
          expect(greekLetterEditor).toBe(atom.workspace.getActiveTextEditor());
          expect(overAndBack.getNumWaypoints()).toBe(1);

          waitsForPromise(() => {
            return atom.workspace.open(ravenEditor.getPath(), {
              'initialLine': 37
            });
          });
        });

        describe ('after navigating backward', () => {
          beforeEach(() => {
            expect(ravenEditor).toBe(atom.workspace.getActiveTextEditor());
            expect(overAndBack.getNumWaypoints()).toBe(2);
            expect(atom.workspace.getActiveTextEditor().getCursorBufferPosition().row).toBe(37);
            waitsForPromise(() => {
              return overAndBack.navigateBackward();
            });
          });

          it ('should show the cursor to be on line 7 of the editor containing greek letters', () => {
            expect(atom.workspace.getActiveTextEditor().getPath()).toBe(greekLetterEditor.getPath());
            expect(atom.workspace.getActiveTextEditor().getCursorBufferPosition().row).toBe(7);
          });

          describe ('after navigating forward', () => {
            beforeEach(() => {
              waitsForPromise(() => {
                return overAndBack.navigateForward();
              });
            });

            it ('should show the cursor to be on line 37 of the editor containing The Raven', () => {
              expect(atom.workspace.getActiveTextEditor().getPath()).toBe(ravenEditor.getPath());
              expect(atom.workspace.getActiveTextEditor().getCursorBufferPosition().row).toBe(37);
            });
          });
        });
      });
    });

    describe ('after opening a new editor that has not been saved', () => {
      let unsavedEditor = null;
      beforeEach(() => {
        waitsForPromise(() => {
          return atom.workspace.open();
        });
      });

      describe('after adding the text of Jamaica Mistaka to the new editor', () => {
        beforeEach(() => {
          let editor = atom.workspace.getActiveTextEditor();
          editor.setText(`Some folks say that I've got the perfect life
Three swell kids, lots of toys and a lovely wife
I fly, I sail, I throw caution to the wind
Drift like a stratus cloud above the Caribbean
But every now and then, the dragons come to call
Just when you least expect it you'll be dodgin' cannonballs
I've seen too much not to stay in touch
With a world full of love and luck
I've got a big suspicion 'bout ammunition
I never forget to duck
Come back, come back back to Jamaica
Don't chu know we made a big mistaica
We'd be so sad if you told us good-bye
And we promise not to shoot you out of the sky
It was a beautiful day, the kind you want to toast
We were tree top flyin' movin' west along the coast
Then we landed in the water, just about my favorite thrill
When some asshole started firing as we taxied to Negril
Just about to lose my temper as I endeavored to explain
We had only come for chicken we were not a ganja plane
Well, you should have seen their faces when they finally realized
We were not some coked up cowboy sporting guns and alibis
Come back, come back back to Jamaica
Don't chu know we made a big mistaica
We'd be so sad if you told us good-bye
And we promise not to shoot you out of the sky
They shot from the lighthouse, they shot from highway
They shot from the top of the cliff, they had all gone haywire
We're catchin' fire, and there wasn't even a spliff
Well, the word got out all over the island
Friends, strangers, they were all apologizin'
Some thought me crazy foe being way too nice
But it's just another shitty day in paradise
Come back, come back back to Jamaica
Don't chu know we made a big mistaica
We'd be so sad if you told us good-bye
And we promise not to shoot you out of the sky`);

          overAndBack.setEnabled(false);
          editor.moveToTop();
          overAndBack.setEnabled(true);
          editor.moveDown(15);
        });

        describe('and moving to line 7 of the editor with greek letters in it', () => {
          beforeEach(() => {
            waitsForPromise(() => {
              return atom.workspace.open(greekLetterEditor.getPath(), {
                'initialLine': 7
              });
            });
          });

          describe ('after adding a new editor with nothing in it', () => {
            beforeEach(() => {
              overAndBack.displayAllWaypoints();
              waitsForPromise(() => {
                return atom.workspace.open();
              });
            });

            describe ('after navigating back', () => {
              beforeEach(() => {
                overAndBack.displayAllWaypoints();
                let activeEditor = atom.workspace.getActiveTextEditor();
                expect(activeEditor.lineTextForBufferRow(activeEditor.getCursorBufferPosition().row)).toBe("");
                waitsForPromise(() => {
                  return overAndBack.navigateBackward();
                });
              });

              describe ('after navigating back', () => {
                beforeEach(() => {
                  waitsForPromise(() => {
                    return overAndBack.navigateBackward();
                  });
                });

                it ('should show the cursor as being at line 15 of the unnamed editor containing Jamaica Mistaka', () => {
                  overAndBack.displayAllWaypoints();
                  let currentEditor = atom.workspace.getActiveTextEditor();
                  expect(currentEditor.getCursorBufferPosition().row).toBe(15);
                  expect(currentEditor.lineTextForBufferRow(currentEditor.getCursorBufferPosition().row)).toBe("We were tree top flyin' movin' west along the coast");
                });
              });
            });
          });

          describe ('after navigating back', () => {
            beforeEach(() => {
              expect(overAndBack.getNumWaypoints()).toBe(2);

              waitsForPromise(() => {
                return overAndBack.navigateBackward();
              });
            });

            it ('should show the cursor as being at line 15 of the unnamed editor containing Jamaica Mistaka', () => {
              let currentEditor = atom.workspace.getActiveTextEditor();
              expect(currentEditor.getCursorBufferPosition().row).toBe(15);
              expect(currentEditor.lineTextForBufferRow(currentEditor.getCursorBufferPosition().row)).toBe("We were tree top flyin' movin' west along the coast");
            });

            describe ('after navigating forward again', () => {
              beforeEach(() => {
                waitsForPromise(() => {
                  return overAndBack.navigateForward();
                });
              });

              it ('should show the cursor on line 7 of the editor containing greek letters', () => {
                let newCurEditor = atom.workspace.getActiveTextEditor();

                expect(newCurEditor.getCursorBufferPosition().row).toBe(7);
                expect(newCurEditor.getPath()).toBe(greekLetterEditor.getPath());
              });
            });
          });
        });
      });
    });
  });
});

describe('Generic Waypoint Management', () => {
  beforeEach(() => {
    setupTestFramework();
  });

  it ('should merge two waypoints iff they differ by less than one line', () => {
    let waypoint1 = new Waypoint('blah.txt', -1, 1);
    let waypoint2 = null;

    let merged = Waypoint.merge(waypoint1, waypoint2);
    expect(merged).not.toBe(null);
    expect(merged).toHaveLength(1);
    expect(merged[0].equals(waypoint1)).toBe(true);

    waypoint1 = null;
    waypoint2 = new Waypoint('helloWorld.txt', -1, 15);
    merged = Waypoint.merge(waypoint1, waypoint2);
    expect(merged).not.toBe(null);
    expect(merged).toHaveLength(1);
    expect(merged[0].equals(waypoint2)).toBe(true);

    waypoint1 = new Waypoint('nothing.txt', -1, 17);;
    waypoint2 = new Waypoint('helloWorld.txt', -1, 15);
    merged = Waypoint.merge(waypoint1, waypoint2);
    expect(merged).not.toBe(null);
    expect(merged).toHaveLength(2);
    expect(merged[0].equals(waypoint1)).toBe(true);
    expect(merged[1].equals(waypoint2)).toBe(true);

    waypoint1 = new Waypoint('helloWorld.txt', -1, 14);;
    waypoint2 = new Waypoint('helloWorld.txt', -1, 15);
    merged = Waypoint.merge(waypoint1, waypoint2);
    expect(merged).not.toBe(null);
    expect(merged).toHaveLength(1);
    expect(merged[0].equals(waypoint2)).toBe(true);

    waypoint1 = new Waypoint('helloWorld.txt', -1, 17);;
    waypoint2 = new Waypoint('helloWorld.txt', -1, 16);
    merged = Waypoint.merge(waypoint1, waypoint2);
    expect(merged).not.toBe(null);
    expect(merged).toHaveLength(1);
    expect(merged[0].equals(waypoint2)).toBe(true);
  });

  it ('should coalesce consecutive lines into a single waypoint', () => {
    jasmine.attachToDOM(workspaceElement);

    let overAndBack = atom.packages.getActivePackage('atom-over-and-back').mainModule;
    expect(overAndBack).toBeDefined();

    let ravenEditor = getEditorWithTheRaven();
    expect(overAndBack.getNumWaypoints()).toBe(0);

    overAndBack.setEnabled(false);
    ravenEditor.moveToBottom();
    overAndBack.setEnabled(true);
    ravenEditor.moveToTop();
    ravenEditor.moveDown(1);
    ravenEditor.moveDown(1);
    ravenEditor.moveDown(1);
    ravenEditor.moveDown(1);
    ravenEditor.moveDown(1);
    ravenEditor.moveDown(1);
    ravenEditor.moveDown(1);
    ravenEditor.moveDown(1);

    expect(overAndBack.getNumWaypoints()).toBe(2);
    expect(ravenEditor.getCursorBufferPosition().row).toBe(8);
    expect(overAndBack.peekWaypoint().lineNumber).toBe(0);
  });

  it ('should remove all references to waypoints in the stack with a given tabIndex if told to', () => {
    jasmine.attachToDOM(workspaceElement);

    let overAndBack = atom.packages.getActivePackage('atom-over-and-back').mainModule;
    expect(overAndBack).toBeDefined();

    let waypoint1 = new Waypoint('blak', -1, 13);
    let waypoint2 = new Waypoint(null, 1, 44);
    let waypoint3 = new Waypoint('foo', -1, 1);
    let waypoint4 = new Waypoint(null, 3, 22);
    let waypoint5 = new Waypoint(null, 1, 16);

    overAndBack.addWaypoint(waypoint1);
    overAndBack.addWaypoint(waypoint2);
    overAndBack.addWaypoint(waypoint3);
    overAndBack.addWaypoint(waypoint4);
    overAndBack.currentWaypoint = waypoint5;

    expect(overAndBack.getNumWaypoints()).toBe(5);

    overAndBack.updateWaypointsForTabChange(1, -1);

    expect(overAndBack.getNumWaypoints()).toBe(3);
    expect(overAndBack.currentWaypoint.tabIndex).toBe(2);
  });

  it ("should update all references to tabs in the stack after a 'tab added' event, when told to do so", () => {
    jasmine.attachToDOM(workspaceElement);

    let overAndBack = atom.packages.getActivePackage('atom-over-and-back').mainModule;
    expect(overAndBack).toBeDefined();

    let waypoint1 = new Waypoint('blak', -1, 13);
    let waypoint2 = new Waypoint(null, 1, 44);
    let waypoint3 = new Waypoint('foo', -1, 1);
    let waypoint4 = new Waypoint(null, 3, 22);
    let waypoint5 = new Waypoint(null, 1, 16);

    overAndBack.addWaypoint(waypoint1);
    overAndBack.addWaypoint(waypoint2);
    overAndBack.addWaypoint(waypoint3);
    overAndBack.addWaypoint(waypoint4);
    overAndBack.currentWaypoint = waypoint5;

    expect(overAndBack.getNumWaypoints()).toBe(5);

    overAndBack.updateWaypointsForTabChange(1, 1);

    expect(overAndBack.getNumWaypoints()).toBe(5);
    expect(overAndBack.currentWaypoint.tabIndex).toBe(2);
  });
});
