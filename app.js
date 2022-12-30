require('dotenv').config(); // here, level 5

const express = require("express");
// body parser is usedd to handle the  http responses as we get the response data in the 
// chunks so this body parser converts our req. form data into an object which we may use 
// to easily access the data. 
// link: https://www.quora.com/What-exactly-does-body-parser-do-with-express-js-and-why-do-I-need-it
const bodyParser = require("body-parser");
const ejs = require("ejs");
// mongodb object modeling, Mongoose provides a straight-forward, schema-based solution 
// to model your application data. It includes built-in type casting, validation, query 
// building, business logic hooks and more, out of the box.
const mongoose = require("mongoose");
// handle and saves sessions on server
const session = require('express-session');
// it a node.js middleware which can be used in our website development using express framework and 
// that makes it easy to implement authentication and authorization.
// it contain strategies
const passport = require('passport');
// intigrate a Mongoose plugin that simplifies building username and password login with Passport.
const passportlocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
// Simple plugin for Mongoose which adds a findOrCreate method to models. This is useful f
// or libraries like Passport which require it.
const findOrCreate = require('mongoose-findorcreate');
// Download the helper library from https://www.twilio.com/docs/node/install
// Your Account Sid and Auth Token from twilio.com/console
// and set the environment variables. See http://twil.io/secure
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);


const app = express();

var userID = "false";
var google = false;
var objectId = "";
var booking = "";
var warning = "";

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "our litte secret.",
  resave: true,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://admin-prakash:OuuE3YJe3LAkcUdn@cluster01.bgwlu.mongodb.net/partyBoxUserDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  googleId: String,
  facebookID: String,
  profileImg: String,
  address: String,
  number: String
});

const productSchema = new mongoose.Schema({
  title: String,
  image: String,
  price: String,
  info: [String]
});

userSchema.plugin(passportlocalMongoose); //it will save our users in mongodb and will use it in session
userSchema.plugin(findOrCreate); // this plugin we attached to that we can use the function on line 68.

const user = new mongoose.model("user", userSchema);

const product = new mongoose.model("product", productSchema);

passport.use(user.createStrategy()); // passport method

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  user.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://getpartybox.herokuapp.com/auth/google/partybox",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo" // as g+ is no more so we will get info from userinfo in google api
  },
  function(accessToken, refreshToken, profile, cb) { // here we will return with accessToken n all as it is an callback function
    //console.log(profile);
    userID = profile;
    user.findOrCreate({
      googleId: profile.id,
    }, function(err, user) { // to use this method use: npm i mongoose-findorcreate

      return cb(err, user);
    });
  }
));

// product.insertMany([p2,p3,p4], function(err, res) {
//   if (err) throw err;
//   console.log("1 document inserted");
// });

app.get("/", function(req, res) {
  warning = "";
  res.render("home");
});

app.get("/auth/google", passport.authenticate('google', {

  scope: ['profile']

}));

app.get('/auth/google/partybox',
  passport.authenticate('google', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    google = true;
    res.redirect("/");
  }
);

app.get("/about",function(req,res){
  res.render("about");
})

app.post("/:value/order/success", function(req, res) {
  var id = req.params.value;
  var add = req.body.address;
  var mob = req.body.number;
  var IndNum = /^[0]?[789]\d{9}$/;

  if (add == "" || mob == "") {
    warning = "Enter valid mobile number or Address";
    res.redirect("/" + id + "/order");
  } else if (IndNum.test(mob)) {
    warning = "";
    console.log("twilio");
    client.messages
      .create({
        body: 'PartyBox here, your order with product id: ' + id + " is booked Successfully and will be delivered at " + add + ". Stay tuned for more: GeezRick ;)",
        from: '14844357480',
        to: '91' + mob
      })
      .then(message => console.log(message.sid));
    res.render("success");
  } else {
    console.log("not twilio");
    res.redirect("/" + id + "/order");
  }

});

app.get("/profile", function(req, res) {
  var blank = "";
  if (req.isAuthenticated()) {
    if (google) {
      blank = "loggined via google";
      user.findOne({
        googleId: userID.id
      }, function(err, foundList) {
        if (!err) {
          // here we will use the older
          res.render("profile", { // EJS
            userid: foundList._id,
            img: userID.photos[0].value,
            name: userID.name,
            name1: "", // EJS
            username: blank
          });
        }
      })
    } else {
      user.findOne({
        username: objectId
      }, function(err, foundlist) {
        if (!err) {
          console.log(foundlist);
          res.render("profile", {
            userid: foundlist._id,
            img: blank,
            name: blank,
            name1: foundlist.name,
            username: foundlist.username
          })
        }
      })
      //console.log("normal login");
    }
  } else {
    res.redirect("login");
  }
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/development",function(req,res){
  res.render("development");
})

app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/cards/:value", function(req, res) {
  var id = req.params.value;
  booking = id;
  //console.log(id);
  product.findOne({
    _id: id
  }, function(err, foundList) {
    if (!err) {
      //console.log(foundList.title);
      res.render("cards", {
        id1: id,
        product: foundList.title,
        img: foundList.image,
        features: foundList.info,
        price: foundList.price
      });
    }
  });
});

app.get("/:value/order", function(req, res) {
  var id = req.params.value;
  if(!req.isAuthenticated()){
    res.redirect("/login");
  }else{
    user.findOne({
      username: objectId
    }, function(err, foundlist1) {
      if (foundlist1 == null) {
        if (!req.isAuthenticated()) {
          res.redirect("/login");
        } else {
          user.findOne({
            googleId: userID.id
          }, function(err, foundlist) {
            if (foundlist == null) {
              res.render("login")
            } else {
              product.findOne({
                _id: id
              }, function(err, foundList) {
                if (!err) {
                //  console.log(foundList);
                  res.render("order", {
                    id1: id,
                    product: foundList.title,
                    img: foundList.image,
                    features: foundList.info,
                    price: foundList.price,
                    userid: foundlist._id,
                    img1: userID.photos[0].value,
                    name: userID.name,
                    name1: "", // EJS
                    username: "Logged In via Google",
                    warning: warning
                  });
                }
              });
            }
          })
        };
      } else {
        product.findOne({
          _id: id
        }, function(err, foundList) {
          if (!err) {
            //console.log(foundList.title);
            res.render("order", {
              id1: id,
              product: foundList.title,
              img: foundList.image,
              price: foundList.price,
              userid: foundlist1._id,
              img1: "",
              name: "",
              name1: foundlist1.name,
              username: foundlist1.username,
              warning: ""
            });
          }
        });
      }
    });
  }

});


app.post("/login", function(req, res) {
  const newUser = new user({
    //username: req.body.username,
    password: req.body.password
  });
  req.login(newUser, function(err, foundUser) { // passport method
    if (err) {
      //console.log(err);
      res.redirect("/login");
    } else {
      google=false;
      passport.authenticate("local",{failureFlash:'Invalid Username or Password'})(req, res, function() {
        objectId = req.body.username;
        res.redirect("/profile");
      });
    }
  });
});

app.post("/register", function(req, res) {
  user.register({
    name: req.body.name,
    username: req.body.username
  }, req.body.password, function(err, foundUser) { // passport method
    if (err) {
      //console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        //userID=foundUser._id;
        //console.log(userID);
        google=false;
        res.redirect("/profile");
      })
    }
  })
});



let port = process.env.PORT;
if (port == null || port == "") {
  port = 1003;
}

app.listen(port, function() {
  console.log("Server Started");
});
