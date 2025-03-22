/*********************************************************************************
WEB322 – Assignment 04
I declare that this assignment is my own work in accordance with Seneca Academic Policy. No part * of this assignment has
been copied manually or electronically from any other source (including 3rd party web sites) or distributed to other students.
Name: Adharsh Nellikode Kaladharan
Student ID: 167892223 
Date: 05-03-2025
Cyclic Web App URL: https://github.senecapolytechnic.ca/pages/anellikodekaladharan/web322app/
GitHub Repository URL: https://github.com/adharshnk/web322app.git
********************************************************************************/

const express = require("express");
const path = require("path");
const storeService = require("./store-service");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const exphbs = require('express-handlebars');
const Handlebars = require('handlebars');

const app = express();
const PORT = process.env.PORT || 8080;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME || "your-cloud-name",
    api_key: process.env.CLOUDINARY_API_KEY || "197672481759547",
    api_secret: process.env.CLOUDINARY_API_SECRET || "3wRPoCnIDhAVkuJPfYSQ8eiZozw",
    secure: true
});

const upload = multer();

// Handlebars Configuration
app.engine('.hbs', exphbs.engine({
    extname: '.hbs',
    defaultLayout: 'main',
    helpers: {
        navLink: function(url, options) {
            return '<li' + 
                ((url == app.locals.activeRoute) ? ' class="active" ' : '') + 
                '><a href="' + url + '" class="nav-link">' + options.fn(this) + '</a></li>';
        },
        equal: function(lvalue, rvalue, options) {
            if (arguments.length < 3)
                throw new Error("Handlebars Helper equal needs 2 parameters");
            if (lvalue != rvalue) {
                return options.inverse(this);
            } else {
                return options.fn(this);
            }
        },
        safeHTML: function(html) {
            return new Handlebars.SafeString(html);
        }
    }
}));

app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static("public"));

app.use(function(req, res, next) {
    let route = req.path.substring(1);
    app.locals.activeRoute = "/" + (isNaN(route.split('/')[1]) ? route.replace(/\/(?!.*)/, "") : route.replace(/\/(.*)/, ""));
    app.locals.viewingCategory = req.query.category;
    next();
});

// Update root route to redirect to /shop
app.get("/", (req, res) => {
    res.redirect("/shop");
});

app.get("/about", (req, res) => {
    res.render("about");
});

app.get("/items/add", (req, res) => {
    res.render("addItem");
});

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
            res.redirect("/shop"); // Redirect to /shop after adding an item
        }).catch(err => {
            res.status(500).send("Unable to add item");
        });
    }
});

app.get("/shop", async (req, res) => {
    let viewData = {};

    try {
        let items = req.query.category 
            ? await storeService.getPublishedItemsByCategory(req.query.category)
            : await storeService.getPublishedItems();

        items.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));
        viewData.items = items;
        viewData.item = items[0];
    } catch (err) {
        viewData.message = "no results";
    }

    try {
        viewData.categories = await storeService.getCategories();
    } catch (err) {
        viewData.categoriesMessage = "no results";
    }

    res.render("shop", { data: viewData });
});

app.get('/shop/:id', async (req, res) => {
    let viewData = {};

    try {
        let items = [];

        if (req.query.category) {
            items = await storeService.getPublishedItemsByCategory(req.query.category);
        } else {
            items = await storeService.getPublishedItems();
        }

        items.sort((a,b) => new Date(b.postDate) - new Date(a.postDate));

        viewData.items = items;

    } catch(err) {
        viewData.message = "no results";
    }

    try {
        viewData.item = await storeService.getItemById(req.params.id);
    } catch(err) {
        viewData.message = "no results"; 
    }

    try {
        let categories = await storeService.getCategories();
        viewData.categories = categories;
    } catch(err) {
        viewData.categoriesMessage = "no results"
    }

    res.render("shop", {data: viewData})
});

app.get("/items", (req, res) => {
    if (req.query.category) {
        storeService.getItemsByCategory(req.query.category)
            .then(items => res.render("items", { items }))
            .catch(err => res.render("items", { message: "No results found for this category." }));
    } else if (req.query.minDate) {
        storeService.getItemsByMinDate(req.query.minDate)
            .then(items => res.render("items", { items }))
            .catch(err => res.render("items", { message: "No results found for this date." }));
    } else {
        storeService.getAllItems()
            .then(items => res.render("items", { items }))
            .catch(err => res.render("items", { message: "No items found." }));
    }
});

app.get("/categories", (req, res) => {
    storeService.getCategories()
        .then(categories => res.render("categories", { categories }))
        .catch(err => res.render("categories", { message: "no results" }));
});

// Custom 404 page
app.use((req, res) => {
    res.status(404).render("404");
});

// Initialize the server
storeService.initialize()
    .then(() => app.listen(PORT, () => console.log(`Server started on http://localhost:${PORT}`)))
    .catch(err => console.log(`Failed to initialize store service: ${err}`));
