const LocationController = require('./locationController');
const { District } = require('@/api/v1/models');

module.exports = new LocationController(District, 'District');