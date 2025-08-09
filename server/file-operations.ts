// Excel and CSV file manipulation with voice integration
import * as XLSX from 'xlsx';
import csvParser from 'csv-parser';
import * as csvWriter from 'csv-writer';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { voiceService } from './elevenlabs-sdk';

export interface FileOperationResult {
  success: boolean;
  message: string;
  data?: any;
  audioResponse?: ArrayBuffer;
  filePath?: string;
}

export class FileOperationsService {

  // Excel Operations
  async readExcelFile(filePath: string, sheetName?: string): Promise<FileOperationResult> {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheet = sheetName || workbook.SheetNames[0];
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheet]);
      
      const audioResponse = await voiceService.generateFileOperationResponse(
        'read Excel file',
        path.basename(filePath),
        true
      );

      return {
        success: true,
        message: `Successfully read ${data.length} rows from Excel file`,
        data: data,
        audioResponse,
        filePath
      };
    } catch (error) {
      const audioResponse = await voiceService.generateFileOperationResponse(
        'read Excel file',
        path.basename(filePath),
        false
      );

      return {
        success: false,
        message: `Failed to read Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        audioResponse,
        filePath
      };
    }
  }

  async writeExcelFile(data: any[], filePath: string, sheetName: string = 'Sheet1'): Promise<FileOperationResult> {
    try {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      
      // Ensure uploads directory exists
      const uploadsDir = path.dirname(filePath);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      XLSX.writeFile(workbook, filePath);

      const audioResponse = await voiceService.generateFileOperationResponse(
        'create Excel file',
        path.basename(filePath),
        true
      );

      return {
        success: true,
        message: `Successfully created Excel file with ${data.length} rows`,
        data: { rowCount: data.length, sheetName },
        audioResponse,
        filePath
      };
    } catch (error) {
      const audioResponse = await voiceService.generateFileOperationResponse(
        'create Excel file',
        path.basename(filePath),
        false
      );

      return {
        success: false,
        message: `Failed to create Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        audioResponse,
        filePath
      };
    }
  }

  async updateExcelFile(filePath: string, updates: any[], keyColumn: string): Promise<FileOperationResult> {
    try {
      // Read existing data
      const readResult = await this.readExcelFile(filePath);
      if (!readResult.success || !readResult.data) {
        return readResult;
      }

      let existingData = readResult.data as any[];
      let updatedCount = 0;

      // Apply updates
      for (const update of updates) {
        const index = existingData.findIndex(row => row[keyColumn] === update[keyColumn]);
        if (index !== -1) {
          existingData[index] = { ...existingData[index], ...update };
          updatedCount++;
        } else {
          existingData.push(update);
          updatedCount++;
        }
      }

      // Write back to file
      const writeResult = await this.writeExcelFile(existingData, filePath);
      if (writeResult.success) {
        writeResult.message = `Successfully updated ${updatedCount} rows in Excel file`;
        writeResult.data = { ...writeResult.data, updatedCount };
      }

      return writeResult;
    } catch (error) {
      const audioResponse = await voiceService.generateFileOperationResponse(
        'update Excel file',
        path.basename(filePath),
        false
      );

      return {
        success: false,
        message: `Failed to update Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        audioResponse,
        filePath
      };
    }
  }

  // CSV Operations
  async readCSVFile(filePath: string): Promise<FileOperationResult> {
    try {
      const data: any[] = [];
      
      return new Promise((resolve) => {
        fs.createReadStream(filePath)
          .pipe(csvParser())
          .on('data', (row) => data.push(row))
          .on('end', async () => {
            const audioResponse = await voiceService.generateFileOperationResponse(
              'read CSV file',
              path.basename(filePath),
              true
            );

            resolve({
              success: true,
              message: `Successfully read ${data.length} rows from CSV file`,
              data: data,
              audioResponse,
              filePath
            });
          })
          .on('error', async (error) => {
            const audioResponse = await voiceService.generateFileOperationResponse(
              'read CSV file',
              path.basename(filePath),
              false
            );

            resolve({
              success: false,
              message: `Failed to read CSV file: ${error.message}`,
              audioResponse,
              filePath
            });
          });
      });
    } catch (error) {
      const audioResponse = await voiceService.generateFileOperationResponse(
        'read CSV file',
        path.basename(filePath),
        false
      );

      return {
        success: false,
        message: `Failed to read CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        audioResponse,
        filePath
      };
    }
  }

  async writeCSVFile(data: any[], filePath: string): Promise<FileOperationResult> {
    try {
      if (!data.length) {
        throw new Error('No data provided');
      }

      // Ensure uploads directory exists
      const uploadsDir = path.dirname(filePath);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const headers = Object.keys(data[0]).map(key => ({ id: key, title: key }));
      const writer = csvWriter.createObjectCsvWriter({
        path: filePath,
        header: headers
      });

      await writer.writeRecords(data);

      const audioResponse = await voiceService.generateFileOperationResponse(
        'create CSV file',
        path.basename(filePath),
        true
      );

      return {
        success: true,
        message: `Successfully created CSV file with ${data.length} rows`,
        data: { rowCount: data.length, columns: headers.length },
        audioResponse,
        filePath
      };
    } catch (error) {
      const audioResponse = await voiceService.generateFileOperationResponse(
        'create CSV file',
        path.basename(filePath),
        false
      );

      return {
        success: false,
        message: `Failed to create CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        audioResponse,
        filePath
      };
    }
  }

  // Task-oriented file operations with voice feedback
  async createTaskReport(tasks: any[], format: 'excel' | 'csv' = 'excel'): Promise<FileOperationResult> {
    const filename = `task-report-${Date.now()}.${format === 'excel' ? 'xlsx' : 'csv'}`;
    const filePath = path.join('uploads', filename);

    const reportData = tasks.map(task => ({
      'Task ID': task.id,
      'Title': task.title,
      'Status': task.status,
      'Context': task.context,
      'Time Window': task.timeWindow,
      'Created': task.createdAt?.toLocaleDateString?.() || 'N/A',
      'Updated': task.updatedAt?.toLocaleDateString?.() || 'N/A'
    }));

    if (format === 'excel') {
      return this.writeExcelFile(reportData, filePath, 'Task Report');
    } else {
      return this.writeCSVFile(reportData, filePath);
    }
  }

  async createStepsReport(steps: any[], format: 'excel' | 'csv' = 'excel'): Promise<FileOperationResult> {
    const filename = `steps-report-${Date.now()}.${format === 'excel' ? 'xlsx' : 'csv'}`;
    const filePath = path.join('uploads', filename);

    const reportData = steps.map(step => ({
      'Step ID': step.id,
      'Task ID': step.taskId,
      'Title': step.title,
      'Status': step.status,
      'Context': step.context,
      'Can Auto': step.canAuto,
      'Tool Hint': step.toolHint || 'N/A',
      'Created': step.createdAt?.toLocaleDateString?.() || 'N/A'
    }));

    if (format === 'excel') {
      return this.writeExcelFile(reportData, filePath, 'Steps Report');
    } else {
      return this.writeCSVFile(reportData, filePath);
    }
  }

  // Import tasks from Excel/CSV file
  async importTasksFromFile(filePath: string): Promise<FileOperationResult> {
    try {
      let data: any[];
      
      if (path.extname(filePath).toLowerCase() === '.xlsx') {
        const result = await this.readExcelFile(filePath);
        if (!result.success) return result;
        data = result.data;
      } else {
        const result = await this.readCSVFile(filePath);
        if (!result.success) return result;
        data = result.data;
      }

      // Validate required columns
      const requiredColumns = ['title'];
      const columns = Object.keys(data[0] || {});
      const missingColumns = requiredColumns.filter(col => !columns.includes(col));
      
      if (missingColumns.length) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
      }

      const importedTasks = data.map(row => ({
        id: randomUUID(),
        title: row.title,
        status: row.status || 'backlog',
        context: row.context || 'computer',
        timeWindow: row.timeWindow || 'any',
        description: row.description || null
      }));

      const audioResponse = await voiceService.generateFileOperationResponse(
        'import tasks',
        path.basename(filePath),
        true
      );

      return {
        success: true,
        message: `Successfully imported ${importedTasks.length} tasks from file`,
        data: importedTasks,
        audioResponse,
        filePath
      };
    } catch (error) {
      const audioResponse = await voiceService.generateFileOperationResponse(
        'import tasks',
        path.basename(filePath),
        false
      );

      return {
        success: false,
        message: `Failed to import tasks: ${error instanceof Error ? error.message : 'Unknown error'}`,
        audioResponse,
        filePath
      };
    }
  }
}

export const fileOperationsService = new FileOperationsService();