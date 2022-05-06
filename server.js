const express = require("express");
const app = express();
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
const MongoClient = require("mongodb").MongoClient;
const methodOverride = require("method-override");
app.use(methodOverride("_method"));
app.set('view engine', 'ejs')
require('dotenv').config()

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

  db.collection('post').find().sort({"_id": -1}).toArray(function (error, result) {
    console.log(result)
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
  {$sort : { _id : -1 }}]
  console.log(req.query.value)
  db.collection('post').aggregate(search).toArray(function(error, result){
    console.log(result)
    res.render("search.ejs", { posts: result });
  })
});







app.get('/edit/:id', function (req, res) {
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

app.get('/login', function (req, res) {
  res.render('login.ejs')
})

app.post('/login', passport.authenticate('local', {
  failureRedirect: '/fail'
}), function (req, res) {
  res.redirect('/')
})

app.get('/mypage', checklogin, function (req, res) {
  console.log(req.user);
  res.render('mypage.ejs', { user: req.user })
})

function checklogin(req, res, next) {
  if (req.user) {
    next()
  } else {
    res.send('please login')
  }

}

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
      return done(null, result)
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

  // find counter in CB
  db.collection('counter').findOne({ name: 'numberOfPost' }, function (error, result) {
    console.log(result.totalPost);
    var numberOfTotalPost = result.totalPost
    var inputData = { 
      _id: numberOfTotalPost + 1,
       title: req.body.title, 
       date: req.body.date, 
       uploadDate: new Date(),
       author: req.user._id 
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

app.post('/register', function(req, res){
  db.collection('login').insertOne({ id : req.body.id, pw: req.body.pw }, function(error, result){
    //add check if login ID exist already

    res.redirect('/')
  })
})


app.delete('/delete', function (req, res) {
  console.log(req.body)
  req.body._id = parseInt(req.body._id)

  var deleteData = {_id: req.body._id, author: req.user._id }

  db.collection('post').deleteOne(deleteData, function (error, result) {
    console.log('Delete Done');
    if(result) {console.log(result)}
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



let multer = require('multer')
var storage = multer.diskStorage({
  destination : function(req, file, cb){
    cb(null, './public/image')
  },
  filename: function(req, file, cb){
    cb(null, file.originalname)
  }
})
var upload = multer({storage: storage})


app.get('/upload', function(req, res){
  res.render('upload.ejs')

})


app.post('/upload',upload.single('profile') , function(req, res){
  res.send('upload done')
});

app.get('/image/:imagename', function(req, res){
  res.sendFile( __dirname + '/public/image/' + req.params.imagename )

})