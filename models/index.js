const { Sequelize, DataTypes } = require('sequelize');
const dbConfig = require('../config/db.config');

const sequelize = new Sequelize(
  dbConfig.DB,
  dbConfig.USER,
  dbConfig.PASSWORD,
  {
    host: dbConfig.HOST,
    port: dbConfig.PORT,
    dialect: dbConfig.dialect,
    logging: false,
    pool: dbConfig.pool
  }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Models
db.User = require('./user.model')(sequelize, DataTypes);
db.ServiceType = require('./serviceType.model')(sequelize, DataTypes);
db.OpenHouse = require('./openHouse.model')(sequelize, DataTypes);
db.Quote = require('./quote.model')(sequelize, DataTypes);
db.QuoteResponse = require('./quoteResponse.model')(sequelize, DataTypes);
db.Message = require('./message.model')(sequelize, DataTypes);
db.Project = require('./project.model')(sequelize, DataTypes);
db.Review = require('./review.model')(sequelize, DataTypes);
db.Favorite = require('./favorite.model')(sequelize, DataTypes);
db.ShowMyProperty = require('./showMyProperty.model')(sequelize, DataTypes);
db.Notification = require('./notification.model')(sequelize, DataTypes);
db.OpenHouseAttendance = require('./openHouseAttendance.model')(sequelize, DataTypes);
db.ContactMessage = require('./contactMessage.model')(sequelize, DataTypes);

// ServiceType <-> User
db.ServiceType.hasMany(db.User, { foreignKey: 'serviceTypeId', as: 'providers' });
db.User.belongsTo(db.ServiceType, { foreignKey: 'serviceTypeId', as: 'serviceType' });

// User <-> OpenHouse
db.User.hasMany(db.OpenHouse, { foreignKey: 'userId', as: 'openHouses' });
db.OpenHouse.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });

// Quote <-> User (requester) / User (target provider)
db.User.hasMany(db.Quote, { foreignKey: 'userId', as: 'quotes' });
db.Quote.belongsTo(db.User, { foreignKey: 'userId', as: 'requester' });
db.Quote.belongsTo(db.User, { foreignKey: 'providerId', as: 'provider' });

// Quote <-> QuoteResponse
db.Quote.hasMany(db.QuoteResponse, { foreignKey: 'quoteId', as: 'responses' });
db.QuoteResponse.belongsTo(db.Quote, { foreignKey: 'quoteId', as: 'quote' });
db.QuoteResponse.belongsTo(db.User, { foreignKey: 'providerId', as: 'provider' });

// Message <-> User (sender / receiver)
db.Message.belongsTo(db.User, { foreignKey: 'senderId', as: 'sender' });
db.Message.belongsTo(db.User, { foreignKey: 'receiverId', as: 'receiver' });

// Project <-> User
db.User.hasMany(db.Project, { foreignKey: 'userId', as: 'projects' });
db.Project.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });

// Review <-> User (provider being reviewed / reviewer)
db.Review.belongsTo(db.User, { foreignKey: 'providerId', as: 'provider' });
db.Review.belongsTo(db.User, { foreignKey: 'userId', as: 'reviewer' });

// Favorite <-> User
db.Favorite.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
db.Favorite.belongsTo(db.User, { foreignKey: 'providerId', as: 'provider' });

// ShowMyProperty <-> User (customer who posted / realtor who claimed)
db.User.hasMany(db.ShowMyProperty, { foreignKey: 'userId', as: 'showRequests' });
db.ShowMyProperty.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
db.User.hasMany(db.ShowMyProperty, { foreignKey: 'assignedAgentId', as: 'assignedShowings' });
db.ShowMyProperty.belongsTo(db.User, { foreignKey: 'assignedAgentId', as: 'agent' });

// Notification <-> User
db.User.hasMany(db.Notification, { foreignKey: 'userId', as: 'notifications' });
db.Notification.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });

// OpenHouseAttendance <-> OpenHouse / User
db.OpenHouse.hasMany(db.OpenHouseAttendance, { foreignKey: 'openHouseId', as: 'attendances' });
db.OpenHouseAttendance.belongsTo(db.OpenHouse, { foreignKey: 'openHouseId', as: 'openHouse' });
db.OpenHouseAttendance.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });

module.exports = db;
