const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const db = require('../../models');

/**
 * Gmail Service for OAuth2 integration and email fetching
 * 
 * To use Gmail API, you need to:
 * 1. Go to Google Cloud Console (https://console.cloud.google.com)
 * 2. Create a new project or select existing one
 * 3. Enable Gmail API
 * 4. Create OAuth2 credentials (Web application)
 * 5. Add authorized redirect URI: http://localhost:5000/api/emails/oauth/callback
 * 6. Set environment variables:
 *    - GMAIL_CLIENT_ID
 *    - GMAIL_CLIENT_SECRET
 *    - GMAIL_REDIRECT_URI (default: http://localhost:5000/api/emails/oauth/callback)
 *    - GMAIL_REFRESH_TOKEN (obtained after first authorization)
 */

class GmailService {
    constructor() {
        this.oauth2Client = null;
        this.gmail = null;
    }

    /**
     * Initialize OAuth2 client
     */
    initializeOAuth2() {
        if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
            console.warn('⚠️ Gmail OAuth2 credentials not configured. Gmail sync disabled.');
            return null;
        }

        this.oauth2Client = new google.auth.OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            process.env.GMAIL_REDIRECT_URI || 'http://localhost:5000/api/emails/oauth/callback'
        );

        // If we have a refresh token, set it
        if (process.env.GMAIL_REFRESH_TOKEN) {
            this.oauth2Client.setCredentials({
                refresh_token: process.env.GMAIL_REFRESH_TOKEN
            });
            this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
        }

        return this.oauth2Client;
    }

    /**
     * Generate authorization URL for user to grant access
     */
    getAuthUrl() {
        if (!this.oauth2Client) {
            this.initializeOAuth2();
        }

        if (!this.oauth2Client) {
            return null;
        }

        const scopes = [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send'
        ];

        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent' // Force to get refresh token
        });
    }

    /**
     * Exchange authorization code for tokens
     */
    async getTokensFromCode(code) {
        if (!this.oauth2Client) {
            this.initializeOAuth2();
        }

        const { tokens } = await this.oauth2Client.getToken(code);
        this.oauth2Client.setCredentials(tokens);
        this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

        // Return the refresh token - save this to .env file
        return tokens;
    }

    /**
     * Check if Gmail API is configured and authenticated
     */
    isConfigured() {
        return !!(process.env.GMAIL_CLIENT_ID && 
                  process.env.GMAIL_CLIENT_SECRET && 
                  process.env.GMAIL_REFRESH_TOKEN);
    }

    /**
     * Fetch sent emails from Gmail
     * @param {Object} options - Query options
     * @param {number} options.maxResults - Maximum number of emails to fetch
     * @param {string} options.pageToken - Page token for pagination
     * @param {string} options.query - Gmail search query (e.g., 'subject:Purchase Order')
     */
    async fetchSentEmails(options = {}) {
        if (!this.gmail) {
            this.initializeOAuth2();
            if (!this.gmail) {
                throw new Error('Gmail API not configured. Please set up OAuth2 credentials.');
            }
        }

        const { maxResults = 20, pageToken, query = '' } = options;

        try {
            // Fetch messages from Sent folder
            const response = await this.gmail.users.messages.list({
                userId: 'me',
                labelIds: ['SENT'],
                maxResults,
                pageToken,
                q: query // e.g., 'subject:Purchase Order OR subject:PO'
            });

            if (!response.data.messages || response.data.messages.length === 0) {
                return { emails: [], nextPageToken: null };
            }

            // Fetch full message details for each email
            const emails = await Promise.all(
                response.data.messages.map(msg => this.getEmailDetails(msg.id))
            );

            return {
                emails: emails.filter(e => e !== null),
                nextPageToken: response.data.nextPageToken
            };
        } catch (error) {
            console.error('Error fetching Gmail messages:', error);
            throw error;
        }
    }

    /**
     * Get full details of a single email
     */
    async getEmailDetails(messageId) {
        try {
            const response = await this.gmail.users.messages.get({
                userId: 'me',
                id: messageId,
                format: 'full'
            });

            const message = response.data;
            const headers = message.payload.headers;

            // Extract relevant headers
            const getHeader = (name) => {
                const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
                return header ? header.value : null;
            };

            // Extract body content
            let body = '';
            if (message.payload.body && message.payload.body.data) {
                body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
            } else if (message.payload.parts) {
                const htmlPart = message.payload.parts.find(p => p.mimeType === 'text/html');
                const textPart = message.payload.parts.find(p => p.mimeType === 'text/plain');
                
                if (htmlPart && htmlPart.body && htmlPart.body.data) {
                    body = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
                } else if (textPart && textPart.body && textPart.body.data) {
                    body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
                }
            }

            return {
                gmailMessageId: message.id,
                gmailThreadId: message.threadId,
                subject: getHeader('Subject') || '(No Subject)',
                from: getHeader('From'),
                to: getHeader('To'),
                date: new Date(parseInt(message.internalDate)),
                snippet: message.snippet,
                body: body,
                labelIds: message.labelIds
            };
        } catch (error) {
            console.error(`Error fetching email ${messageId}:`, error);
            return null;
        }
    }

    /**
     * Sync sent emails from Gmail to local database
     */
    async syncEmailsToDatabase(options = {}) {
        const { query = 'subject:Purchase Order OR subject:PO', maxResults = 50 } = options;

        try {
            const { emails } = await this.fetchSentEmails({ maxResults, query });

            let syncedCount = 0;
            let skippedCount = 0;

            for (const email of emails) {
                // Check if already exists in database
                const existing = await db.EmailLog.findOne({
                    where: { gmailMessageId: email.gmailMessageId }
                });

                if (existing) {
                    skippedCount++;
                    continue;
                }

                // Extract recipient email from 'To' header
                const toMatch = email.to ? email.to.match(/<(.+?)>/) || [null, email.to] : [null, ''];
                const recipientEmail = toMatch[1] || email.to || '';
                const recipientName = email.to ? email.to.replace(/<.+?>/, '').trim() : '';

                // Determine email type based on subject
                let emailType = 'other';
                if (email.subject.toLowerCase().includes('cancel')) {
                    emailType = 'po_cancelled';
                } else if (email.subject.toLowerCase().includes('purchase order') || 
                           email.subject.toLowerCase().includes('po')) {
                    emailType = 'po_sent';
                }

                // Extract PO number from subject if present
                const poMatch = email.subject.match(/PO\d{8,}/i);
                const relatedEntityRef = poMatch ? poMatch[0] : null;

                // Create email log
                await db.EmailLog.create({
                    emailType,
                    subject: email.subject,
                    recipientEmail,
                    recipientName,
                    senderEmail: process.env.EMAIL_USER || email.from,
                    htmlContent: email.body,
                    status: 'sent',
                    gmailMessageId: email.gmailMessageId,
                    gmailThreadId: email.gmailThreadId,
                    isSyncedFromGmail: true,
                    sentAt: email.date,
                    relatedEntityRef
                });

                syncedCount++;
            }

            return {
                synced: syncedCount,
                skipped: skippedCount,
                total: emails.length
            };
        } catch (error) {
            console.error('Error syncing emails:', error);
            throw error;
        }
    }

    /**
     * Get Gmail configuration status
     */
    getConfigStatus() {
        return {
            clientIdConfigured: !!process.env.GMAIL_CLIENT_ID,
            clientSecretConfigured: !!process.env.GMAIL_CLIENT_SECRET,
            refreshTokenConfigured: !!process.env.GMAIL_REFRESH_TOKEN,
            redirectUri: process.env.GMAIL_REDIRECT_URI || 'http://localhost:5000/api/emails/oauth/callback',
            isFullyConfigured: this.isConfigured()
        };
    }
}

module.exports = new GmailService();
