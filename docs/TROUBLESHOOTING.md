# Troubleshooting Guide - Emergent Intelligence

## File Upload System Issues

### Problem 1: File Upload Rejection - "Only images, PDFs, and documents are allowed"

**What Happened**: User attempted to upload a screenshot but received file type rejection error.

**Root Cause**: 
- Multer file filter was too restrictive
- Original regex pattern `/jpeg|jpg|png|gif|pdf|txt|doc|docx/` was matching against both file extension AND MIME type
- Some image files (especially screenshots) have different MIME types than expected
- Error occurred in `server/autonomous-chat.ts` around line 280

**Why It Wasn't Caught Earlier**:
- Testing was done with standard image files that matched expected MIME types
- Screenshot files often have different MIME types depending on device/OS
- File filter validation happened before any logging, making debugging difficult

**Solution Implemented**:
```typescript
// Before (restrictive)
const allowedTypes = /jpeg|jpg|png|gif|pdf|txt|doc|docx/;
const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
const mimetype = allowedTypes.test(file.mimetype);

// After (permissive)
const allowedMimes = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
  return cb(null, true);
}
```

**What I Would Do Differently**:
- Add comprehensive MIME type logging from the start
- Test with various device-generated files (iPhone screenshots, Android, etc.)
- Implement more flexible validation (whitelist known safe types + fallback for image/*)
- Add file type detection beyond just MIME types

### Problem 2: LSP TypeScript Errors in Autonomous Chat

**What Happened**: TypeScript compilation errors related to OpenAI message format for image analysis.

**Root Cause**:
- OpenAI chat completions API expects specific message format for vision
- Mixing text and image content requires array format, not string format
- Type definition mismatch between expected and actual message structure

**Error Details**:
```
Object literal may only specify known properties, and 'image_url' does not exist in type '{ type: string; text: any; }'.
```

**Solution Implemented**:
```typescript
// Proper message structure for vision API
const content = [{ type: 'text', text: lastMessage.content }];

for (const file of files) {
  if (file.mimetype.startsWith('image/')) {
    const imageBuffer = fs.readFileSync(file.path);
    const base64Image = imageBuffer.toString('base64');
    content.push({
      type: 'image_url',
      image_url: {
        url: `data:${file.mimetype};base64,${base64Image}`
      }
    });
  }
}

lastMessage.content = content;
```

**What I Would Do Differently**:
- Check TypeScript definitions more carefully when implementing new features
- Test with actual files earlier in development
- Use proper typing for OpenAI message content from the start

### Problem 3: File Upload Route Configuration Issues

**What Happened**: File uploads were failing due to improper multer middleware configuration.

**Root Cause**:
- Original implementation used `upload.array('file0', 5)` which expected specific field names
- Frontend was sending files with different field names (`file0`, `file1`, etc.)
- Error handling was not properly catching multer errors

**Solution Implemented**:
```typescript
// Changed from:
app.post('/api/chat/:sessionId', upload.array('file0', 5), async (req, res) => {

// To:
app.post('/api/chat/:sessionId', (req, res) => {
  upload.any()(req, res, async (err) => {
    if (err) {
      console.error('[File Upload] Error:', err.message);
      return res.status(400).json({ error: `Upload failed: ${err.message}` });
    }
    // ... rest of handler
  });
});
```

**What I Would Do Differently**:
- Use `upload.any()` from the start for flexibility
- Implement proper error handling middleware for multer
- Add comprehensive logging for file upload debugging

## Memory System Issues

### Problem 4: MapIterator Type Errors

**What Happened**: TypeScript errors when iterating over conversation Map in autonomous chat.

**Root Cause**:
- Direct iteration over `Map.values()` caused type issues
- TypeScript couldn't properly infer types for Map iterator

**Solution Implemented**:
```typescript
// Before (problematic)
for (const messages of this.conversations.values()) {
  allMessages.push(...messages.filter((msg: ChatMessage) => msg.role !== 'system'));
}

// After (fixed)
Array.from(this.conversations.values()).forEach(messages => {
  allMessages.push(...messages.filter((msg: ChatMessage) => msg.role !== 'system'));
});
```

## Database and Storage Issues

### Problem 5: Task Context and Time Window Type Validation

**What Happened**: Runtime errors when creating tasks due to string enum validation.

**Root Cause**:
- Frontend sending string values that didn't match exact TypeScript enum types
- Type casting was insufficient without proper validation

**Solution Implemented**:
```typescript
await storage.createTask({
  title,
  context: (context as 'computer' | 'phone' | 'physical') || 'computer',
  timeWindow: (timeWindow as 'morning' | 'midday' | 'evening' | 'any') || 'any',
  status: 'today',
  sessionId
});
```

**What I Would Do Differently**:
- Use Zod validation schemas throughout for runtime type checking
- Implement proper enum validation at API boundaries
- Add default value handling for all enum fields

## ElevenLabs Integration Issues

### Problem 6: Widget Mounting and Session Variables

**What Happened**: ElevenLabs widget sometimes failed to receive session variables or mounted multiple times.

**Root Cause**:
- React component re-rendering caused multiple widget initializations
- Session ID changes weren't properly propagated to the widget
- Widget cleanup wasn't happening on component unmount

**Solution Implemented**:
- Added proper widget cleanup in useEffect
- Implemented session variable updating mechanism
- Added duplicate widget detection and removal

**What I Would Do Differently**:
- Implement widget as a singleton service
- Use React context for session management
- Add comprehensive widget lifecycle logging

## API and Network Issues

### Problem 7: N8N Connection Failures

**What Happened**: Consistent connection failures to N8N automation service.

**Root Cause**:
- N8N service not running locally during development
- Default localhost URL configuration doesn't work in all environments
- No graceful degradation when automation service unavailable

**Current Status**: Connection attempts continue to fail, but system degrades gracefully.

**What I Would Do Differently**:
- Make N8N integration optional with feature flags
- Implement connection retry logic with exponential backoff
- Add mock automation service for development

## Frontend Issues

### Problem 8: Component State Management

**What Happened**: Chat components sometimes showed stale data or lost state.

**Root Cause**:
- React Query cache invalidation timing issues
- Multiple components requesting same data simultaneously
- State updates happening after component unmount

**Solution Implemented**:
- Proper cache invalidation after mutations
- Added loading states and error boundaries
- Implemented proper cleanup in useEffect hooks

## Performance Issues

### Problem 9: File Processing Memory Usage

**What Happened**: Large file uploads caused memory spikes during image processing.

**Root Cause**:
- Reading entire files into memory for base64 encoding
- No streaming for large file processing
- Files not immediately cleaned up after processing

**Solution Implemented**:
- Added 10MB file size limit
- Immediate file cleanup after processing
- Asynchronous file operations

**What I Would Do Differently**:
- Implement streaming file processing
- Use cloud storage for file handling
- Add memory usage monitoring

## General Development Issues

### Problem 10: Error Handling and Logging

**What Happened**: Difficult to debug issues due to insufficient logging.

**Root Cause**:
- Inconsistent error handling patterns
- Missing structured logging
- No centralized error tracking

**Solution Implemented**:
- Added comprehensive console logging throughout
- Implemented error boundaries in React
- Added request/response logging for API endpoints

**What I Would Do Differently**:
- Implement structured logging from the start (Winston/Pino)
- Add error tracking service (Sentry)
- Create standardized error handling middleware
- Implement health check endpoints

## Lessons Learned

### What Worked Well
1. **Modular Architecture**: Clear separation of concerns made debugging easier
2. **TypeScript**: Caught many issues at compile time
3. **React Query**: Simplified state management and caching
4. **shadcn/ui**: Consistent UI components reduced styling issues

### What Could Be Improved
1. **Testing**: No automated tests made regression detection difficult
2. **Error Handling**: Inconsistent error handling patterns
3. **Documentation**: Should document decisions as they're made
4. **Validation**: Runtime validation needed throughout the stack

### Bigger Picture Recommendations

1. **Add Comprehensive Testing**
   - Unit tests for business logic
   - Integration tests for API endpoints
   - E2E tests for critical user flows

2. **Implement Proper CI/CD**
   - Automated testing on commits
   - Type checking in CI
   - Deployment automation

3. **Improve Error Handling**
   - Centralized error handling service
   - User-friendly error messages
   - Error recovery mechanisms

4. **Add Monitoring and Observability**
   - Application performance monitoring
   - Error tracking and alerting
   - User analytics and feedback

5. **Enhance Security**
   - Input validation throughout
   - Rate limiting on APIs
   - File upload security scanning

This troubleshooting guide should help future developers quickly identify and resolve common issues in the Emergent Intelligence platform.