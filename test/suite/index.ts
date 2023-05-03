'use strict';

import * as path from 'path';
import Mocha from 'mocha';
import * as glob from 'glob';

export async function run(): Promise<void> {
	const testsRoot = path.resolve(__dirname, '..');

	// Create the mocha test
	const mocha = new Mocha({
		ui: 'bdd',
    timeout: 10 * 1000,
		color : true,
		/* reporter: 'mocha-junit-reporter',
		reporterOptions : {
			mochaFile : './reports/mocha-results.xml',
			toConsole : 'true'
		} */
	});
  
  // Add all files to the test suite
  const files = glob.sync('**/*.test.js', { cwd: testsRoot });
  files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

  const failures: number = await new Promise(resolve => mocha.run(resolve));

  if (failures > 0) {
    throw new Error(`${failures} tests failed.`);
  }
}