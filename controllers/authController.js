const User = require("../models/User");
const jwt = require('jsonwebtoken');
const tokenLength = 20;
const maxAge = 1 * 24 * 60 * 60;

//functions
function generateRandomCode(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomCode = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomCode += characters.charAt(randomIndex);
  }
  
  return randomCode;
}

// create json web token
const createToken = (id) => {
  return jwt.sign({ id }, 'a good secret', {
    expiresIn: maxAge
  });
};

// handle errors
const handleErrors = (err) => {
  console.log(err.message, err.code);
  let errors = { email: '', password: '' };

  // duplicate email error
  if (err.code === 11000) {
    errors.email = 'That email is already in use';
    return errors;
  }

  // incorrect email
  if (err.message === 'incorrect email') {
    errors.email = 'That email is not registered';
  }

  // incorrect password
  if (err.message === 'incorrect password') {
    errors.password = 'Password does not match';
  }

  // validation errors
  if (err.message.includes('user validation failed')) {
    Object.values(err.errors).forEach(({ properties }) => {
      errors[properties.path] = properties.message;
    });
  }

  return errors;
}

// controller actions
module.exports.signup_get = (req, res) => {
  res.render('signup', { title: "Sign Up" });
}

module.exports.login_get = (req, res) => {
  res.render('login', { title: "Login" });
}

module.exports.signup_post = async (req, res) => {
  const { email, password, repass } = req.body;
  const authToken = generateRandomCode(tokenLength)

  if (!(password === repass)) {
    const errors = {}
    errors.repass = "Passwords must match"
    res.status(400).json({ errors });
  } 
  else {
    try {
      const user = await User.create({ email, password, token: authToken });
      const jwt = createToken(user._id);
      res.cookie('jwt', jwt, { httpOnly: true, maxAge: maxAge * 1000 });
      res.status(201).json({ user: user._id });
    }
    catch(err) {
      const errors = handleErrors(err);
      res.status(400).json({ errors });
    }
  }
}

module.exports.login_post = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.login(email, password);
    const token = createToken(user._id);
    res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 });
    res.status(200).json({ user: user._id });
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
}

module.exports.logout_get = (req, res) => {
  res.cookie('jwt', '', { maxAge: 1 });
  res.redirect('/');
}