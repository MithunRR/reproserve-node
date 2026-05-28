module.exports = (sequelize, DataTypes) => {
  const Project = sequelize.define('Project', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    category: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    budgetMin: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true
    },
    budgetMax: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true
    },
    timeline: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    photos: {
      type: DataTypes.JSON,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('open', 'in_progress', 'completed', 'cancelled'),
      defaultValue: 'open'
    }
  }, {
    tableName: 'projects',
    timestamps: true
  });

  return Project;
};
