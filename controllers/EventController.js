const EventModel = require("../models/Event");
const supabase = require("../config/supabaseClient");

/**
 * Get all events (for admin)
 * GET /api/admin/getAllEvents
 * Query params: page (optional), limit (optional)
 */
async function getAllEvents(req, res) {
  try {
    const { page = 1, limit = 50 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const events = await EventModel.find()
      .sort({ date: -1 }) // upcoming first
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await EventModel.countDocuments();

    const stats = {
      total: totalCount,
    };

    res.status(200).json({
      message: "Events retrieved successfully.",
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit)),
      },
      stats,
    });
  } catch (err) {
    console.error("Error getting all events:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get single event by ID
 * GET /api/admin/getEvent/:eventId
 */
async function getEventById(req, res) {
  try {
    const { eventId } = req.params;

    const event = await EventModel.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    res.status(200).json({
      message: "Event retrieved successfully.",
      event,
    });
  } catch (err) {
    console.error("Error getting event:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Create new event
 * POST /api/admin/createEvent
 * Body: { title, date, location, description, image }
 */
async function createEvent(req, res) {
  try {
    const { title, date, location, description } = req.body;
    let image = "";

    if (req.file) {
      try {
        // Helper function to ensure bucket exists
        const ensureBucketExists = async (bucketName) => {
          // Check if bucket exists
          const { data: buckets, error: listError } = await supabase.storage.listBuckets();
          
          if (listError) {
            console.error("Error listing buckets:", listError);
            return false;
          }
          
          const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
          
          if (!bucketExists) {
            console.log(`Bucket "${bucketName}" does not exist. Attempting to create...`);
            // Try to create the bucket - make it public so images can be accessed
            const { data: createData, error: createError } = await supabase.storage.createBucket(bucketName, {
              public: true, // Make bucket public so images can be accessed directly
              allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
              fileSizeLimit: 5242880 // 5MB limit
            });
            
            if (createError) {
              console.error(`Error creating bucket "${bucketName}":`, createError);
              // If bucket creation fails, it might already exist or there's a permission issue
              // Try to continue anyway - the upload might still work
              console.log("Continuing despite bucket creation error...");
            } else {
              console.log(`Bucket "${bucketName}" created successfully`);
            }
          }
          
          return true;
        };

        // Ensure events bucket exists
        const bucketReady = await ensureBucketExists("events");
        if (!bucketReady) {
          return res.status(500).json({ 
            message: "Storage bucket not available. Please contact administrator to set up Supabase storage bucket 'events'." 
          });
        }

        const file = req.file;
        const fileName = `${Date.now()}-${file.originalname || 'event-image.jpg'}`;
        console.log(`Uploading event image to Supabase: ${fileName}`);
        
        // Upload to Supabase storage
        const { data, error } = await supabase.storage
          .from("events")
          .upload(fileName, file.buffer, { 
            contentType: file.mimetype || 'image/jpeg',
            upsert: false 
          });
        
        if (error) {
          console.error("Supabase upload error (event image):", error);
          if (error.message?.includes("Bucket not found") || error.message?.includes("The resource was not found")) {
            return res.status(500).json({ 
              message: "Storage bucket 'events' not found. Please create it in Supabase dashboard or contact administrator." 
            });
          }
          return res.status(500).json({ 
            message: `Failed to upload event image: ${error.message || "Please try again."}` 
          });
        }

        // Get public URL for the uploaded image
        const { data: urlData } = supabase.storage
          .from("events")
          .getPublicUrl(data.path);
        
        image = urlData.publicUrl;
        console.log("Event image uploaded successfully:", image);
      } catch (uploadError) {
        console.error("Error uploading event image:", uploadError);
        return res.status(500).json({ 
          message: `Failed to upload event image: ${uploadError.message || "Please try again."}` 
        });
      }
    }

    const event = new EventModel({ title, date, location, description, image });
    await event.save();

    res.status(201).json({
      message: "Event created successfully.",
      event,
    });
  } catch (err) {
    console.error("Error creating event:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Update existing event
 * PUT /api/admin/updateEvent
 * Body: { eventId, title, date, location, description, image }
 */
async function updateEvent(req, res) {
  try {
    const { eventId, title, date, location, description } = req.body;

    const event = await EventModel.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found." });

    event.title = title || event.title;
    event.date = date || event.date;
    event.location = location || event.location;
    event.description = description || event.description;

    if (req.file) {
      try {
        // Delete old image from Supabase if it exists and is a Supabase URL
        if (event.image && event.image.includes('supabase')) {
          // Extract the path from the Supabase URL
          // URL format: https://[project].supabase.co/storage/v1/object/public/events/filename
          const urlParts = event.image.split('/');
          const pathIndex = urlParts.indexOf('events');
          if (pathIndex !== -1 && pathIndex < urlParts.length - 1) {
            // Get the filename after 'events'
            const oldPath = urlParts[pathIndex + 1];
            console.log(`Deleting old event image from Supabase: ${oldPath}`);
            const { error: deleteError } = await supabase.storage
              .from("events")
              .remove([oldPath]);
            
            if (deleteError) {
              console.error("Error deleting old image from Supabase:", deleteError);
              // Continue with upload even if delete fails
            }
          }
        }

        // Helper function to ensure bucket exists
        const ensureBucketExists = async (bucketName) => {
          const { data: buckets, error: listError } = await supabase.storage.listBuckets();
          
          if (listError) {
            console.error("Error listing buckets:", listError);
            return false;
          }
          
          const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
          
          if (!bucketExists) {
            console.log(`Bucket "${bucketName}" does not exist. Attempting to create...`);
            const { data: createData, error: createError } = await supabase.storage.createBucket(bucketName, {
              public: true,
              allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
              fileSizeLimit: 5242880
            });
            
            if (createError) {
              console.error(`Error creating bucket "${bucketName}":`, createError);
              console.log("Continuing despite bucket creation error...");
            } else {
              console.log(`Bucket "${bucketName}" created successfully`);
            }
          }
          
          return true;
        };

        // Ensure events bucket exists
        const bucketReady = await ensureBucketExists("events");
        if (!bucketReady) {
          return res.status(500).json({ 
            message: "Storage bucket not available. Please contact administrator to set up Supabase storage bucket 'events'." 
          });
        }

        const file = req.file;
        const fileName = `${Date.now()}-${file.originalname || 'event-image.jpg'}`;
        console.log(`Uploading event image to Supabase: ${fileName}`);
        
        // Upload to Supabase storage
        const { data, error } = await supabase.storage
          .from("events")
          .upload(fileName, file.buffer, { 
            contentType: file.mimetype || 'image/jpeg',
            upsert: false 
          });
        
        if (error) {
          console.error("Supabase upload error (event image):", error);
          if (error.message?.includes("Bucket not found") || error.message?.includes("The resource was not found")) {
            return res.status(500).json({ 
              message: "Storage bucket 'events' not found. Please create it in Supabase dashboard or contact administrator." 
            });
          }
          return res.status(500).json({ 
            message: `Failed to upload event image: ${error.message || "Please try again."}` 
          });
        }

        // Get public URL for the uploaded image
        const { data: urlData } = supabase.storage
          .from("events")
          .getPublicUrl(data.path);
        
        event.image = urlData.publicUrl;
        console.log("Event image uploaded successfully:", event.image);
      } catch (uploadError) {
        console.error("Error uploading event image:", uploadError);
        return res.status(500).json({ 
          message: `Failed to upload event image: ${uploadError.message || "Please try again."}` 
        });
      }
    }

    await event.save();

    res.status(200).json({
      message: "Event updated successfully.",
      event,
    });
  } catch (err) {
    console.error("Error updating event:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Delete event
 * DELETE /api/admin/deleteEvent/:eventId
 */
async function deleteEvent(req, res) {
  try {
    const { eventId } = req.params;

    const event = await EventModel.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found." });

    // Delete image from Supabase if it exists and is a Supabase URL
    if (event.image && event.image.includes('supabase')) {
      // Extract the path from the Supabase URL
      // URL format: https://[project].supabase.co/storage/v1/object/public/events/filename
      const urlParts = event.image.split('/');
      const pathIndex = urlParts.indexOf('events');
      if (pathIndex !== -1 && pathIndex < urlParts.length - 1) {
        // Get the filename after 'events'
        const imagePath = urlParts[pathIndex + 1];
        console.log(`Deleting event image from Supabase: ${imagePath}`);
        const { error: deleteError } = await supabase.storage
          .from("events")
          .remove([imagePath]);
        
        if (deleteError) {
          console.error("Error deleting image from Supabase:", deleteError);
          // Continue with deletion even if image delete fails
        }
      }
    }

    await EventModel.findByIdAndDelete(eventId);

    res.status(200).json({
      message: "Event deleted successfully.",
      event,
    });
  } catch (err) {
    console.error("Error deleting event:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get all unique locations from events
 * GET /api/admin/getAllLocations
 */
async function getAllLocations(req, res) {
  try {
    // Get distinct locations
    const locations = await EventModel.distinct("location");

    res.status(200).json({
      message: "Locations retrieved successfully.",
      locations,
    });
  } catch (err) {
    console.error("Error fetching locations:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getAllLocations,
};
