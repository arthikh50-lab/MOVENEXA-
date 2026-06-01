import { Router } from 'express';
import { getPrediction } from '../controllers/analytics.controller.js';

const router = Router();

router.get('/predict-low-stock', getPrediction);

export default router;
