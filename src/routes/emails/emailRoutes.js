const express = require('express');
const router = express.Router();
const emailController = require('../../controllers/emails/emailController');

/**
 * @swagger
 * tags:
 *   name: Emails
 *   description: Email log management with Gmail integration
 */

// ============ LOCAL EMAIL LOGS ENDPOINTS ============

/**
 * @swagger
 * /api/emails:
 *   get:
 *     summary: Get all email logs
 *     tags: [Emails]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: emailType
 *         schema:
 *           type: string
 *         description: Filter by email type (po_sent, po_cancelled, etc.)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, sent, failed]
 *         description: Filter by email status
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [local, gmail, all]
 *         description: Filter by source (local app or synced from Gmail)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in subject, recipient email/name
 *     responses:
 *       200:
 *         description: List of email logs
 */
router.get('/', emailController.getAllEmailLogs);

/**
 * @swagger
 * /api/emails/stats:
 *   get:
 *     summary: Get email statistics
 *     tags: [Emails]
 *     responses:
 *       200:
 *         description: Email statistics summary
 */
router.get('/stats', emailController.getEmailStats);

// ============ GMAIL INTEGRATION ENDPOINTS ============

/**
 * @swagger
 * /api/emails/gmail/config:
 *   get:
 *     summary: Get Gmail OAuth configuration status
 *     tags: [Emails]
 *     responses:
 *       200:
 *         description: Gmail configuration status
 */
router.get('/gmail/config', emailController.getGmailConfig);

/**
 * @swagger
 * /api/emails/gmail/auth-url:
 *   get:
 *     summary: Get Gmail OAuth authorization URL
 *     tags: [Emails]
 *     responses:
 *       200:
 *         description: Authorization URL for Gmail OAuth
 */
router.get('/gmail/auth-url', emailController.getGmailAuthUrl);

/**
 * @swagger
 * /api/emails/oauth/callback:
 *   get:
 *     summary: Gmail OAuth callback endpoint
 *     tags: [Emails]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Authorization code from Google
 *     responses:
 *       200:
 *         description: Tokens received successfully
 */
router.get('/oauth/callback', emailController.handleGmailOAuthCallback);

/**
 * @swagger
 * /api/emails/gmail/fetch:
 *   get:
 *     summary: Fetch emails directly from Gmail
 *     tags: [Emails]
 *     parameters:
 *       - in: query
 *         name: maxResults
 *         schema:
 *           type: integer
 *         description: Maximum number of emails to fetch
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Gmail search query
 *     responses:
 *       200:
 *         description: List of emails from Gmail
 */
router.get('/gmail/fetch', emailController.fetchGmailEmails);

/**
 * @swagger
 * /api/emails/gmail/sync:
 *   post:
 *     summary: Sync emails from Gmail to local database
 *     tags: [Emails]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *                 description: Gmail search query
 *               maxResults:
 *                 type: integer
 *                 description: Maximum number of emails to sync
 *     responses:
 *       200:
 *         description: Sync results
 */
router.post('/gmail/sync', emailController.syncGmailEmails);

// ============ SINGLE EMAIL OPERATIONS ============

/**
 * @swagger
 * /api/emails/{id}:
 *   get:
 *     summary: Get email log by ID
 *     tags: [Emails]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Email log ID
 *     responses:
 *       200:
 *         description: Email log details
 *       404:
 *         description: Email log not found
 */
router.get('/:id', emailController.getEmailLogById);

/**
 * @swagger
 * /api/emails/{id}/resend:
 *   post:
 *     summary: Resend a failed email
 *     tags: [Emails]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Email log ID
 *     responses:
 *       200:
 *         description: Email resent successfully
 *       404:
 *         description: Email log not found
 */
router.post('/:id/resend', emailController.resendEmail);

/**
 * @swagger
 * /api/emails/{id}:
 *   delete:
 *     summary: Delete an email log
 *     tags: [Emails]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Email log ID
 *     responses:
 *       200:
 *         description: Email log deleted
 *       404:
 *         description: Email log not found
 */
router.delete('/:id', emailController.deleteEmailLog);

/**
 * @swagger
 * /api/emails/bulk-delete:
 *   post:
 *     summary: Bulk delete email logs
 *     tags: [Emails]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Email logs deleted
 */
router.post('/bulk-delete', emailController.bulkDeleteEmailLogs);

module.exports = router;
