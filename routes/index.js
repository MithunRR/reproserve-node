const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const adminController = require('../controllers/admin.controller');
const contactController = require('../controllers/contact.controller');
const serviceTypeController = require('../controllers/serviceType.controller');
const settingsController = require('../controllers/profile.controller');
const openHouseController = require('../controllers/openHouse.controller');
const openHouseAttendanceController = require('../controllers/openHouseAttendance.controller');
const quoteController = require('../controllers/quote.controller');
const messageController = require('../controllers/message.controller');
const projectController = require('../controllers/project.controller');
const providerController = require('../controllers/provider.controller');
const reviewController = require('../controllers/review.controller');
const favoriteController = require('../controllers/favorite.controller');
const showMyPropertyController = require('../controllers/showMyProperty.controller');
const notificationController = require('../controllers/notification.controller');
const geocodeController = require('../controllers/geocode.controller');

const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { validateRegister, validateLogin } = require('../middleware/validate.middleware');
const { openHouseUpload, photosUpload, handleUploadError } = require('../middleware/upload.middleware');

//  ============================================================
//  AUTH ROUTES  (controller: auth.controller.js)
//  Base: /api/auth

router.post('/auth/register', validateRegister, authController.register);
router.post('/auth/login', validateLogin, authController.login);
router.get('/auth/me', verifyToken, authController.me);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/change-password', verifyToken, authController.changePassword);

// Email-verification-link flow.
router.get('/auth/verify-email/:token', authController.verifyEmail);
router.post('/auth/resend-verification', authController.resendVerification);


//  ============================================================
//  ADMIN ROUTES  (controller: admin.controller.js)
//  Base: /api/admin   —   admin-only

router.get('/admin/stats', verifyToken, requireRole('admin'), adminController.stats);
router.get('/admin/users', verifyToken, requireRole('admin'), adminController.listUsers);
router.get('/admin/pending-approvals', verifyToken, requireRole('admin'), adminController.listPendingApprovals);
router.put('/admin/users/:id/approval', verifyToken, requireRole('admin'), adminController.setApprovalStatus);


//  ============================================================
//  CONTACT MESSAGE ROUTES  (controller: contact.controller.js)
//  Base: /api/contact   —   POST is public, all admin-only otherwise

router.post('/contact', contactController.create);
router.get('/contact', verifyToken, requireRole('admin'), contactController.findAll);
router.get('/contact/:id', verifyToken, requireRole('admin'), contactController.findOne);
router.put('/contact/:id', verifyToken, requireRole('admin'), contactController.update);
router.delete('/contact/:id', verifyToken, requireRole('admin'), contactController.remove);


//  ============================================================
//  PROFILE ROUTES  (controller: profile.controller.js)
//  Base: /api/profile

router.get('/profile/:id', settingsController.findOne);
router.put('/profile/:id', settingsController.update);


//  ============================================================
//  SERVICE TYPE ROUTES  (controller: serviceType.controller.js)
//  Base: /api/service-types

router.post('/service-types', serviceTypeController.create);
router.get('/service-types', serviceTypeController.findAll);
router.get('/service-types/:id', serviceTypeController.findOne);
router.put('/service-types/:id', serviceTypeController.update);
router.delete('/service-types/:id', serviceTypeController.remove);


//  ============================================================
//  OPEN HOUSE ROUTES  (controller: openHouse.controller.js)
//  Base: /api/open-houses
//  Body: multipart/form-data  (fields: photos[] up to 10, video x1, plus text fields)

router.post('/open-houses', openHouseUpload, handleUploadError, openHouseController.create);
router.get('/open-houses', openHouseController.findAll);
router.get('/open-houses/:id', openHouseController.findOne);
router.put('/open-houses/:id', openHouseUpload, handleUploadError, openHouseController.update);
router.delete('/open-houses/:id', openHouseController.remove);

//  Open house attendance / RSVP
router.post('/open-houses/:id/attendances', openHouseAttendanceController.create);
router.get('/open-houses/:id/attendances', openHouseAttendanceController.findAll);
router.delete('/attendances/:id', openHouseAttendanceController.remove);


