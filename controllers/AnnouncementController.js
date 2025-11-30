const AnnouncementModel = require("../models/Announcement");

/** GET — All Announcements */
const getAnnouncements = async (req, res) => {
  try {
    const announcements = await AnnouncementModel.find().sort({ createdAt: -1 });
    res.status(200).json(announcements);
  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/** POST — Create Announcement */
const createAnnouncement = async (req, res) => {
  try {
    const { title, content, date, author, priority, image } = req.body;

    const newAnnouncement = new AnnouncementModel({
      title,
      content,
      date,
      author,
      priority,
      image,
    });

    await newAnnouncement.save();

    res.status(201).json({
      message: "Announcement created successfully!",
      announcement: newAnnouncement,
    });
  } catch (error) {
    console.error("Error creating announcement:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/** PUT — Update Announcement */
const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await AnnouncementModel.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!updated)
      return res.status(404).json({ message: "Announcement not found" });

    res.status(200).json({
      message: "Announcement updated successfully!",
      announcement: updated,
    });
  } catch (error) {
    console.error("Error updating announcement:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/** DELETE — Delete Announcement */
const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await AnnouncementModel.findByIdAndDelete(id);

    if (!deleted)
      return res.status(404).json({ message: "Announcement not found" });

    res.status(200).json({ message: "Announcement deleted successfully!" });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  AnnouncementModel,
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
};
