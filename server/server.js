const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

const routes = require('@/api/v1/routes/routes'); 
const { errorConverter, errorHandler } = require('@/api/v1/middleware/errorHandler');
const ApiError = require('@/utils/ApiError');

const app = express();

const ALLOWED_ORIGIN = process.env.VITE_API_URL || 'http://localhost:5173';

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', true);

app.use(
    cors({
        origin: [ALLOWED_ORIGIN, 'http://localhost:5173'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    })
);

app.get('/health', (req, res) => res.status(200).send('OK'));
app.use('/api/v1', routes);
app.use((req, res, next) => {
    next(new ApiError(404, `Route ${req.method} ${req.originalUrl} not found`));
});
app.use(errorConverter);
app.use(errorHandler);

module.exports = app;