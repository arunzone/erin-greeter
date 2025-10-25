import { QueryInterface, DataTypes } from 'sequelize';

export default {
  async up(queryInterface: QueryInterface) {
    // Enable pgcrypto extension for UUID generation
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

    await queryInterface.createTable('user', {
      id: {
        type: DataTypes.UUID,
        defaultValue: queryInterface.sequelize.Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false,
      },
      first_name: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      last_name: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      time_zone: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      birthday: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: queryInterface.sequelize.Sequelize.literal('now()'),
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: queryInterface.sequelize.Sequelize.literal('now()'),
        allowNull: false,
      },
    });
  },

  async down(queryInterface: QueryInterface) {
    await queryInterface.dropTable('user');
  },
};
