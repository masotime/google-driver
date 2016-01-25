# google-driver

**WARNING**: Use at your own risk. I'm still fleshing out the API for this.

Written with support for ES7 async/await in mind. Refer to `test.js` for example code style.

Provides a very basic API to upload files onto google drive via a constructed GoogleDriver instance.

```
import GoogleDriver from 'google-driver';
const googleDriver = new GoogleDrive({ CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN });
```

Note: Don't store your secret keys in public github! I'd strongly recommend storing them as environment variables in whatever environment you're running them on. You can obtain your keys in the following manner:

```
const { CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN } = process.env
```

## API

* `upload(file, mimeType, folderId)` - uploads the given file (in local filesystem) into the optionally specified `folderId`
* `createFolder(folderName, folderId)` - creates a folder named `folderName` into the optionally specified `folderId` (as a subfolder).
* `deleteAll(title, folderId)` - deletes all files named `title` in the optionally specified `folderId`
* `search(title)` - returns an array of resource objects matching the given `title` in the optionally specified `folderId`

More APIs added as I go along.

### notes

Unless otherwise specified:

* If `folderId` is not specified, operations are assumed to take place in the root folder.
* All non-deletion operations will return either a single resource or an array of resources.
