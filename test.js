/* global describe, it, after */
import assert from 'assert';
import GoogleDrive from './src/index';
import uuid from 'node-uuid';
import fs from 'fs';
import os from 'os';
import path from 'path';

function asyncMocha (testFn) {
	return async done => {
		try {
			await testFn();
			done();
		} catch(err) {
			done(err);
		}
	}
}

// do not run tests if the necessary OAuth2 keys aren't present in the environment
assert.ok(process.env.CLIENT_ID, 'CLIENT_ID is not present in ENV');
assert.ok(process.env.CLIENT_SECRET, 'CLIENT_SECRET is not present in ENV');
assert.ok(process.env.REFRESH_TOKEN, 'REFRESH_TOKEN is not present in ENV');

const { CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN } = process.env;

describe('Basics', () => {

	const googleDriver = new GoogleDrive({ CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN });

	it('should be able to get an OAuth2Client successfully', asyncMocha( async () => {
		const auth = await googleDriver.getAuthClient();
		assert.equal('OAuth2Client', auth.constructor.name);
		assert.ok(auth.credentials);
	}));

	it('should be able to get a drive client successfully', asyncMocha( async () => {
		const drive = await googleDriver.getDriveClient();
		assert.ok(drive);
	}));

});

describe('File I/O', () => {

	const googleDriver = new GoogleDrive({ CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN });
	const title = uuid().slice(-12);
	const content = new Buffer('hello world');
	const mimeType = 'text/plain';

	describe('creation', () => {

		after( async () => {
			await googleDriver.deleteAll(title);
		});

		it(`should be able to upload file ${title} from file system via facade API`, asyncMocha( async () => {
			// TODO: This deletes the file on google drive beforehand if it exists. Specific test for this?
			// TODO: Doesn't test if the content is correct
			const tempfile = path.join(os.tmpdir(), title);
			try {
				fs.writeFileSync(tempfile, content);
				await googleDriver.upload(tempfile, mimeType);
			} catch (e) {
				throw e;
			} finally {
				fs.unlinkSync(tempfile);
			}
			
		}));

		it(`should be able to locate uploaded ${title} files via search`, asyncMocha( async () => {
			const files = await googleDriver.search(title);
			assert.equal(files.length, 1, `Expected to be able to find 1 file(s) named ${title}`);
			files.forEach(file => assert.equal(file.title, title, `Expected title = ${title} but got ${file && file.title}`));
		}));

		it(`should be able to create a folder named ${title}`, asyncMocha( async () => {
			const createResult = await googleDriver.createFolder(title);
			const files = await googleDriver.search(title);
			assert.ok(files.some( file => file.id === createResult.id && file.title === title ), `Expected to find the folder ${title} that was just created`);
		}));

		it(`will not create a folder if it already exists`, asyncMocha( async () => {
			const result1 = await googleDriver.createFolder(title);
			const result2 = await googleDriver.createFolder(title);
			assert.equal(result1.id, result2.id, `Expected creating the same folder ${title} twice to return the same resource id`);
		}));

	});

});