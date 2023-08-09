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
  storageBucket: "gs://joyboy-online-gallery.appspot.com/",
});

//API Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: false })); // Baca Form
app.use(express.static("public")); // Baca Direktori Page
app.get("/form", (req, res) => {
  res.sendFile(__dirname + "/public/index.html"); // Baca Direktori Page
});
app.get("/gallery", (req, res) => {
  res.sendFile(__dirname + "/public/gallery.html");
});

// Simple
const db = admin.firestore();
const auth = admin.auth();

// Create-Photo
app.post("/create/photos", (req, res) => {
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
      res.redirect("/form");
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

// Update-Photo
app.post("/update/photos", (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).send("Error uploading file");
    }
    try {
      // Menampilkan Data Text + File Input Dari Form
      console.log(req.body);
      console.log(req.file);

      // Ngambil Id + Data Waktu
      const photoId = req.body.idUpdate;
      const newtimeStamp = admin.firestore.FieldValue.serverTimestamp();

      // Upload gambar ke Firebase Storage
      const bucket = admin.storage().bucket();
      const file = req.file;
      const fileRef = bucket.file(`${file.originalname}`);
      await fileRef.save(file.buffer);

      // Mendapatkan URL gambar dari Firebase Storage
      const imageURLUpdate = await fileRef.getSignedUrl({
        action: "read",
        expires: "01-01-2030",
      });

      // Ngumpulin data baru Input
      const newPhoto = {
        title: req.body.titleUpdate,
        description: req.body.descriptionUpdate,
        imageURL: imageURLUpdate,
        timeStamp: newtimeStamp,
      };

      // Eksekusi
      await db.collection("gallery").doc(photoId).update(newPhoto);

      res.redirect("/gallery");
    } catch (error) {
      res.status(500).send(error.message);
    }
  });
});

//Delete Photo
app.delete("/delete/:id", async (req, res) => {
  try {
    // Hapus Data Firestore
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

// Read Total Photo
app.get("/gallery/count", async (req, res) => {
  try {
    const snapshot = await db.collection("gallery").get();
    const totalPhotos = snapshot.size;
    res.send({ totalPhotos });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Read Total User
app.get("/users/count", async (req, res) => {
  try {
    const userRecords = await auth.listUsers();
    const totalUsers = userRecords.users.length;
    res.send({ totalUsers });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get("/users", async (req, res) => {
  try {
    const userRecords = await auth.listUsers();
    const users = userRecords.users.map((user) => ({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    }));
    res.send(users);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

//Port Test Lokal
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on PORT ${PORT}.`);
});
