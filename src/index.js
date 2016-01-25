// this will contain some Google Drive API functionality
import googleapis from 'googleapis';
import request from 'request';
import fs from 'fs';
import Promise from 'bluebird';

const OAUTH_TOKEN_URL = 'https://accounts.google.com/o/oauth2/token';
const OAUTH_PLAYGROUND_URL = 'https://developers.google.com/oauthplayground';
const bufferFile = Promise.promisify(fs.readFile);

const maybeHasParent = (resource, folderId) => {
	if (folderId) {
		resource.parents = [
			{ kind: 'drive#parentReference', id: folderId }
		];
	}

	return resource;
}

export default class GoogleDrive {

	constructor({CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN}) {
		this.CLIENT_ID = CLIENT_ID;
		this.CLIENT_SECRET = CLIENT_SECRET;
		this.REFRESH_TOKEN = REFRESH_TOKEN;

		const self = this; // sigh

		this.withContext = async fn => {
			self.authClient = self.authClient || await self.getAuthClient();
			self.driveClient = self.driveClient || await self.getDriveClient();

			return await fn(self.driveClient, self.authClient);
		};
	}

	getAuthClient() {

		const { REFRESH_TOKEN, CLIENT_ID, CLIENT_SECRET } = this;

		return new Promise((resolve, reject) => {

			request.post({
				url: OAUTH_TOKEN_URL,
				form: {
				  refresh_token: REFRESH_TOKEN,
				  client_id: CLIENT_ID,
				  client_secret: CLIENT_SECRET,
				  grant_type: 'refresh_token'
				}
			  }, (err, response, body) => {
		  		try {
				  	if (err) throw err;
			  		const token = JSON.parse(body);

			  		if (!token.hasOwnProperty('access_token')) {
			  			throw new Error(`access_token not found in ${JSON.stringify(token)}`);
			  		} else {
						const auth = new googleapis.auth.OAuth2(
							CLIENT_ID,
							CLIENT_SECRET,
							OAUTH_PLAYGROUND_URL
						);
						auth.credentials = token;
						return resolve(auth);
			  		}
			  	} catch (e) {
			  		return reject(e);
			  	}
			});
		});

	}


	getDriveClient() {
		return Promise.resolve(googleapis.drive('v2'));
	}

	createCommand(drive, auth, mimeType, content, resource) {

		return new Promise( (resolve, reject) => {
			drive.files
				.insert({
					resource,
					media: { mimeType, body: content },
					auth: auth
				}, (err, client) => err && reject(err) || resolve(client));
		});

	}

	searchCommand(drive, auth, title, folderId) {

		const rollingRequest = (query, arr = [], token) => {
			const searchRequest = { q: query, maxResults: 1000 }; // fetch as fast as possible

			// append a token if specified
			token && (searchRequest.pageToken = token);
			searchRequest.auth = auth;

			return new Promise((resolve, reject) => {
				drive.files
					.list(searchRequest, (err, resp) => {
						const { nextPageToken, items } = resp;
						if (err) {
							return reject(err);
						} else if (nextPageToken) {
							return resolve(rollingRequest(query, arr.concat(items), nextPageToken));
						} else {
							return resolve(arr.concat(items));
						}
					});
			});
		}

		let query = `title contains '${title}' `;
		if (folderId) {
			query += `and '${folderId}' in parents `;
		}

		return rollingRequest(query);

	}

	deleteAllCommand(drive, auth, title, folderId) {

		const simplifyList = filelist => {
			return filelist.map(obj => ({ 
					id: obj.id,
					title: obj.title,
					parents: obj.parents.map( _ => _.id )
				})
			);
		}


		const deleteSingleFile = fileObj => {
			return new Promise( (resolve, reject) => {
				drive.files
					.delete({
						fileId: fileObj.id,
						auth
					}, (err, resp) => err && reject(err) || resolve(resp));
			});
		};

		// get all the files first
		return this.searchCommand(drive, auth, title, folderId)
			.then(simplifyList)
			.then( filelist => {

				if (filelist.length === 0) {
					console.log('No existing file found, deletion is unnecessary');
					return filelist; // nothing to delete
				}

				// do the actual deletion
				const deleteAll = filelist.reduce(
					(current, elem) => current.then(() => deleteSingleFile(elem))
				, Promise.resolve());
				
				return deleteAll.then(() => filelist);
			});
	}

	deleteAll(title, folderId) {
		return this.withContext( (drive, auth) => this.deleteAllCommand(drive, auth, title, folderId));
	}

	upload(filename, mimeType, folderId) {

		if (!filename || /([^\/\\])+$/.exec(filename) === null) {
			return Promise.reject(new Error(`${filename} is not a valid filename`));
		}

		const resource = {
			title: /([^\/\\])+$/.exec(filename)[0], mimeType
		};

		if (folderId) {
			resource.parents = [
				{ kind: 'drive#parentReference', id: folderId }
			];
		}

		return Promise.all([this.getAuthClient(), this.getDriveClient()])
			.spread((auth, drive) => {
				// delete any existing file first, then upload
				const bufferPromise = bufferFile(filename);
				const deleteExisting = this.deleteAllCommand(drive, auth, filename, folderId);

				return Promise.all([bufferPromise, deleteExisting])
					.spread(buffer => new Promise( (resolve, reject) => {
						drive.files
							.insert({
								resource,
								media: { mimeType, body: buffer },
								auth: auth
							}, (err, client) => err && reject(err) || resolve(client));
					}));
			});
	}

	createFolder(foldername, folderId) {
		return this.withContext( (drive, auth) => new Promise( (resolve, reject) => {
			drive.files.insert(
				{
					resource: maybeHasParent({
						title: foldername,
						mimeType: 'application/vnd.google-apps.folder'
					}, folderId),
					auth
				}, (err, resp) => err && reject(err) || resolve(resp)
			);
		}));
	}

	search(name, folderId) {
		return this.withContext( (drive, auth) => this.searchCommand(drive, auth, name, folderId));
	}

}
