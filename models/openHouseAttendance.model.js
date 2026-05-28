module.exports = (sequelize, DataTypes) => {
  const OpenHouseAttendance = sequelize.define('OpenHouseAttendance', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    openHouseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'open_house', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    // Optional — an attendee may RSVP without being logged in.
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'open_house_attendances',
    timestamps: true
  });

  return OpenHouseAttendance;
};
