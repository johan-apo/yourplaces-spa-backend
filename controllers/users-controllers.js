const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-error");
const User = require("../models/user");

/* ------------------------------ GET ALL USERS ----------------------------- */

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password"); // encuentra todos los usuarios y retorna las propiedades excepto password
  } catch (err) {
    const error = new HttpError(
      "Fetching users failed, please try again later.",
      500
    );
    return next(error);
  }
  // responde objeto, key: users, value: array de objetos con las propiedades excepto password de los users
  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

/* --------------------------------- SIGN UP -------------------------------- */

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }
  const { name, email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "Signing up failed, please try again later.",
      500
    );
    return next(error);
  }

  if (existingUser) {
    // si existe el usuario, rechaza el sign up
    const error = new HttpError(
      "User exists already, please login instead.",
      422
    );
    return next(error);
  }
  // crea un password encriptado
  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError(
      "Could not create user, please try again.",
      500
    );
    return next(error);
  }

  const createdUser = new User({
    name,
    email,
    image: req.file.path,
    password: hashedPassword, // guarda un hashed password
    places: [],
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError(
      "Signing up failed, please try again later.",
      500
    );
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    const error = new HttpError(
      "Signing up failed, please try again later.",
      500
    );
    return next(error);
  }

  // responde con el objeto user creado, key: user, value: propiedades del user
  res
    .status(201)
    .json({ userId: createdUser.id, email: createdUser.email, token: token });
};

/* --------------------------------- LOG IN --------------------------------- */

const login = async (req, res, next) => {
  const { email, password } = req.body;

  let existingUser;

  try {
    existingUser = await User.findOne({ email });
  } catch (err) {
    const error = new HttpError(
      "Logging in failed, please try again later.",
      500
    );
    return next(error);
  }

  if (!existingUser) {
    // si no existe el usuario o la contrasena es erronea...
    const error = new HttpError(
      "Invalid credentials, could not log you in.",
      403
    );
    return next(error);
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError(
      "Could not log you in, please check your credentials and try again.",
      500
    );
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError(
      "Invalid credentials, could not log you in.",
      403
    );
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    const error = new HttpError(
      "Logging in failed, please try again later.",
      500
    );
    return next(error);
  }

  // responde con mensaje y el usuario logueado como objeto
  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    token: token
  });
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
