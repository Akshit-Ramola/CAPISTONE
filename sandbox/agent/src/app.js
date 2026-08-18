import express from 'express'
import morgan from 'morgan';
import fs from 'fs';

const WORKING_DIR = '/workspace';

const app = express()

app.use(morgan('dev'));

app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Hello from sandbox agent',
        status: 'success',
    });
});

app.get("/list-files", async (req, res) => {
    if (!fs.existsSync(WORKING_DIR)) {
        await fs.promises.mkdir(WORKING_DIR, { recursive: true });
    }
    const files = await fs.promises.readdir(WORKING_DIR);

    res.status(200).json({
        message: 'Elements in working directory',
        files,
    });
})


export default app;