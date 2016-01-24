# google-driver

**WARNING**: Use at your own risk. I'm still fleshing out the API for this.

Provides a very basic API to upload files onto google drive via a constructed GoogleDrive instance.

```
	const googleDriver = new GoogleDrive({ CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN });
	await googleDriver.upload(title, mimeType); // uploads (replace if necessary) title
	await googleDriver.upload(title, mimeType, folderId); // as above, but in folder with folderId
```	

More APIs added as I go along.