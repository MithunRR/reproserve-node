module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    role: {
      type: DataTypes.ENUM('user', 'service_provider', 'realtor', 'admin'),
      allowNull: false,
      defaultValue: 'user'
    },
    // Captured at signup from the "Register as -" radio. Generally tracks role
    // (user → individual, service_provider/realtor → business) but kept as a
    // separate column so it can diverge later (e.g. a user account that
    // represents a business buyer).
    registerAs: {
      type: DataTypes.ENUM('individual', 'business'),
      allowNull: true
    },

    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: { isEmail: true }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },

    streetAddress: {
      type: DataTypes.STRING(255),
      allowNull: true
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

    // Geocoded coordinates of streetAddress/city/state/zipCode. Populated at
    // signup by services/geocoder.js (best-effort — null if geocoding fails or
    // the address is too vague). Powers the "providers within Nkm" search.
    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true
    },

    businessName: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    serviceTypeId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    businessDesc: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Optional licence / registration number (service providers & realtors).
    licenseNumber: {
      type: DataTypes.STRING(100),
      allowNull: true
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },

    // Service providers and realtors are gated behind admin approval before
    // they show up on the public listings. Users and admins are auto-approved
    // (see auth.controller.buildPayloadForRole and bootstrapAdmin).
    approvalStatus: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    },

    // Email-verification-link flow. emailVerified flips true after the user
    // clicks the link emailed at signup. verificationToken / expiresAt back
    // the link itself.
    emailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    verificationToken: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    verificationExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'users',
    timestamps: true
  });

  return User;
};
