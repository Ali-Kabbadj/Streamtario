import { config } from 'dotenv';
import { startServer } from './api/server.js';

config({ path: 'D:/Git/Personal/Streamtario/.env' });
const PORT = 8004;

startServer(PORT);