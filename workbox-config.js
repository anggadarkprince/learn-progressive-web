module.exports = {
    "globDirectory": "public/",
    "globPatterns": [
        "**/*.{html,ico,json,css,js}",
        "src/images/*.{jpg,png}",
        "help/**"
    ],
    "swSrc": "public/sw-base.js",
    "swDest": "public/service-worker.js",
    "globIgnores": [
        "help/**",
        "404.html"
    ]
};