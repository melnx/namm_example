//For Reset Password
var async = require('async');
var crypto = require('crypto');
var _ = require('underscore');
var passwordHash = require('password-hash');
var md5 = require('blueimp-md5');
var flash = require('express-flash');
var mongoose = require('mongoose');
var config = null;

Schema = mongoose.Schema;

var homePages = null;

function setupUserModel(userModel){

    homePages = userModel.$home;

    var userProps = {
        username: {type: String, unique : true, $hidden:true, $immutable:true},
        password: {type: String, $internal:true},
        email: {type: String, $hidden:true, $immutable:true},
        phone: {type: String, $hidden:true},
        fullName: {type: String, $hidden:true},
        role: {type: String, $internal:true},
        gravatarHash: String,
        profileImage: String,
        resetPasswordToken: {type: String, $internal:true},
        resetPasswordExpires: {type: Date, $internal:true},
        name: String,
        disabled: {type: Boolean, $internal:true},
    };

    userModel.role = {
        type: String,
        $private: true,
        $immutable: true,
        //$internal: true,
    };
    Object.keys(userProps).forEach(function(property){
        if(!userModel[property]){
            userModel[property] = userProps[property];
        }
    });

    var clone = _.clone(userModel);
    Object.keys(clone).forEach(function(property) {
        if (property[0] == '$') {
            delete clone[property];
        }
    });

    userProps = _.extend(userProps, clone);

    mongoose.model('User', new Schema(userProps));
}

var mailgun = null;
function initMailgunIfNeeded(){
    if(mailgun == null){
        var mg_api_key = config.mg_api_key;
        var mg_domain = config.mg_domain;
        mailgun = require('mailgun-js')({
            apiKey: mg_api_key,
            domain: mg_domain
        });
    }
}

