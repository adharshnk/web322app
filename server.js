/*********************************************************************************
WEB322 – Assignment 03
I declare that this assignment is my own work in accordance with Seneca Academic Policy. No part * of this assignment has
been copied manually or electronically from any other source (including 3rd party web sites) or distributed to other students.
Name: Adharsh Nellikode Kaladharan
Student ID:167892223 
Date:06-02-2025
Cyclic Web App URL: https://github.senecapolytechnic.ca/pages/anellikodekaladharan/web322app/
GitHub Repository URL: ______________________________________________________
********************************************************************************/

const express = require("express");
const path = require("path");
const storeService = require("./store-service");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

const app = express();
const PORT = process.env.PORT || 8080;

// Configure Cloudinary
cloudinary.config({
    cloud_name: "your-cloud-name",
    api_key: "197672481759547",
    api_secret: "3wRPoCnIDhAVkuJPfYSQ8eiZozw",
    secure: true
});

const upload = multer();

// Middleware to serve static files (CSS, images, etc.)
app.use(express.static("public"));

// Redirect root to /about
app.get("/", (req, res) => {
    res.redirect("/about");
});

// Serve about.html
app.get("/about", (req, res) => {
    res.sendFile(path.join(__dirname, "views/about.html"));
});

// Serve addItem.html
app.get("/items/add", (req, res) => {
    res.sendFile(path.join(__dirname, "views/addItem.html"));
});

// Handle form submission for adding an item
app.post("/items/add", upload.single("featureImage"), (req, res) => {
    if (req.file) {
        let streamUpload = (req) => {
            return new Promise((resolve, reject) => {
                let stream = cloudinary.uploader.upload_stream(
                    (error, result) => {
                        if (result) {
                            resolve(result);
                        } else {
                            reject(error);
                        }
                    }
                );
                streamifier.createReadStream(req.file.buffer).pipe(stream);
            });
        };

        async function upload(req) {
            let result = await streamUpload(req);
            return result;
        }

        upload(req).then((uploaded) => {
            processItem(uploaded.url);
        });
    } else {
        processItem("");
    }

    function processItem(imageUrl) {
        req.body.featureImage = imageUrl;
        storeService.addItem(req.body).then(() => {
            res.redirect("/items");
        }).catch(err => {
            res.status(500).send("Unable to add item");
        });
    }
});

// Get all published items (shop page)
app.get("/shop", (req, res) => {
    storeService.getPublishedItems()
        .then(items => res.json(items))
        .catch(err => res.status(404).json({ message: err }));
});

// Get all items with optional filtering
app.get("/items", (req, res) => {
    if (req.query.category) {
        storeService.getItemsByCategory(req.query.category)
            .then(items => res.json(items))
            .catch(err => res.status(404).send(err));
    } else if (req.query.minDate) {
        storeService.getItemsByMinDate(req.query.minDate)
            .then(items => res.json(items))
            .catch(err => res.status(404).send(err));
    } else {
        storeService.getAllItems()
            .then(items => res.json(items))
            .catch(err => res.status(404).json({ message: err }));
    }
});

// Get a single item by ID
app.get("/item/:id", (req, res) => {
    storeService.getItemById(req.params.id)
        .then(item => res.json(item))
        .catch(err => res.status(404).send(err));
});

// Get all categories
app.get("/categories", (req, res) => {
    storeService.getCategories()
        .then(categories => res.json(categories))
        .catch(err => res.status(404).json({ message: err }));
});

// Handle 404 - Page Not Found
app.use((req, res) => {
    res.status(404).send("Page Not Found");
});

// Initialize store service and start the server
storeService.initialize()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server started on http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.log("Failed to initialize store service:", err);
    });
