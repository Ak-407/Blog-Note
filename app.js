require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require( "passport-google-oauth2" ).Strategy;
const findOrCreate = require("mongoose-findorcreate");
const FacebookStrategy = require( "passport-facebook" ).Strategy;


const app = express();


app.use(session({
  secret: 'i have a little secret',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());




mongoose.set('strictQuery', true);
mongoose.connect("mongodb://localhost:27017/user3DB",{ useNewUrlParser: true , useUnifiedTopology: true });
mongoose.set('useCreateIndex', true);

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

const UserSchema = mongoose.Schema({
  email:String,
  password:String,
  googleId:String,
  facebookId: String,
  secretline: String
});

UserSchema.plugin(passportLocalMongoose);
UserSchema.plugin(findOrCreate);



const user = mongoose.model("user", UserSchema);

passport.use(user.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});


passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  userProfileURL: "https://googleapis.com/aouth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  user.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: "http://localhost:3000/auth/facebook/secrets"
},
function(accessToken, refreshToken, profile, cb) {
  user.findOrCreate({ facebookId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));


app.get("/", function(req,res){
    res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
);

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get('/auth/facebook',
passport.authenticate('facebook')
);

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });



app.get("/register", function(req,res){
  res.render("register");
});

app.get("/login", function(req,res){
  res.render("login");
});

app.post("/register", function(req,res){
  user.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log("error");
      res.redirect("/register");
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      })
    }
  })

});

app.get("/secrets", function(req, res){
  if(req.isAuthenticated()){
    // res.render("secrets");
    user.find({"secretline": {$ne: null}}, function(err, founditem){
      if(err){
        console.log(err);
      }
      else{
        if(founditem){
          res.render("secrets", {newitems:founditem});
        }
      }
    })

  }else{
    res.redirect("/login");
  }
})

app.post("/login", function(req,res){
  const nuser = new user({
    username:req.body.username,
    password:req.body.password
  });
  req.login(nuser, function(err){
    if(err){
      console.log("error");
    }
    else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
 })

});
        

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/")
})

app.get("/submit", function(req,res){
  res.render("submit")
})

app.post("/submit", function(req,res){
  const secline = req.body.secret;
  console.log(secline);
  if(req.isAuthenticated()){
    const newitem = new user({
      secretline:secline
    });
    newitem.save();
    res.redirect("/secrets");
  }else{
    res.redirect("/login");
  }
})


app.listen(3000, function() {
  console.log("Server started on port 3000.");
});
