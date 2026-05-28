module.exports = (sequelize, DataTypes) => {
  const ShowMyProperty = sequelize.define('ShowMyProperty', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    // The customer who posted the listing.
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    propertyType: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    // Short human-readable label for the listing (e.g. "3BR house in downtown").
    title: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    zipCode: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Window the customer is available for the showing.
    preferredDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    preferredDateTo: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true
    },
    // What the customer offers the showing agent per hour.
    payoutPerHour: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    photos: {
      type: DataTypes.JSON,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'scheduled', 'completed', 'cancelled'),
      defaultValue: 'pending'
    },
    // The realtor who claimed the listing (null while status='pending').
    assignedAgentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    assignedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'show_my_property_requests',
    timestamps: true
  });

  return ShowMyProperty;
};
