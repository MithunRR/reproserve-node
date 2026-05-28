module.exports = (sequelize, DataTypes) => {
  const QuoteResponse = sequelize.define('QuoteResponse', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    quoteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'quotes', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    // The provider/realtor who submitted this bid/response.
    providerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('submitted', 'accepted', 'declined'),
      defaultValue: 'submitted'
    }
  }, {
    tableName: 'quote_responses',
    timestamps: true
  });

  return QuoteResponse;
};
