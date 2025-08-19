import { Request, Response, Router } from "express";
import multer from "multer";
import { readFileSync, unlinkSync } from "fs";
import { extname } from "path";
import { KnowledgeBaseManager } from "./knowledge-base-manager";
import { fileTypeFromBuffer } from "file-type";

// Dynamic imports to handle potential PDF parsing issues
let pdfParse: any;
let mammoth: any;

// Safely import PDF and DOCX parsers
const initializeParsers = async () => {
  try {
    pdfParse = (await import("pdf-parse")).default;
  } catch (error) {
    console.warn("[File Upload] PDF parsing not available:", error);
  }
  
  try {
    mammoth = await import("mammoth");
  } catch (error) {
    console.warn("[File Upload] DOCX parsing not available:", error);
  }
};

const router = Router();
const upload = multer({ dest: 'uploads/' });
const knowledgeManager = new KnowledgeBaseManager();

// Upload and process files
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  // Initialize parsers if not already done
  if (!pdfParse || !mammoth) {
    await initializeParsers();
  }
  try {
    if (!req.file || !req.body.sessionId) {
      return res.status(400).json({ error: 'File and sessionId are required' });
    }

    const { sessionId } = req.body;
    const file = req.file;
    const fileExtension = extname(file.originalname).toLowerCase();
    
    console.log(`[Knowledge Base Upload] Processing file: ${file.originalname}, type: ${fileExtension}`);

    let content = '';
    let title = file.originalname.replace(/\.[^/.]+$/, ""); // Remove extension
    let type: 'document' | 'code' | 'file' = 'document';

    try {
      // Read file content based on type
      const fileBuffer = readFileSync(file.path);
      
      if (fileExtension === '.pdf' && pdfParse) {
        try {
          const pdfData = await pdfParse(fileBuffer);
          content = pdfData.text;
          type = 'document';
        } catch (pdfError) {
          console.warn(`[File Upload] PDF parsing failed for ${file.originalname}:`, pdfError);
          content = `[PDF content could not be extracted] - File: ${file.originalname}`;
          type = 'file';
        }
      } else if (fileExtension === '.docx' && mammoth) {
        try {
          const docxResult = await mammoth.extractRawText({ buffer: fileBuffer });
          content = docxResult.value;
          type = 'document';
        } catch (docxError) {
          console.warn(`[File Upload] DOCX parsing failed for ${file.originalname}:`, docxError);
          content = `[DOCX content could not be extracted] - File: ${file.originalname}`;
          type = 'file';
        }
      } else if (['.txt', '.md', '.markdown'].includes(fileExtension)) {
        content = fileBuffer.toString('utf-8');
        type = 'document';
      } else if (['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.html', '.css', '.sql', '.json', '.xml'].includes(fileExtension)) {
        content = fileBuffer.toString('utf-8');
        type = 'code';
      } else {
        // Try to detect if it's a text file
        const detectedType = await fileTypeFromBuffer(fileBuffer);
        if (!detectedType || detectedType.mime.startsWith('text/')) {
          content = fileBuffer.toString('utf-8');
          type = 'file';
        } else {
          throw new Error(`Unsupported file type: ${fileExtension}`);
        }
      }

      // Create knowledge base entry
      const entry = await knowledgeManager.addEntry({
        title,
        content,
        type,
        sessionId,
        metadata: {
          tags: [fileExtension.substring(1), 'uploaded'],
          category: type === 'code' ? 'Development' : 'Documents',
          source: 'file_upload',
          fileName: file.originalname,
          fileSize: file.size,
          uploadedAt: new Date().toISOString()
        }
      });

      // Clean up uploaded file
      unlinkSync(file.path);

      console.log(`[Knowledge Base Upload] Successfully processed: ${file.originalname} -> Entry ID: ${entry.id}`);
      
      res.json({
        id: entry.id,
        title: entry.title,
        type: entry.type,
        contentLength: content.length,
        message: `File "${file.originalname}" successfully added to knowledge base`
      });

    } catch (contentError) {
      console.error(`[Knowledge Base Upload] Content processing error:`, contentError);
      // Clean up uploaded file
      unlinkSync(file.path);
      
      return res.status(400).json({ 
        error: `Failed to process file content: ${contentError instanceof Error ? contentError.message : 'Unknown error'}` 
      });
    }

  } catch (error) {
    console.error('[Knowledge Base Upload] Upload error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file) {
      try {
        unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }
    
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to upload file' 
    });
  }
});

// Search knowledge base
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { sessionId, query, type } = req.query;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const results = await knowledgeManager.search(
      sessionId as string,
      query as string || '',
      type as string || 'all'
    );

    res.json({
      results,
      total: results.length
    });
  } catch (error) {
    console.error('[Knowledge Base Search] Error:', error);
    res.status(500).json({ error: 'Failed to search knowledge base' });
  }
});

// Get statistics
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.query;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const stats = await knowledgeManager.getStatistics(sessionId as string);
    res.json(stats);
  } catch (error) {
    console.error('[Knowledge Base Statistics] Error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Add entry manually
router.post('/entries', async (req: Request, res: Response) => {
  try {
    const entry = await knowledgeManager.addEntry(req.body);
    res.json(entry);
  } catch (error) {
    console.error('[Knowledge Base Add Entry] Error:', error);
    res.status(500).json({ error: 'Failed to add entry' });
  }
});

// Export knowledge base
router.post('/export', async (req: Request, res: Response) => {
  try {
    const { sessionId, description } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const exportResult = await knowledgeManager.exportToZip(sessionId, description);
    res.json(exportResult);
  } catch (error) {
    console.error('[Knowledge Base Export] Error:', error);
    res.status(500).json({ error: 'Failed to export knowledge base' });
  }
});

// Get available exports
router.get('/exports', async (req: Request, res: Response) => {
  try {
    const exports = await knowledgeManager.getAvailableExports();
    res.json({ exports });
  } catch (error) {
    console.error('[Knowledge Base Exports] Error:', error);
    res.status(500).json({ error: 'Failed to get exports' });
  }
});

// Export individual entry
router.post('/export-entry', async (req: Request, res: Response) => {
  try {
    const { entryId, sessionId, format = 'markdown' } = req.body;
    
    if (!entryId || !sessionId) {
      return res.status(400).json({ error: 'entryId and sessionId are required' });
    }

    // Get the entry from the knowledge base
    const searchResults = await knowledgeManager.search(sessionId, '', '', 1000);
    const entry = searchResults.results.find((e: any) => e.id === entryId);
    
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // Generate markdown content
    const markdownContent = `# ${entry.title}

**Type:** ${entry.type}  
**Category:** ${entry.metadata.category}  
**Created:** ${new Date(entry.createdAt).toLocaleString()}  
**Updated:** ${new Date(entry.updatedAt).toLocaleString()}  
${entry.metadata.tags.length > 0 ? `**Tags:** ${entry.metadata.tags.join(', ')}  ` : ''}

---

${entry.content}

---

*Generated from Emergent Intelligence Knowledge Base*
`;

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${entry.title.replace(/[^a-zA-Z0-9]/g, '_')}.md"`);
    res.send(markdownContent);

  } catch (error) {
    console.error('[Knowledge Base Export Entry] Error:', error);
    res.status(500).json({ error: 'Failed to export entry' });
  }
});

export default router;