//  ============================================================
//  QUOTE ROUTES  (controller: quote.controller.js)
//  Base: /api/quotes   —   user requests a quote; provider/realtor responds
//  Body: multipart/form-data on create/update (optional photos[])

router.post('/quotes', photosUpload, handleUploadError, quoteController.create);
router.get('/quotes', quoteController.findAll);
router.get('/quotes/:id', quoteController.findOne);
router.put('/quotes/:id', photosUpload, handleUploadError, quoteController.update);
router.delete('/quotes/:id', quoteController.remove);

router.post('/quotes/:id/responses', quoteController.addResponse);
router.get('/quotes/:id/responses', quoteController.listResponses);
router.put('/quote-responses/:id', quoteController.updateResponse);


//  ============================================================
//  MESSAGE ROUTES  (controller: message.controller.js)
//  Base: /api/messages

router.post('/messages', messageController.create);
router.get('/messages/conversations', messageController.conversations);
router.get('/messages', messageController.findAll);
router.put('/messages/:id/read', messageController.markRead);
router.delete('/messages/:id', messageController.remove);


//  ============================================================
//  PROJECT ROUTES  (controller: project.controller.js)
//  Base: /api/projects
//  Body: multipart/form-data on create/update (optional photos[])

router.post('/projects', photosUpload, handleUploadError, projectController.create);
router.get('/projects', projectController.findAll);
router.get('/projects/:id', projectController.findOne);
router.put('/projects/:id', photosUpload, handleUploadError, projectController.update);
router.delete('/projects/:id', projectController.remove);


//  ============================================================
//  PROVIDER LISTING ROUTES  (controller: provider.controller.js)
//  Base: /api/providers   —   read-only listing of service providers & realtors

router.get('/providers', providerController.findAll);
router.get('/providers/:id', providerController.findOne);


//  ============================================================
//  GEOCODE PROXY  (controller: geocode.controller.js)
//  GET /api/geocode?q=<address-or-zip>   — public, returns { lat, lng }

router.get('/geocode', geocodeController.geocode);


//  ============================================================
//  REVIEW ROUTES  (controller: review.controller.js)
//  Base: /api/reviews

router.post('/reviews', reviewController.create);
router.get('/reviews', reviewController.findAll);
router.get('/reviews/:id', reviewController.findOne);
router.put('/reviews/:id', reviewController.update);
router.delete('/reviews/:id', reviewController.remove);


//  ============================================================
//  FAVORITE ROUTES  (controller: favorite.controller.js)
//  Base: /api/favorites

router.post('/favorites', favoriteController.create);
router.get('/favorites', favoriteController.findAll);
router.delete('/favorites/:id', favoriteController.remove);
router.delete('/favorites', favoriteController.remove);


//  ============================================================
//  SHOW MY PROPERTY ROUTES  (controller: showMyProperty.controller.js)
//  Base: /api/show-my-property
//  Body: multipart/form-data on create/update (optional photos[])

router.post('/show-my-property', photosUpload, handleUploadError, showMyPropertyController.create);
router.get('/show-my-property', showMyPropertyController.findAll);
router.get('/show-my-property/:id', showMyPropertyController.findOne);
router.put('/show-my-property/:id', photosUpload, handleUploadError, showMyPropertyController.update);
router.delete('/show-my-property/:id', showMyPropertyController.remove);

//  Showing lifecycle — realtor claims a pending listing then marks it complete.
router.post('/show-my-property/:id/claim', showMyPropertyController.claim);
router.put('/show-my-property/:id/complete', showMyPropertyController.complete);


//  ============================================================
//  NOTIFICATION ROUTES  (controller: notification.controller.js)
//  Base: /api/notifications

router.get('/notifications', notificationController.findAll);
router.post('/notifications', notificationController.create);
router.put('/notifications/read-all', notificationController.markAllRead);
router.put('/notifications/:id/read', notificationController.markRead);
router.delete('/notifications/:id', notificationController.remove);


module.exports = router;
