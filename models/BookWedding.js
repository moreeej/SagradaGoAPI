const mongoose = require("mongoose");

const WeddingSchema = new mongoose.Schema(
    {
        date:{
            type: Date,
            required: true
        },
        time:{
            type: String,
            required: true
        },
        attendees:{
            type: Number,
            required: true
        },
        contact_number:{
            type: String,
            required: true
        },
        groom_last_name:{
            type: String,
            required: true
        },
        groom_first_name:{
            type: String,
            required: true
        },
        groom_middle_name:{
            type: String,
            required: true
        },
        groom_pic:{
            type: String,
            required: true
        },
        bride_last_name:{
            type: String,
            required: true
        },
        bride_first_name:{
            type: String,
            required: true
        },
        bride_middle_name:{
            type: String,
            required: true
        },
        bride_pic:{
            type: String,
            required: true
        },
        marriage_docu:{
            type: String,
            required: true
        },
        groom_cenomar:{
            type: String,
        },
        bride_cenomar:{
            type: String,
        },
        groom_baptismal_cert:{
            type: String,
            required: true
        },
        bride_baptismal_cert:{
            type: String,
            required: true
        },
        groom_confirmation_cert:{
            type: String,
            required: true
        },
        bride_confirmation_cert:{
            type: String,
            required: true
        },
        groom_permission:{
            type: String,
        },
        bride_permission:{
            type: String,
        },
        
    }
);

const WeddingModel = mongoose.model("WeddingBookings", WeddingSchema);
module.exports = WeddingModel;