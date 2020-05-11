const fs = require("fs");
const path = require("path");

const express = require("express"); // framework node
const bodyParser = require("body-parser"); // para el req.body
const mongoose = require("mongoose"); // facilita MongoDB

const placesRoutes = require("./routes/places-routes"); // controller para /api/places
const usersRoutes = require("./routes/users-routes"); // controller para /api/users
const HttpError = require("./models/http-error"); // maneja errores

const app = express();

app.use(bodyParser.json());

app.use("/uploads/images", express.static(path.join("uploads", "images")));

// Manejo de CORS (Cross Origin Resource Sharing)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
  next();
});

// Rutas y controladores
app.use("/api/places", placesRoutes); // rutas de lugares
app.use("/api/users", usersRoutes); // rutas usuarios

// Si no encuentra endpoint, envia un error 404
app.use((req, res, next) => {
  const error = new HttpError("Could not find this route.", 404);
  throw error;
});

// argumento error permite solo ejecucion cuando exista error
app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }
  if (res.headersSent) {
    // verifica si un response ha sido enviado
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || "An unknown error ocurred!" });
});

mongoose
  .connect(
    `mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@mern-test-shard-00-00-rezwy.mongodb.net:27017,mern-test-shard-00-01-rezwy.mongodb.net:27017,mern-test-shard-00-02-rezwy.mongodb.net:27017/${process.env.DB_NAME}?ssl=true&replicaSet=mern-test-shard-0&authSource=admin&retryWrites=true&w=majority`,
    { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true }
  )
  .then(() => {
    app.listen(process.env.PORT ||5000);
    console.log("Server and database connected!");
  })
  .catch((err) => {
    console.log(err);
  });