function setupAuthentication(app, conf) {
  config = conf;


  var User = mongoose.model('User');

  var passport = require('passport');
  var expressSession = require('express-session');
  var MongoStore = require('connect-mongo')(expressSession);
  var LocalStrategy = require('passport-local');

  app.use(expressSession({
    secret: 'mySecretKey',
    maxAge: new Date(Date.now() + 3600000),
    store: new MongoStore(
      { mongooseConnection: mongoose.connection },
      function(err){
          console.log(err || 'connect-mongodb setup ok');
      }),
    resave: false,
    saveUninitialized: true
  }));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser(function(user, done) {
    done(null, user._id);
  });

  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

  var isValidPassword = function(user, password) {
      //user object from Mongoose connection. user.password is db password.
      console.log("LOGIN:", user._id);

      if(user.disabled == true) {
          console.log("DISABLED ACCOUNT LOGIN ATTEMPT: ", user.username);
          return false;
      }

      return passwordHash.verify(password, user.password);
  }

  // Generates hash using bCrypt
  var createHash = function(password) {
    return passwordHash.generate(password);
  }


  // passport/login.js
  passport.use(new LocalStrategy({
      passReqToCallback: true,
      badRequestMessage: "You forgot to enter your username or password!"
    },
    function(req, username, password, done) {
      // check in mongo if a user with username exists or not
      console.log('LOGIN: (attempt) ' + username);

      User.findOne({
          'username': username
        },
        function(err, user) {
          // In case of any error, return using the done method
          if (err) {
            return done(err);
          }
          // Username does not exist, log error & redirect back
          if (!user) {
            console.log('LOGIN: (does not exist) ' + username);
            return done(null, false,
              req.flash('error', 'Invalid username or password. <a href="/forgot">Click here to reset your password.</a>'));
          }
          // User exists but wrong password, log the error
          if (!isValidPassword(user, password)) {
            console.log('LOGIN: (bad password) ');
            return done(null, false,
              req.flash('error', 'Invalid username or password. <a href="/forgot">Click here to reset your password.</a>'));
          }
          // User and password both match, return user from
          // done method which will be treated like success
          return done(null, user);
        }
      );
    }));

  passport.use('signup', new LocalStrategy({
      passReqToCallback: true
    },
    function(req, username, password, done) {
      //console.log(req);
      //console.log(username);
      //console.log(password);
      var findOrCreateUser = function() {
        // find a user in Mongo with provided username
        console.log('SIGNUP: (attempt)');

        if (req.body.secretkey != '1Melnx!') {
          console.log("SECRET KEY DOESN'T MATCH");
          return done(null, false,
            req.flash('error', "Secret Key didn't match. Please try again!"));
        }

        User.findOne({
          'username': username
        }, function(err, user) {
          // In case of any error return
          if (err) {
            console.log('Error in SignUp: ' + err);
            return done(err);
          }
          // already exists
          if (user) {
            console.log('SIGNUP: (already exists) ');
            return done(null, false,
              req.flash('error', 'That user already exists. <a href="/forgot">Forgot your password?</a>'));
          } else {
            if (req.body.confirmpassword != password) {
              console.log('SIGNUP: passwords didnt match');
              console.log(req.body.confirmpassword);
              console.log(password);

              return done(null, false,
                req.flash('error', "Passwords didn't match. Please try again!"));

            } else {
              // if there is no user with that email
              // create the user
              var newUser = new User();
              // set the user's local credentials

              Object.keys(req.body).forEach(function(k) {
                newUser[k] = req.body[k];
              });

              newUser.username = username;
              newUser.password = createHash(password);
              newUser.email = req.body.username;
              newUser.fullName = req.body.fullName;
              newUser.name = req.body.fullName;
              newUser.phone = req.body.phone;
              newUser.gravatarHash = md5(req.body.username.trim().toLowerCase());
              newUser.profileImage = "http://www.gravatar.com/avatar/" + newUser.gravatarHash;
              // save the user
              newUser.save(function(err) {
                if (err) {
                  console.log('Error in Saving user: ' + err);
                  throw err;
                }
                console.log('User Registration succesful');
                return done(null, newUser);
              });
            }
          }
        });
      };

      // Delay the execution of findOrCreateUser and execute
      // the method in the next tick of the event loop
      process.nextTick(findOrCreateUser);
    }));

  /* GET login page. */
  app.get('/', function(req, res) {
    // Display the Login page with any flash message, if any
    res.redirect('/login');
  });

  /* Handle Login POST */
  /*app.post('/login', passport.authenticate('local', {
    successRedirect: '/Campaigns',
    failureRedirect: '/login',
    failureFlash: true
  }));*/
  app.post('/login', function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
        if (err) { return next(err); }
        // Redirect if it fails
        if (!user) { return res.redirect('/login'); }
        req.logIn(user, function(err) {
            if (err) { return next(err); }
            // Redirect if it succeeds

            var redirectPath = homePages ? homePages[user.role || "user"] : "/";
            return res.redirect(redirectPath);
        });
    })(req, res, next);
  });

  // stub out login GET in case we want to use this later
  app.get('/login', function(req, res) {
    res.render('login');
  });

  /* GET Registration Page */
  app.get('/signup', function(req, res) {
    res.render('signup');
    //res.render('register', {
    //  message: req.flash('message')
    //});
  });

  /* Handle Registration POST */
  /*app.post('/signup', passport.authenticate('signup', {
    successRedirect: '/Posts',
    failureRedirect: '/signup',
    failureFlash: true
  }));*/
  app.post('/signup', function(req, res, next) {
    passport.authenticate('signup', function(err, user, info) {
        if (err) { return next(err); }
        // Redirect if it fails
        if (!user) { return res.redirect('/signup'); }
        req.logIn(user, function(err) {
            if (err) { return next(err); }
            // Redirect if it succeeds

            var redirectPath = homePages ? homePages[user.role || "user"] : "/";
            return res.redirect(redirectPath);
        });
    })(req, res, next);
  });

  app.get('/forgot', function(req, res) {
    res.render('forgot', {
      user: req.user
    });
  });

  app.post('/forgot', function(req, res, next) {
    async.waterfall([
      function(done) {
        crypto.randomBytes(20, function(err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function(token, done) {
        User.findOne({
          username: req.body.username
        }, function(err, user) {
          console.log(user);
          if (!user) {
            req.flash('success', 'Please check your email to complete password reset.');
            return res.redirect('/forgot');
          }

          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 86400000;

          user.save(function(err) {
            req.flash('success', 'Please check your email to complete password reset.');
            done(err, token, user);
          });
        });
      },
      function(token, user, done) {
        var reset_email = {
          from: 'Banzai Bot <no-reply@messaging.banzaihq.com>',
          to: user.username,
          subject: 'Reset your Banzai Password',
          text: "You are receiving this because you (or someone else) " +
            "requested the reset of the password for your account.\n\n" +
            "http://" + req.headers.host + "/reset/" + token + "\n\n"
        };

        initMailgunIfNeeded();

        mailgun.messages().send(reset_email, function(error, body) {
          console.log("Body:\n" + body.message + "\nErr:\n" + error + "\nUser:\n" + user.username);
          done(error, 'done');
        });
      }
    ], function(err) {
      if (err) return next(err);
      res.redirect('/forgot?donereset=true');
    });
  });

  app.get('/reset/:token', function(req, res) {
    User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: {
        $gt: Date.now()
      }
    }, function(err, user) {
      if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect('/forgot');
      }
      res.render('reset', {
        user: req.user,
        token: req.params.token
      });
    });
  });

  app.post('/reset/:token', function(req, res) {
    console.log("Attempting to reset password");
    async.waterfall([
      function(done) {
        User.findOne({
          resetPasswordToken: req.params.token,
          resetPasswordExpires: {
            $gt: Date.now()
          }
        }, function(err, user) {
          if (!user) {
            req.flash('error', 'Password reset token is invalid or expired.');
            return res.redirect('/forgot');
          }
          if (req.body.password == req.body.confirmpassword) {
            user.password = createHash(req.body.password);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          } else {
            req.flash('error', "Passwords didn't match. Please try again!");
            return res.redirect('/reset/' + req.params.token);
          }
        });
      },
      function(user, done) {
        var reset_email = {
          from: 'Banzai Bot <no-reply@messaging.banzaihq.com>',
          to: user.username,
          subject: 'Your Banzai Password Has Been Reset',
          text: "Your Banzai password has been successfully reset."
        };

        initMailgunIfNeeded();

        mailgun.messages().send(reset_email, function(error, body) {
          console.log("Body:\n" + body.message + "\nErr:\n" + error + "\nUser:\n" + user.username);
          req.flash('success', 'Your password has been succesfully reset');
          done(error, 'done');
        });
      }
    ], function(err) {
      res.redirect('/Dashboard/');
    });
  });

  /* Handle Logout */
  app.get('/signout', function(req, res) {
    req.logout();
    res.redirect('/');
  });
}

module.exports = {
    setupAuthentication:setupAuthentication,
    setupUserModel: setupUserModel,
};
