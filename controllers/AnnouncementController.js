const AnnouncementModel = require("../models/Announcement");
const UserModel = require("../models/User");
const { sendToUsers } = require("../services/FCMService");

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

    // Send push notifications to all users and priests after announcement creation
    try {
      console.log("AnnouncementController: Sending push notifications to all users and priests for new announcement");
      
      // Get all active users and priests (excluding deleted and inactive users)
      // This includes both regular users and priests (is_priest: true)
      const allUsers = await UserModel.find({
        is_deleted: false,
        is_active: true
      }).select('uid is_priest');

      if (allUsers && allUsers.length > 0) {
        const userIds = allUsers.map(user => user.uid).filter(Boolean);
        const priestCount = allUsers.filter(user => user.is_priest === true).length;
        const regularUserCount = allUsers.length - priestCount;
        
        console.log(`AnnouncementController: Found ${allUsers.length} active users (${regularUserCount} regular users, ${priestCount} priests)`);
        
        if (userIds.length > 0) {
          // Prepare notification
          const notificationTitle = "New Announcement: " + title;
          // Truncate content if too long for notification body
          const maxContentLength = 100;
          const notificationBody = content && content.length > maxContentLength 
            ? content.substring(0, maxContentLength) + "..." 
            : content || "Check out the latest announcement from the parish";
          
          const notificationData = {
            type: 'new_announcement',
            announcementId: newAnnouncement._id.toString(),
            announcementTitle: title,
            priority: priority || 'normal',
          };

          // Send notifications to all users
          const result = await sendToUsers(userIds, notificationTitle, notificationBody, notificationData);
          console.log(`AnnouncementController: Sent notifications to ${result.success} users, ${result.failed} failed`);
        } else {
          console.log("AnnouncementController: No valid user IDs found");
        }
      } else {
        console.log("AnnouncementController: No active users found");
      }
    } catch (notificationError) {
      // Log error but don't fail the announcement creation
      console.error("AnnouncementController: Error sending push notifications:", notificationError);
    }

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
