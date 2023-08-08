const express = require("express");
const app = express();
const bodyParser = require("body-parser");

// Untuk Membaca File + Upload File
const multer = require("multer");
const upload = multer().single("file");

// import firebase + key
const admin = require("firebase-admin");
const credentials = require("./key.json");
admin.initializeApp({
  credential: admin.credential.cert(credentials),
});

//API Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: false })); // Baca Form
app.use(express.static("public")); // Baca Direktori Page
app.get("/form", (req, res) => {
  res.sendFile(__dirname + "/public/index.html"); // Baca Direktori Page
});

// Simple
const db = admin.firestore();

// Create-Photo
app.post("/create/photo", (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).send("Error uploading file");
    }
    try {
      // Menampilkan Data Text + File Input Dari Form
      console.log(req.body);
      console.log(req.file);

      // Ngambil Data Waktu
      const timeStamp = admin.firestore.FieldValue.serverTimestamp();

      // Ngumpulin data Input
      const photo = {
        title: req.body.title,
        description: req.body.description,
        imageURL: "",
        timeStamp: timeStamp,
      };

      //Data Siap
      const response = await db.collection("gallery").add(photo);

      // Upload gambar ke Firebase Storage
      const bucket = admin.storage().bucket();
      const file = req.file;
      const fileRef = bucket.file(`${file.originalname}`);
      await fileRef.save(file.buffer);

      // Mendapatkan URL gambar dari Firebase Storage
      const imageURL = await fileRef.getSignedUrl({
        action: "read",
        expires: "01-01-2030",
      });

      // Memperbarui isi imageURL Dalam Data Siap
      await response.update({ imageURL: imageURL });

      // Eksekusi
      res.send(response);
    } catch (error) {
      res.status(500).send(error.message);
    }
  });
});

// Read-Photo
app.get("/read/photos", async (req, res) => {
  try {
    // Mengambil data dari koleksi "gallery"
    const snapshot = await db.collection("gallery").get();

    const photos = [];
    // Mengolah setiap dokumen dalam koleksi
    snapshot.forEach((doc) => {
      const data = doc.data();
      photos.push({
        id: doc.id,
        title: data.title,
        description: data.description,
        imageURL: data.imageURL,
        timeStamp: data.timeStamp,
      });
    });
    res.send(photos);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

//Delete Photo
app.delete("/delete/:id", async (req, res) => {
  try {
    const response = await db.collection("gallery").doc(req.params.id).delete();
    res.send(response);
  } catch (error) {
    res.send(error);
  }
});

//Signup Admin Bisa
// app.post("/signup", async (req, res) => {
//   console.log(req.body);
//   const user = {
//     email: req.body.email,
//     password: req.body.password,
//   };
//   const userResponse = await admin.auth().createUser({
//     email: user.email,
//     password: user.password,
//     emailVerified: false,
//     disabled: false,
//   });
//   res.json(userResponse);
// });

// Login Admin Gabisa
// app.post("/login", (req, res) => {
//   const adminCredentials = {
//     username: "superadmin",
//     password: "admin123",
//   };
//   const user = {
//     email: req.body.email,
//     password: req.body.password,
//   };

//   if (user.email === adminCredentials.username && user.password === adminCredentials.password) {
//     // Successful login
//     res.redirect("./pages.dashboard.html"); // Redirect to the dashboard or desired page
//   } else {
//     res.status(401).send("Invalid Credentials");
//   }
// });

//Port Test Lokal
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on PORT ${PORT}.`);
});
