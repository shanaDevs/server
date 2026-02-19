#!/bin/sh
set -e

# Fix permissions on uploads directory if it exists
if [ -d "/usr/src/app/uploads" ]; then
    chown -R nodejs:nodejs /usr/src/app/uploads || true
fi

# Switch to nodejs user and execute the command
exec su-exec nodejs "$@"

