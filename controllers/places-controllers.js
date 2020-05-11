const fs = require("fs");

const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../models/http-error");
const getCoordsForAddress = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");

/* ----------------------------- GET PLACE BY ID ---------------------------- */

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a place.",
      500
    );
    return next(error);
  }
  if (!place) {
    const error = new HttpError(
      "Could not find a place for the provided id.",
      404
    );
    return next(error);
  }
  // responde al cliente con un object, key: place, value: propiedades del place
  res.json({ place: place.toObject({ getters: true }) });
};

/* -------------------------- GET PLACES BY USER ID ------------------------- */

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let userWithPlaces;
  try {
    // debido al ref en los schemas se puede emplear populate
    // encuentra el user por id y luego al user agrega un campo donde se almacenan los ids de los places
    userWithPlaces = await User.findById(userId).populate("places");
  } catch (err) {
    const error = new HttpError(
      "Fetching places failed, please try again later.",
      500
    );
    return next(error);
  }

  if (!userWithPlaces || userWithPlaces.places.length === 0) {
    return next(
      new HttpError("Could not find places for the provided user id.", 404)
    );
  }
  // responde con un object, key: places, value: array de objetos y cada uno es un place con sus propiedades
  res.json({
    places: userWithPlaces.places.map((place) =>
      place.toObject({ getters: true })
    ),
  });
};

/* ------------------------------ CREATE PLACE ------------------------------ */

const createPlace = async (req, res, next) => {
  // el user ingresa tres fields: TITLE, DESCRIPTION y ADDRESS
  // errors indica los errores ocurridos en la validacion de los fields
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { title, description, address } = req.body;

  let coordinates;
  try {
    // getCoordsForAddress es una funcion que emplea API de Google Maps
    coordinates = await getCoordsForAddress(address); // toma parametro la ubicacion escrita y retorna un array de coordenadas lat y lon
  } catch (error) {
    return next(error);
  }

  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image: req.file.path,
    creator: req.userData.userId, // es el objectId del user
  });

  let user;

  try {
    user = await User.findById(req.userData.userId); // user es el documento de la coleccion users con objectId de creator
  } catch (err) {
    const error = new HttpError(
      "Creating place failed, please try again.",
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError("Could not find user for provided id", 404);
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess }); // anade el guardado a la sesion, si ocurre algo se deshace
    user.places.push(createdPlace); // anade createdPlace en el array places del user con objectId encontrado
    await user.save({ session: sess }); // anade el guardado a la sesion, si ocurre algo se deshace
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Creating place failed, please try again.",
      500
    );
    return next(error); // detiene la ejecucion del codigo
  }
  // responde objeto, key: place, value: object place con las propiedades ingresadas
  res.status(201).json({ place: createdPlace });
};

/* ------------------------------ UPDATE PLACE ------------------------------ */

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new HttpError("Invalid inputs passed, please check your data.", 422);
  }

  const { title, description } = req.body;
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update place.",
      500
    );
    return next(error);
  }

  if (place.creator.toString() !== req.userData.userId) {
    const error = new HttpError(
      "You are not allowed to edit this place.",
      401
    );
    return next(error);
  }

  place.title = title;
  place.description = description;

  try {
    await place.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update place",
      500
    );
    return next(error);
  }
  // responde un objeto, key: place, value: place con propiedades actualizadas
  // getters: true permite transformar el ObjectId a formato raw
  res.status(200).json({ place: place.toObject({ getters: true }) });
};

/* ------------------------------ DELETE PLACE ------------------------------ */

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;
  try {
    place = await Place.findById(placeId).populate("creator"); // encuentra el place mediante id y conecta con campo creator
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete place.",
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError("Could not find place for this id.", 404);
    return next(error);
  }

  if (place.creator.id !== req.userData.userId) {
    const error = new HttpError(
      "You are not allowed to delete this place.",
      403
    );
    return next(error);
  }

  const imagePath = place.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.remove({ session: sess });
    place.creator.places.pull(place); // elimina el place del array places del creator
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete place.",
      500
    );
    return next(error);
  }
  fs.unlink(imagePath, (err) => {
    console.log(err);
  });
  // responde un texto
  res.status(200).json({ message: "Deleted place." });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
