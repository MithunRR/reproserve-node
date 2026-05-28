module.exports = (sequelize, DataTypes) => {
  const ContactMessage = sequelize.define('ContactMessage', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: { isEmail: true }
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    // Free-text subject key from the dropdown (technical-support, billing, etc.)
    subject: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    // 'user' | 'provider' | 'other' — from the "I am a:" picker.
    userType: {
      type: DataTypes.STRING(40),
      allowNull: true
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    // Admin moderation status.
    status: {
      type: DataTypes.ENUM('new', 'read', 'replied', 'archived'),
      allowNull: false,
      defaultValue: 'new'
    }
  }, {
    tableName: 'contact_messages',
    timestamps: true,
    indexes: [{ fields: ['status'] }, { fields: ['email'] }]
  });

  return ContactMessage;
};
