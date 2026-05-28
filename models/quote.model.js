module.exports = (sequelize, DataTypes) => {
  const Quote = sequelize.define('Quote', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    // The user (any role) who requested the quote.
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    // Optional target provider/realtor the request is aimed at.
    providerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    propertyType: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    category: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    budgetMin: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true
    },
    budgetMax: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    photos: {
      type: DataTypes.JSON,
      allowNull: true
    },
    // Realtor flow reuses this form as a "Schedule a Meeting" request.
    isMeetingRequest: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    // Completion handshake: the provider marks the work done, then the
    // customer confirms (which moves status -> closed/completed).
    providerCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'responded', 'accepted', 'declined', 'closed'),
      defaultValue: 'pending'
    }
  }, {
    tableName: 'quotes',
    timestamps: true
  });

  return Quote;
};
