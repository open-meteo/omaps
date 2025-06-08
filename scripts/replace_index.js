import { readFile, writeFile } from 'fs';

// async
function replaceContents(file, replacement, cb) {
	readFile(replacement, (err, contents) => {
		if (err) return cb(err);
		writeFile(file, contents, cb);
	});
}
replaceContents('./dist/index.html', './dist/index_pages.html', (err) => {
	if (err) {
		// handle errors here
		throw err;
	}
});
