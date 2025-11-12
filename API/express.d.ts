// Type definitions for Express request extensions
// This file extends the Express Request interface to include custom properties

// Extend the Express namespace to add our custom property
declare namespace Express {
  // Extend the Request interface to include authenticatedUid
  export interface Request {
    // The uid of the authenticated user, set by the authenticate middleware
    authenticatedUid?: string;
    uid?: string;
  }
} 