const LogModel = require("../models/Log");

async function createLog(req, res) {
  try {
    const {
      action,
      entity_type,
      entity_id,
      entity_name,
      admin_id,
      admin_name,
      admin_email,
      details,
      ip_address,
      user_agent,
    } = req.body;

    // Validate required fields
    if (!action || !entity_type || !admin_id || !admin_name) {
      return res.status(400).json({
        message: "Missing required fields: action, entity_type, admin_id, admin_name",
      });
    }

    const newLog = new LogModel({
      action,
      entity_type,
      entity_id: entity_id || null,
      entity_name: entity_name || null,
      admin_id,
      admin_name,
      admin_email: admin_email || null,
      details: details || {},
      ip_address: ip_address || null,
      user_agent: user_agent || null,
    });

    await newLog.save();

    res.status(201).json({
      message: "Log created successfully",
      log: newLog,
    });
  } catch (error) {
    console.error("Error creating log:", error);
    res.status(500).json({
      message: "Failed to create log",
      error: error.message,
    });
  }
}

async function getAllLogs(req, res) {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      entity_type,
      admin_id,
      startDate,
      endDate,
      search,
    } = req.query;

    const query = {};

    if (action) {
      query.action = action;
    }

    if (entity_type) {
      query.entity_type = entity_type;
    }

    if (admin_id) {
      query.admin_id = admin_id;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    if (search) {
      query.$or = [
        { admin_name: { $regex: search, $options: "i" } },
        { admin_email: { $regex: search, $options: "i" } },
        { entity_name: { $regex: search, $options: "i" } },
        { action: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const logs = await LogModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await LogModel.countDocuments(query);

    res.json({
      logs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({
      message: "Failed to fetch logs",
      error: error.message,
    });
  }
}

async function getLogById(req, res) {
  try {
    const { id } = req.params;

    const log = await LogModel.findById(id);

    if (!log) {
      return res.status(404).json({ message: "Log not found" });
    }

    res.json({ log });
  } catch (error) {
    console.error("Error fetching log:", error);
    res.status(500).json({
      message: "Failed to fetch log",
      error: error.message,
    });
  }
}

async function getLogsByAdmin(req, res) {
  try {
    const { adminId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const logs = await LogModel.find({ admin_id: adminId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await LogModel.countDocuments({ admin_id: adminId });

    res.json({
      logs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Error fetching logs by admin:", error);
    res.status(500).json({
      message: "Failed to fetch logs",
      error: error.message,
    });
  }
}

module.exports = {
  createLog,
  getAllLogs,
  getLogById,
  getLogsByAdmin,
};

