module.exports = (sequelize, DataTypes) => {
  const OpenHouse = sequelize.define('OpenHouse', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    role: {
      type: DataTypes.ENUM('user', 'service_provider', 'realtor'),
      allowNull: true,
      defaultValue: 'user'
    },
    propertyType: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    specs: {
      type: DataTypes.JSON,
      allowNull: true
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    squareFootage: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    fromDateAndTime: {
      type: DataTypes.DATE,
      allowNull: false
    },
    toDateAndTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    photos: {
      type: DataTypes.JSON,
      allowNull: true
    },
    video: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'open_house',
    timestamps: true
  });
  OpenHouse.associate = (models) => {
    OpenHouse.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };
  return OpenHouse;
};