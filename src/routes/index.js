const express = require('express');
const IndexController = require('../controllers/index');

function setRoutes(app) {
    const indexController = new IndexController();

    app.post('/users', indexController.createUser.bind(indexController));
    app.get('/users', indexController.getUsers.bind(indexController));
}

module.exports = setRoutes;