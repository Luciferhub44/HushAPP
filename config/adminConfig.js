const AdminBro = require('admin-bro');
const AdminBroExpress = require('@admin-bro/express');
const AdminBroMongoose = require('@admin-bro/mongoose');
const bcrypt = require('bcryptjs');

// Import all models
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Dispute = require('../models/Dispute');
const Review = require('../models/Review');
const Wallet = require('../models/Wallet');

AdminBro.registerAdapter(AdminBroMongoose);

const adminBro = new AdminBro({
  databases: [],
  rootPath: '/admin',
  branding: {
    companyName: 'Hush Admin',
    logo: false,
    softwareBrothers: false
  },
  resources: [
    {
      resource: User,
      options: {
        properties: {
          password: { isVisible: false },
          _id: { isVisible: { list: false, filter: true, show: true, edit: false } }
        },
        actions: {
          new: {
            before: async (request) => {
              if(request.payload.password) {
                request.payload.password = await bcrypt.hash(request.payload.password, 10);
              }
              return request;
            },
          }
        }
      }
    },
    {
      resource: Product,
      options: {
        properties: {
          description: { type: 'richtext' },
          images: { 
            components: {
              list: AdminBro.bundle('./components/image-list')
            }
          }
        }
      }
    },
    {
      resource: Order,
      options: {
        properties: {
          status: {
            availableValues: [
              { value: 'pending', label: 'Pending' },
              { value: 'processing', label: 'Processing' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' }
            ]
          }
        }
      }
    },
    {
      resource: Payment,
      options: {
        properties: {
          amount: { type: 'number' },
          status: {
            availableValues: [
              { value: 'pending', label: 'Pending' },
              { value: 'completed', label: 'Completed' },
              { value: 'failed', label: 'Failed' },
              { value: 'refunded', label: 'Refunded' }
            ]
          }
        }
      }
    },
    {
      resource: Dispute,
      options: {
        properties: {
          status: {
            availableValues: [
              { value: 'open', label: 'Open' },
              { value: 'under_review', label: 'Under Review' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'closed', label: 'Closed' }
            ]
          }
        }
      }
    },
    {
      resource: Review,
      options: {
        properties: {
          rating: {
            availableValues: [
              { value: 1, label: '1 Star' },
              { value: 2, label: '2 Stars' },
              { value: 3, label: '3 Stars' },
              { value: 4, label: '4 Stars' },
              { value: 5, label: '5 Stars' }
            ]
          }
        }
      }
    },
    {
      resource: Wallet
    }
  ],
  dashboard: {
    component: AdminBro.bundle('./components/dashboard')
  }
});

const ADMIN = {
  email: process.env.ADMIN_EMAIL || 'admin@hushapp.com',
  password: process.env.ADMIN_PASSWORD || 'admin123'
};

const router = AdminBroExpress.buildAuthenticatedRouter(adminBro, {
  authenticate: async (email, password) => {
    if (email === ADMIN.email && password === ADMIN.password) {
      return ADMIN;
    }
    return null;
  },
  cookieName: 'adminbro',
  cookiePassword: process.env.ADMIN_COOKIE_SECRET || 'admin-secret'
});

module.exports = { adminBro, router }; 