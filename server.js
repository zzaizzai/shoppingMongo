const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const MongoClient = require("mongodb").MongoClient;
const methodOverride = require("method-override");
const { ObjectId } = require('mongodb')
const flash = require('connect-flash')
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.set('view engine', 'ejs')
require('dotenv').config()
app.use('/public', express.static('public'))


app.use(flash());

var db;
MongoClient.connect(process.env.DB_URL, function (err, client) {
  if (err) return console.log(err)
  db = client.db('todoapp')
  app.listen(8080, function () {
    console.log("listening on 8080");
  });
});

app.get("/", function (req, res) {
  res.render("index.ejs");
});

app.get("/write", function (req, res) {
  res.render("write.ejs");
});

app.get("/list", function (req, res) {

  db.collection('post').find().sort({ "_id": -1 }).toArray(function (error, result) {
    res.render("list.ejs", { posts: result });
  });
});

app.get("/search", function (req, res) {
  search = [
    {
      $search: {
        index: 'titleSearch',
        text: {
          query: req.query.value,
          path: ['title', 'date']
        }
      }
    },
    { $sort: { _id: -1 } }]
  console.log(req.query.value)
  db.collection('post').aggregate(search).toArray(function (error, result) {
    console.log(result)
    res.render("search.ejs", { posts: result });
  })
});


app.get('/login', function (req, res) {
  res.render('login.ejs')
})

app.get('/register', function (req, res) {
  res.render('register.ejs')
})


app.get('/edit/:id', function (req, res) {
  console.log(req.body)
  //get post info. including id
  db.collection('post').findOne({ _id: parseInt(req.params.id) }, function (error, result) {
    console.log(result);
    res.render('edit.ejs', { data: result })
  })
})

app.put('/edit', function (req, res) {
  db.collection('post').updateOne({ _id: parseInt(req.body.id) }, { $set: { title: req.body.title, date: req.body.date } }, function (error, result) {
    console.log(result);
    console.log('edit done');
    res.redirect('/list');
  })
})


const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session')

app.use(session({ secret: 'secretcode', resave: true, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());



app.post('/login', passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: true
}), function (req, res) {
  req.session.save(function () {
    res.redirect('/')
  })

})

app.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/');
});

app.get('/mypage', checklogin, function (req, res) {
  console.log(req.user);
  res.render('mypage.ejs', { user: req.user })
})

function checklogin(req, res, next) {
  if (req.user) {
    next()
  } else {
    res.redirect('/login')
  }

}

//check id and pw
passport.use(new LocalStrategy({
  usernameField: 'id',
  passwordField: 'pw',
  session: true,
  passReqToCallback: false,
}, function (inputedID, inputedPW, done) {
  console.log(inputedID, inputedPW);
  db.collection('login').findOne({ id: inputedID }, function (error, result) {
    if (error) return done(error)
    if (!result) return done(null, false, { message: 'wrong ID' })
    if (inputedPW == result.pw) {
      return console.log("good")
    } else {
      return done(null, false, { message: 'wrong password' })
    }
  })
}));

passport.serializeUser(function (user, done) {
  done(null, user.id)
})

passport.deserializeUser(function (ID, done) {
  db.collection('login').findOne({ id: ID }, function (error, result) {
    done(null, result)
  })
})

app.post("/add", function (req, res) {

  // find counter in DB
  db.collection('counter').findOne({ name: 'numberOfPost' }, function (error, result) {
    console.log(result.totalPost);
    var numberOfTotalPost = result.totalPost
    var inputData = {
      _id: numberOfTotalPost + 1,
      title: req.body.title,
      date: req.body.date,
      uploadDate: new Date(),
      author: req.user._id,
      authorName: req.user.displayName,
    }

    // create data regarding number of counter
    db.collection('post').insertOne(inputData, function (error, result) {
      console.log('Save Done');
      res.redirect('/list')
      // counter + 1 in DB
      db.collection('counter').updateOne({ name: 'numberOfPost' }, { $inc: { totalPost: 1 } }, function (error, result) {
        if (error) { return console.log(error) }
      })
    })
  });
});

