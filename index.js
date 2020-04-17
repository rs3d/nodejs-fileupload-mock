const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const cors = require('cors');
const mime = require('mime');
const shortid = require('shortid');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('db.json');
const db = low(adapter);

class FileEntity {
  constructor(options) {
    Object.assign(this, {
      id: options.id || shortid.generate(),
      createdAt: options.createdAt || new Date().toISOString(),
      name: options.name || options.originalname,
      size: options.size,
      mimetype: options.mimetype,
      filename: options.filename,
      path: options.path,
      category: options.category,
      index: options.index,
    });
  }
}

// Set some defaults (required if your JSON file is empty)
db.defaults({ uploads: [] }).write();

const port = 3000;
const app = express();

app.use(cors());
app.use(function (req, res, next) {
  // Put some preprocessing here.
  next();
});

app.get('/api/upload', function (req, res, next) {
  const result = db
    .get('uploads')
    .sortBy('category', 'index', 'createdAt')
    .value()
    .map((item) => new FileEntity(item));

  res.json(result);
  next();
});

app.get('/api/upload/:id', function (req, res, next) {
  const id = req.params.id;
  const result = db
    .get('uploads')
    .filter({ id })
    .value()
    .map((item) => new FileEntity(item))[0];

  res.json(result);
  next();
});

app.get('/api/upload/:id/download/*', function (req, res, next) {
  const id = req.params.id;
  const result = db
    .get('uploads')
    .filter({ id })
    .value()
    .map((item) => new FileEntity(item))[0];

  const filePath = path.join(__dirname, result.path);

  //   res.setHeader('Content-disposition', 'attachment; filename=' + result.name);
  res.setHeader('Content-type', mime.getType(result.name));

  const filestream = fs.createReadStream(filePath);
  filestream.pipe(res);
});

app.delete('/api/upload/:id', function (req, res, next) {
  const id = req.params.id;
  const result = db
    .get('uploads')
    .filter({ id })
    .value()
    .map((item) => new FileEntity(item))[0];

  db.get('uploads').remove({ id }).write();
  try {
    const filePath = path.join(__dirname, result.path);
    fs.unlinkSync(filePath);
  } catch (e) {}

  res.send(200);
  next();
});

app.post('/api/upload', upload.single('file'), function (req, res, next) {
  const data = JSON.parse(req.body.data || {});
  const newUpload = new FileEntity({
    ...req.file,
    ...data,
  });
  const id = db.get('uploads').push(newUpload).write().id;
  res.json(newUpload);
  next();
  // req.file is the `upload` file
  // req.body will hold the text fields, if there were any
});

app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);
