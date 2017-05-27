'use babel';

import { FixtureLoader } from './utils';

describe('when the fixture loader is intialized', () => {
  beforeEach(() => {
    fixtureLoader = new FixtureLoader((data) => {
      fixtureFileData = data;
    });
  });

  it('should have loaded a single fixture file named "greek-letters"', () => {
    waitsForPromise(() => {
      return fixtureLoader.getPromise();
    });

    runs(() => {
      let keys = Object.keys(fixtureFileData);
      expect(keys).toHaveLength(1);
      expect(keys[0]).toEqual("greek-letters");
    });
  });
});
