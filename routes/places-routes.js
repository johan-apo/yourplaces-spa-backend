const express = require("express");
const { check } = require("express-validator");

const placesControllers = require("../controllers/places-controllers");
const fileUpload = require("../middleware/file-upload");
const checkAuth = require("../middleware/check-auth")

const router = express.Router();

// Ruta principal api/places/

router.get("/:pid", placesControllers.getPlaceById); // obtener lugar por id

router.get("/user/:uid", placesControllers.getPlacesByUserId); // obtener lugar(es) por id del usuario

router.use(checkAuth) // si falla, evita la ejecucion del flujo

router.post(
  "/",
  fileUpload.single("image"),
  [
    // comprueba los fields title, y address que no esten vacios y description con una cantidad minima de 5 caracteres
    check("title").not().isEmpty(),
    check("description").isLength({ min: 5 }),
    check("address").not().isEmpty(),
  ],
  placesControllers.createPlace
);

router.patch(
  "/:pid",
  [
    // comprueba fields title no este vcion y description con al menos 5 caracteres
    check("title").not().isEmpty(),
    check("description").isLength({ min: 5 }),
  ],
  placesControllers.updatePlace
);

router.delete("/:pid", placesControllers.deletePlace);

module.exports = router;