app.post('/register', function (req, res) {
  var inputData =
  {
    displayName: req.body.displayName,
    id: req.body.id,
    pw: req.body.pw,
    role: 'user',
    date: new Date(),
  }
  db.collection('login').insertOne(inputData, function (error, result) {
    //add check wether login ID exist already
    res.redirect('/')
  })
})


app.delete('/delete', function (req, res) {
  console.log(req.body)
  req.body._id = parseInt(req.body._id)

  var deleteData = { _id: req.body._id, author: req.user._id }

  db.collection('post').deleteOne(deleteData, function (error, result) {
    console.log('Delete Done');
    if (result) { console.log(result) }
    res.status(200).send({ message: 'Good' })
  })
})

app.get('/detail/:id', function (req, res) {
  //get post info. including id
  db.collection('post').findOne({ _id: parseInt(req.params.id) }, function (error, result) {
    console.log(result);
    res.render('detail.ejs', { data: result })

  })
})

app.use('/shop', require('./routes/shop.js'))



let multer = require('multer');
const { get } = require("express/lib/response");
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/image')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})
var upload = multer({ storage: storage })


app.get('/upload', function (req, res) {
  res.render('upload.ejs')

})


app.post('/upload', upload.single('profile'), function (req, res) {
  res.send('upload done')
});

app.get('/image/:imagename', function (req, res) {
  res.sendFile(__dirname + '/public/image/' + req.params.imagename)

})


app.get('/chat', checklogin, function (req, res) {
  var user = req.user;
  db.collection('chat').find({ member: req.user._id }).sort({ "latestDate": -1 }).toArray().then((result) => {
    res.render('chat.ejs', { data: result, user: user })
  })
})

app.post('/chat/checkexist', checklogin, function (req, res) {
  var user = req.user;
  db.collection('chat').find({ member: req.user._id }).sort({ "latestDate": -1 }).toArray().then((result) => {
    res.render('chat.ejs', { data: result, user: user })
  })
})


app.post('/chat', checklogin, function (req, res) {
  var chatExist = false
  var newChatRoom = {
    title: req.body.title,
    member: [ObjectId(req.body.authorId), req.user._id],
    authorId: ObjectId(req.body.authorId),
    authorName: req.body.authorName,
    date: new Date(),
    latestDate: new Date()
  }
  db.collection('chat').insertOne(newChatRoom).then((result) => {
    console.log('create new chatroom')
  })
})

app.post('/message', checklogin, function (req, res) {

  var date = new Date();

  var inputData = {
    parent: ObjectId(req.body.parent),
    content: req.body.content,
    userid: req.user._id,
    date: date,
  }

  //new message
  db.collection('message').insertOne(inputData).then(() => {
    console.log('send message done')
  }).catch((error) => {
    if (error) { return console.log(error) }
  })

  //update latestDate of chat
  db.collection('chat').updateOne({ _id: ObjectId(req.body.parent) }, { $set: { 'latestDate': new Date() } }, function (error, result) {
    if (error) { return console.log(error) }
  })
})

app.get('/message/:id', checklogin, function (req, res) {

  res.writeHead(200, {
    "Connection": "keep-alive",
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
  });

  db.collection('message').find({ parent: ObjectId(req.params.id) }).toArray().then((result) => {
    res.write('event: test\n');
    res.write('data:' + JSON.stringify(result) + '\n\n');


  })


  const pipeline = [
    // documents you want to watch
    { $match: { 'fullDocument.parent': ObjectId(req.params.id) } }
  ];

  const changeStream = db.collection('message').watch(pipeline);

  changeStream.on('change', (result) => {
    console.log(result.fullDocument);
    res.write('event: test\n');
    res.write('data:' + JSON.stringify([result.fullDocument]) + '\n\n');
  });
});

