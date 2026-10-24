import express from "express"
const app = express.Router()
import {
    getSearchPage,  // importing the functions
    getStudentResult
}from "../controller/studentController.js"
app.get('/',getSearchPage);
app.get('/result', getStudentResult);

export default app;