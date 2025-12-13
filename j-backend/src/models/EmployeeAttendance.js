/**
 * EmployeeAttendance model - Employee check-in/out records.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const EmployeeAttendance = sequelize.define('EmployeeAttendance', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  employee_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  shop_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'shops',
      key: 'id',
    },
  },
  checkin_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  checkout_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: 'present',
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'employee_attendance',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = EmployeeAttendance;

