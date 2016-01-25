/* global describe, it, after */
import assert from 'assert';
import GoogleDrive from './src/index';
import uuid from 'node-uuid';
import fs from 'fs';

const { CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN } = process.env;
const asyncMocha = testFn => async done => {
	try {
		await testFn();
		done();
	} catch(err) {
		done(err);
	}
}

describe('Test requirements', () => {
	it('should run only if env variables are set', () => {
		assert.ok(process.env.CLIENT_ID, 'CLIENT_ID is not present in ENV');
		assert.ok(process.env.CLIENT_SECRET, 'CLIENT_SECRET is not present in ENV');
		assert.ok(process.env.REFRESH_TOKEN, 'REFRESH_TOKEN is not present in ENV');
	});
});

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

	describe('commands', async () => {

		const drive = await googleDriver.getDriveClient();
		const auth = await googleDriver.getAuthClient();

		// TODO: Should I have setup and teardown? What if the setup and/or teardown fails?
		it(`should be able to create a temp file ${title} via uploadCommand`, asyncMocha( async () => {
			const resource = { title, mimeType };

			await googleDriver.uploadCommand(drive, auth, mimeType, content, resource);
		}));

		it(`should be able to locate uploaded ${title} files via searchCommand`, asyncMocha( async () => {
			const files = await googleDriver.searchCommand(drive, auth, title);
			assert.equal(files.length, 1, `Expected to be able to find 1 file(s) named ${title}`);
			files.forEach(file => assert.equal(file.title, title, `Expected title = ${title} but got ${file && file.title}`));
		}));

		// TODO: verify that it can locate more than one page of files
		// TODO: verify file contents

		it(`should be able to delete all ${title} files uploaded`, asyncMocha( async () => {
			await googleDriver.deleteAllCommand(drive, auth, title);
			const files = await googleDriver.searchCommand(drive, auth, title);
			assert.equal(files.length, 0, `Expected all files ${title} to be deleted but ${files && files.length} remain`);
		}));

	});

	describe.only('creation', () => {

		after( async () => {
			await googleDriver.deleteAll(title);
		});

		it(`should be able to upload file ${title} from file system via facade API`, asyncMocha( async () => {
			// TODO: This deletes the file on google drive beforehand if it exists. Specific test for this?
			try {
				fs.writeFileSync(title, content);
				await googleDriver.upload(title, mimeType);
			} catch (e) {
				throw e;
			} finally {
				fs.unlinkSync(title);
			}
			
		}));

		it(`should be able to locate uploaded ${title} files via search`, asyncMocha( async () => {
			const files = await googleDriver.search(title);
			assert.equal(files.length, 1, `Expected to be able to find 1 file(s) named ${title}`);
			files.forEach(file => assert.equal(file.title, title, `Expected title = ${title} but got ${file && file.title}`));
		}));

		it(`should be able to create a folder named ${title}`, asyncMocha( async() => {
			const createResult = await googleDriver.createFolder(title);
			const files = await googleDriver.search(title);

			console.log(`createResult = ${JSON.stringify(createResult, null, 4)}, files = ${JSON.stringify(files, null, 4)}`);

			// assert.ok(files.some( file => file.id === id && file.title === title ));
		}));


	});




});