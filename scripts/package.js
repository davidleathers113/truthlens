const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const distDir = path.join(__dirname, '..', 'dist');
const outputPath = path.join(__dirname, '..', 'truthlens.zip');

// Create a file stream for the zip
const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', {
  zlib: { level: 9 } // Maximum compression
});

output.on('close', () => {
  console.log(`Extension packaged successfully: ${archive.pointer()} bytes`);
  console.log(`Package saved to: ${outputPath}`);
});

archive.on('error', (err) => {
  throw err;
});

// Pipe archive data to the file
archive.pipe(output);

// Add the dist directory contents
archive.directory(distDir, false);

// Finalize the archive
archive.finalize();
