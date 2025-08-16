#!/usr/bin/env node

// Migration script to move all data from old session to current session
import fs from 'fs';
import path from 'path';

const OLD_SESSION_ID = 's_njlk7hja5y9';
const NEW_SESSION_ID = 's_y439m78bw1';

console.log(`[Migration] Starting migration from ${OLD_SESSION_ID} to ${NEW_SESSION_ID}`);

try {
  // Read the storage file
  const storageFile = 'data/storage.json';
  const data = JSON.parse(fs.readFileSync(storageFile, 'utf8'));
  
  let migratedCount = {
    tasks: 0,
    conversations: 0,
    memories: 0,
    projects: 0,
    researchDocs: 0,
    calendarEvents: 0,
    projectFiles: 0,
    blogPosts: 0,
    steps: 0,
    diaryEntries: 0
  };

  // Migrate tasks
  if (data.tasks) {
    data.tasks = data.tasks.map(([id, task]) => {
      if (task.sessionId === OLD_SESSION_ID) {
        task.sessionId = NEW_SESSION_ID;
        migratedCount.tasks++;
      }
      return [id, task];
    });
  }

  // Migrate conversations
  if (data.conversations) {
    data.conversations = data.conversations.map(([id, conversation]) => {
      if (conversation.sessionId === OLD_SESSION_ID) {
        conversation.sessionId = NEW_SESSION_ID;
        migratedCount.conversations++;
      }
      return [id, conversation];
    });
  }

  // Migrate memories
  if (data.memories) {
    data.memories = data.memories.map(([id, memory]) => {
      if (memory.sessionId === OLD_SESSION_ID) {
        memory.sessionId = NEW_SESSION_ID;
        migratedCount.memories++;
      }
      return [id, memory];
    });
  }

  // Migrate projects
  if (data.projects) {
    data.projects = data.projects.map(([id, project]) => {
      if (project.sessionId === OLD_SESSION_ID) {
        project.sessionId = NEW_SESSION_ID;
        migratedCount.projects++;
      }
      return [id, project];
    });
  }

  // Migrate research docs
  if (data.researchDocs) {
    data.researchDocs = data.researchDocs.map(([id, doc]) => {
      if (doc.sessionId === OLD_SESSION_ID) {
        doc.sessionId = NEW_SESSION_ID;
        migratedCount.researchDocs++;
      }
      return [id, doc];
    });
  }

  // Migrate calendar events
  if (data.calendarEvents) {
    data.calendarEvents = data.calendarEvents.map(([id, event]) => {
      if (event.sessionId === OLD_SESSION_ID) {
        event.sessionId = NEW_SESSION_ID;
        migratedCount.calendarEvents++;
      }
      return [id, event];
    });
  }

  // Migrate project files
  if (data.projectFiles) {
    data.projectFiles = data.projectFiles.map(([id, file]) => {
      if (file.sessionId === OLD_SESSION_ID) {
        file.sessionId = NEW_SESSION_ID;
        migratedCount.projectFiles++;
      }
      return [id, file];
    });
  }

  // Migrate blog posts
  if (data.blogPosts) {
    data.blogPosts = data.blogPosts.map(([id, post]) => {
      if (post.sessionId === OLD_SESSION_ID) {
        post.sessionId = NEW_SESSION_ID;
        migratedCount.blogPosts++;
      }
      return [id, post];
    });
  }

  // Migrate steps
  if (data.steps) {
    data.steps = data.steps.map(([id, step]) => {
      if (step.sessionId === OLD_SESSION_ID) {
        step.sessionId = NEW_SESSION_ID;
        migratedCount.steps++;
      }
      return [id, step];
    });
  }

  // Migrate diary entries
  if (data.diaryEntries) {
    data.diaryEntries = data.diaryEntries.map(([id, entry]) => {
      if (entry.sessionId === OLD_SESSION_ID) {
        entry.sessionId = NEW_SESSION_ID;
        migratedCount.diaryEntries++;
      }
      return [id, entry];
    });
  }

  // Write the updated data back to the file
  fs.writeFileSync(storageFile, JSON.stringify(data, null, 2));

  console.log('[Migration] Completed successfully!');
  console.log('[Migration] Migrated items:');
  Object.entries(migratedCount).forEach(([type, count]) => {
    if (count > 0) {
      console.log(`  - ${type}: ${count}`);
    }
  });

  const totalMigrated = Object.values(migratedCount).reduce((sum, count) => sum + count, 0);
  console.log(`[Migration] Total items migrated: ${totalMigrated}`);

} catch (error) {
  console.error('[Migration] Failed:', error);
  process.exit(1);
}