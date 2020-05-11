const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;
// cada user puede tener varios places (por eso el arra en places)
const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 6 },
  image: { type: String, required: true },
  places: [{ type: mongoose.Types.ObjectId, required: true, ref: "Place" }], // places es un array con objectId cuyo ref es el schema Place
});

// when you try to save a user, the unique validator will check for duplicate database entries and report them just like any other validation error
userSchema.plugin(uniqueValidator);

module.exports = mongoose.model("User", userSchema);
