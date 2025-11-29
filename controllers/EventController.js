const EventModel = require("../models/Event");

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
      image = `/uploads/${req.file.filename}`;
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
      // delete old image if exists
      if (event.image) {
        const fs = require("fs");
        const path = require("path");
        const oldPath = path.join(__dirname, "..", event.image);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      event.image = `/uploads/${req.file.filename}`;
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

    // delete image if exists
    if (event.image) {
      const fs = require("fs");
      const path = require("path");
      const oldPath = path.join(__dirname, "..", event.image);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await event.remove();

    res.status(200).json({
      message: "Event deleted successfully.",
      event,
    });
  } catch (err) {
    console.error("Error deleting event:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
};
