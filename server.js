const express = require('express');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage')
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');

const app = express()

const mongoURI = 'mongodb://localhost/uploader';

const con = mongoose.createConnection(mongoURI, {useNewUrlParser: true, useUnifiedTopology: true});

app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

let gfs;

con.on('open', () => {
  gfs = Grid(con.db, mongoose.mongo);
  gfs.collection('uploads')
})

const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});

const upload = multer({storage});

app.get('/', (req, res) => {
  gfs.files.find().toArray((err, files) => {
    if(!files || files.length === 0){
      console.log(files);
      res.render('index', {files: false});
    }else{
      files.map(file => {
        if(file.contentType === 'image/jpeg' || file.contentType === 'image/png'){
          file.isImage = true;
        }else{
          file.isImage = false;
        }
      });
      res.render('index', {files: files});
    }
  })
});

app.post('/upload', upload.single('file'), (req, res) => {
  // res.json({file: req.file});
  res.redirect('/');

});

app.get('/files', (req, res) => {

  gfs.files.find().toArray((err, files) => {
    if(!files || files.length === 0){
      return res.status(404).json({err: 'No files exists'});
    }
    return res.json(files);
  })
})

app.get('/files/:filename', (req, res) => {

  gfs.files.findOne({filename: req.params.filename}, (err, file) => {
    if(err){
      return res.status(404).json({err: 'No file exists'});
    }else{
      return res.json(file);
    }
  })
})

app.get('/image/:filename', (req, res) => {

  gfs.files.findOne({filename: req.params.filename}, (err, file) => {
    if(!file || file.length === 0){
      return res.status(404).json({err: 'No files exists'});
    }
      if(file.contentType === 'image/jpeg' || file.contentType === 'image/png'){
        const readStream = gfs.createReadStream(file.filename);
        readStream.pipe(res);
      }else{
        res.status(404).json({err: 'Not an image'});
      }
  })
})

app.delete('/files/:id', (req, res) => {
  gfs.remove({_id: req.params.id, root: 'uploads'}, (err, gridStore) => {
    if(err){
      return res.status(404).json({err: 'Not an image'});
    }
    return res.redirect('/');
  })
})

app.listen(3000, _ => console.log('Listening on 3000..'));