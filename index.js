const express = require("express")

const app = express()
app.use(express.json())
app.use(express.urlencoded({extended: true}))

app.get("/api/tryserver", (req, res) => {
    res.json({
        message: "dale"
    })
})
app.listen(8080, () => {
    console.log("Server running");
    
})